// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser-side OCR: render each chosen page with PDF.js, then read it with a self-hosted
// Tesseract worker. Nothing is uploaded; the worker and language data are same-origin assets.

import { MAX_PAGES, OCR_DPI, isUsableOcrText, type OcrPage } from './engine';

/** Set by the logger so progress reports the page currently being recognised. */
let currentPage = 1;

interface OcrWorker {
  recognize: (input: HTMLCanvasElement) => Promise<{ data: { text?: string } }>;
  terminate: () => Promise<unknown>;
}

export interface OcrProgress {
  page: number;
  total: number;
  percent: number;
}

export type OcrErrorCode =
  | 'EMPTY'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'TOO_MANY_PAGES'
  | 'NO_TEXT'
  | 'WORKER_FAILED'
  | 'FAILED';

export type OcrResult =
  | { ok: true; text: string; pages: OcrPage[]; unusablePages: number[] }
  | { ok: false; code: OcrErrorCode; message: string };

function failure(code: OcrErrorCode, message: string): OcrResult {
  return { ok: false, code, message };
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new DOMException('OCR was cancelled.', 'AbortError');
}

export async function ocrPdf(
  fileName: string,
  bytes: Uint8Array,
  pages: number[],
  onProgress: (progress: OcrProgress) => void,
  signal?: AbortSignal,
): Promise<OcrResult> {
  if (pages.length === 0) {
    return failure('EMPTY', 'Select at least one page to read.');
  }
  if (pages.length > MAX_PAGES) {
    return failure(
      'TOO_MANY_PAGES',
      `That is ${pages.length} pages. OCR stops at ${MAX_PAGES} pages at once. Split the document first.`,
    );
  }

  let pdfjs;
  let createWorker;
  try {
    pdfjs = await import('pdfjs-dist');
    const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
    ({ createWorker } = await import('tesseract.js'));
  } catch {
    return failure(
      'WORKER_FAILED',
      'The OCR engine could not be loaded. The first run downloads about 18 MB from this site; check your connection, reload, and try again.',
    );
  }

  const loading = pdfjs.getDocument({ data: bytes, useSystemFonts: false });
  let document;
  try {
    document = await loading.promise;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${fileName}" is password protected. Remove the password first, then read it.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${fileName}" could not be opened. The file may be damaged or incomplete.`,
    );
  }

  let worker: OcrWorker | null = null;
  try {
    throwIfAborted(signal);
    for (const pageNumber of pages) {
      if (pageNumber < 1 || pageNumber > document.numPages) {
        return failure(
          'FAILED',
          `Page ${pageNumber} does not exist: this document has ${document.numPages} page${document.numPages === 1 ? '' : 's'}.`,
        );
      }
    }

    try {
      worker = (await createWorker('eng', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/core',
        langPath: '/ocr/lang',
        cacheMethod: 'none',
        workerBlobURL: false,
        gzip: true,
        logger: (message: { status: string; progress: number }) => {
          if (message.status === 'recognizing text') {
            onProgress({
              page: currentPage,
              total: pages.length,
              percent: Math.round(message.progress * 100),
            });
          }
        },
      })) as unknown as OcrWorker;
    } catch {
      return failure(
        'WORKER_FAILED',
        'The OCR engine started but could not prepare the English language data. Reload the page and try again.',
      );
    }

    const results: OcrPage[] = [];
    const unusablePages: number[] = [];
    for (const [index, pageNumber] of pages.entries()) {
      throwIfAborted(signal);
      currentPage = index + 1;
      onProgress({ page: currentPage, total: pages.length, percent: 0 });

      const page = await document.getPage(pageNumber);
      const canvas = window.document.createElement('canvas');
      try {
        const viewport = page.getViewport({ scale: OCR_DPI / 72 });
        const pixels = Math.round(viewport.width * viewport.height);
        if (pixels > 40_000_000) {
          return failure(
            'FAILED',
            `Page ${pageNumber} is too large to read at ${OCR_DPI} DPI. Split the document or use a smaller page.`,
          );
        }
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) return failure('FAILED', 'This browser did not provide a drawing surface.');
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        throwIfAborted(signal);

        const recognition = await worker.recognize(canvas);
        const text = recognition.data.text ?? '';
        if (!isUsableOcrText(text)) unusablePages.push(pageNumber);
        results.push({ pageNumber, text });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }

    if (results.every((entry) => !isUsableOcrText(entry.text))) {
      return failure(
        'NO_TEXT',
        'Nothing legible was found. Try a sharper scan, a higher-contrast copy, or a page with less handwriting.',
      );
    }

    return {
      ok: true,
      text: results.map((entry) => entry.text).join('\n\n'),
      pages: results,
      unusablePages,
    };
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    return failure(
      'FAILED',
      'Reading the pages stopped unexpectedly. Try fewer pages, or reload and run it again.',
    );
  } finally {
    if (worker) await worker.terminate().catch(() => undefined);
    await loading.destroy();
  }
}
