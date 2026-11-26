// SPDX-License-Identifier: AGPL-3.0-or-later
// Promise wrapper around the qpdf worker; every call is one file in, one file out.

export type QpdfOutcome =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; message: string };

type Reply =
  | { id: number; ok: true; bytes: ArrayBuffer }
  | { id: number; ok: false; message: string };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (outcome: QpdfOutcome) => void; timer: ReturnType<typeof setTimeout> }
>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./qpdf-worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<Reply>) => {
    const reply = event.data;
    const entry = pending.get(reply.id);
    if (!entry) return;
    pending.delete(reply.id);
    clearTimeout(entry.timer);
    entry.resolve(
      reply.ok ? { ok: true, bytes: new Uint8Array(reply.bytes) } : { ok: false, message: reply.message },
    );
  };
  worker.onerror = () => {
    for (const [id, entry] of pending) {
      clearTimeout(entry.timer);
      entry.resolve({ ok: false, message: 'The PDF engine stopped unexpectedly. Reload and try again.' });
      pending.delete(id);
    }
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** Run one qpdf command; the caller supplies the arguments between input and output. */
export function runQpdf(input: Uint8Array, args: string[], timeoutMs = 120_000): Promise<QpdfOutcome> {
  const id = nextId++;
  const copy = new Uint8Array(input.length);
  copy.set(input);
  return new Promise<QpdfOutcome>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      worker?.terminate();
      worker = null;
      resolve({ ok: false, message: 'The PDF engine took too long. Try a smaller file.' });
    }, timeoutMs);
    pending.set(id, { resolve, timer });
    getWorker().postMessage({ id, input: copy.buffer, args }, [copy.buffer]);
  });
}
