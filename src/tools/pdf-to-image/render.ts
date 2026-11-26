// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure PDF-to-image rendering engine with range validation and abort support.
import { parsePageSelection, validatePageRangeSyntax } from '../../lib/page-range';

export { validatePageRangeSyntax };
export type ImageFormat = 'png' | 'jpeg';

export interface RenderOptions {
  format: ImageFormat;
  dpi: number;
  range: string;
}

export interface RenderedFile {
  name: string;
  bytes: Uint8Array;
}

export interface RenderSummary {
  files: RenderedFile[];
  pageCount: number;
  format: ImageFormat;
  dpi: number;
  totalBytes: number;
  baseName: string;
}

export const DPI_CHOICES = [72, 150, 300];
/** A4 at 300 DPI is about 8.7 megapixels; 40 MP is roughly a 600 DPI A4 page. */
export const MAX_PIXELS_PER_PAGE = 40_000_000;
export const MAX_PAGES = 200;

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Rendering was cancelled.', 'AbortError');
}

function canvasToBytes(canvas: HTMLCanvasElement, format: ImageFormat, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('The browser could not encode this page as an image.'));
          return;
        }
        blob
          .arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)))
          .catch(() => reject(new Error('The rendered image could not be read back.')));
      },
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality,
    );
  });
}

function safeBaseName(fileName: string): string {
  const safe = fileName.replace(/\.pdf$/i, '').replace(/[^\w.\- ]+/g, '_').slice(0, 60).trim();
  return safe === '' ? 'document' : safe;
}

export async function renderPdfToImages(
  file: File,
  options: RenderOptions,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<RenderSummary> {
  throwIfAborted(signal);
  // Loaded on demand: PDF.js is about a megabyte, and only this tool needs it.
  const pdfjs = await import('pdfjs-dist');
  const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

  const data = new Uint8Array(await file.arrayBuffer());
  throwIfAborted(signal);

  const loading = pdfjs.getDocument({ data, useSystemFonts: false });
  const abortHandler = () => void loading.destroy();
  signal?.addEventListener('abort', abortHandler, { once: true });

  let pdfDocument;
  try {
    pdfDocument = await loading.promise;
  } catch (error) {
    throwIfAborted(signal);
    const message = error instanceof Error ? error.message : String(error);
    if (/password/i.test(message)) {
      throw new Error('This PDF is password protected. Render it after removing the password, or use a viewer that can open it.');
    }
    throw new Error('This file could not be opened as a PDF. Check that it is a valid, unencrypted PDF and try again.');
  }

  try {
    throwIfAborted(signal);
    const pages = parsePageSelection(options.range, pdfDocument.numPages);
    if (pages.length > MAX_PAGES) {
      throw new Error(
        `That is ${pages.length} pages. This tool stops at ${MAX_PAGES} pages at once, because the tab would run out of memory. Split the document first.`,
      );
    }

    onProgress(0, pages.length);
    const scale = options.dpi / 72;
    const extension = options.format === 'png' ? 'png' : 'jpg';
    const files: RenderedFile[] = [];
    const baseName = safeBaseName(file.name);
    let totalBytes = 0;

    for (const [index, pageNumber] of pages.entries()) {
      throwIfAborted(signal);
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const pixels = Math.round(viewport.width * viewport.height);
      if (pixels > MAX_PIXELS_PER_PAGE) {
        page.cleanup();
        throw new Error(
          `Page ${pageNumber} would be ${(pixels / 1_000_000).toFixed(1)} megapixels at ${options.dpi} DPI, which is above the ${MAX_PIXELS_PER_PAGE / 1_000_000} megapixel ceiling. Try a lower DPI.`,
        );
      }

      const canvas = document.createElement('canvas');
      try {
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('This browser did not provide a drawing surface for the page.');
        // JPEG has no transparency, so paint the page white first instead of letting it go black.
        if (options.format === 'jpeg') {
          context.fillStyle = 'white';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        throwIfAborted(signal);
        const bytes = await canvasToBytes(canvas, options.format, options.format === 'jpeg' ? 0.92 : 1);
        files.push({ name: `${baseName}-page-${String(pageNumber).padStart(3, '0')}.${extension}`, bytes });
        totalBytes += bytes.length;
        onProgress(index + 1, pages.length);
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }

    return { files, pageCount: pages.length, format: options.format, dpi: options.dpi, totalBytes, baseName };
  } finally {
    signal?.removeEventListener('abort', abortHandler);
    await loading.destroy();
  }
}
