// SPDX-License-Identifier: AGPL-3.0-or-later
// Runs the qpdf CLI inside a module worker so a large file cannot freeze the page.
import createModule from '@neslinesli93/qpdf-wasm';
import type { QpdfInstance } from '@neslinesli93/qpdf-wasm';
import wasmUrl from '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url';

interface Request {
  id: number;
  input: ArrayBuffer;
  args: string[];
}

type Reply =
  | { id: number; ok: true; bytes: ArrayBuffer }
  | { id: number; ok: false; message: string };

let modulePromise: Promise<QpdfInstance> | null = null;
let lastError = '';

// qpdf's Emscripten build reports failures through console.error, not the printErr hook.
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  lastError = args.map((value) => String(value)).join(' ');
  originalConsoleError(...args);
};

/** Turn "this.program: /in-123.pdf: invalid password" into "invalid password". */
function cleanError(text: string): string {
  return text
    .replace(/^this\.program:\s*\S+:\s*/i, '')
    .replace(/^qpdf:\s*/i, '')
    .replace(/\.$/, '')
    .trim();
}

/** One instance keeps the 1.3 MB WASM module warm across runs in this tab. */
function getModule(): Promise<QpdfInstance> {
  if (!modulePromise) {
    modulePromise = createModule({
      locateFile: () => wasmUrl,
      noInitialRun: true,
      printErr: (text: string) => {
        lastError = text;
      },
    });
  }
  return modulePromise;
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const { id, input, args } = event.data;
  let inputPath = '';
  let outputPath = '';
  try {
    const qpdf = await getModule();
    const stamp = `${id}-${Date.now()}`;
    inputPath = `/in-${stamp}.pdf`;
    outputPath = `/out-${stamp}.pdf`;
    qpdf.FS.writeFile(inputPath, new Uint8Array(input));
    lastError = '';
    const code = qpdf.callMain([inputPath, ...args, outputPath]);
    if (code !== 0) {
      throw new Error(cleanError(lastError) || `qpdf stopped with code ${code}.`);
    }
    const bytes = qpdf.FS.readFile(outputPath);
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    (self as unknown as { postMessage: (reply: Reply, transfer: Transferable[]) => void }).postMessage(
      { id, ok: true, bytes: copy.buffer },
      [copy.buffer],
    );
  } catch (cause) {
    const details = cleanError(lastError);
    const message =
      cause instanceof Error && cause.name === 'ExitStatus'
        ? details || 'qpdf stopped with an error.'
        : details || (cause instanceof Error ? cause.message : 'qpdf failed.');
    (self as unknown as { postMessage: (reply: Reply) => void }).postMessage({
      id,
      ok: false,
      message,
    });
  } finally {
    const qpdf = await modulePromise?.catch(() => null);
    const fs = qpdf?.FS as unknown as { unlink?: (path: string) => void } | undefined;
    for (const path of [inputPath, outputPath]) {
      if (!path) continue;
      try {
        fs?.unlink?.(path);
      } catch {
        // File may not exist when qpdf failed before writing it.
      }
    }
  }
};
