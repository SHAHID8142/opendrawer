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
}

export const DPI_CHOICES = [72, 150, 300];

/** A4 at 300 DPI is about 8.7 megapixels; 40 MP is roughly a 600 DPI A4 page. */
export const MAX_PIXELS_PER_PAGE = 40_000_000;
export const MAX_PAGES = 200;

export function parsePageRange(spec: string, pageCount: number): number[] {
  const trimmed = spec.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'all') {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages: number[] = [];
  const seen = new Set<number>();

  for (const part of trimmed.split(',')) {
    const piece = part.trim();
    if (piece === '') continue;

    const range = /^(\d+)\s*-\s*(\d+)$/.exec(piece);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
        throw new Error(
          `The range "${piece}" is outside this document: it has ${pageCount} page${pageCount === 1 ? '' : 's'}, numbered 1 to ${pageCount}.`,
        );
      }
      if (start > end) {
        throw new Error(`The range "${piece}" counts backwards. Write it as ${end}-${start}.`);
      }
      for (let page = start; page <= end; page += 1) {
        if (!seen.has(page)) {
          seen.add(page);
          pages.push(page);
        }
      }
      continue;
    }

    if (/^\d+$/.test(piece)) {
      const page = Number(piece);
      if (page < 1 || page > pageCount) {
        throw new Error(
          `Page ${page} does not exist: this document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`,
        );
      }
      if (!seen.has(page)) {
        seen.add(page);
        pages.push(page);
      }
      continue;
    }

    throw new Error(
      `"${piece}" is not a page or a range. Use numbers and ranges separated by commas, such as 1-3, 7, 10-12.`,
    );
  }

  if (pages.length === 0) {
    throw new Error('No pages were selected. Leave the field empty to render every page.');
  }

  return pages;
}

function canvasToBytes(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality: number,
): Promise<Uint8Array> {
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

function baseName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.pdf$/i, '');
  const safe = withoutExtension.replace(/[^\w.\- ]+/g, '_').slice(0, 60).trim();
  return safe === '' ? 'document' : safe;
}

export async function renderPdfToImages(
  file: File,
  options: RenderOptions,
  onProgress: (done: number, total: number) => void,
): Promise<RenderSummary> {
  // Loaded on demand: PDF.js is about a megabyte, and only this tool needs it.
  const pdfjs = await import('pdfjs-dist');
  const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

  const data = new Uint8Array(await file.arrayBuffer());
  const loading = pdfjs.getDocument({
    data,
    useSystemFonts: false,
  });

  let pdfDocument;
  try {
    pdfDocument = await loading.promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/password/i.test(message)) {
      throw new Error(
        'This PDF is password protected. Render it after removing the password, or use a viewer that can open it.',
      );
    }
    throw new Error(`This file could not be opened as a PDF (${message}).`);
  }

  try {
    const pages = parsePageRange(options.range, pdfDocument.numPages);
    if (pages.length > MAX_PAGES) {
      throw new Error(
        `That is ${pages.length} pages. This tool stops at ${MAX_PAGES} pages at once, because the tab would run out of memory. Split the document first.`,
      );
    }

    const scale = options.dpi / 72;
    const extension = options.format === 'png' ? 'png' : 'jpg';
    const files: RenderedFile[] = [];
    const name = baseName(file.name);

    for (const [index, pageNumber] of pages.entries()) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const pixels = Math.round(viewport.width * viewport.height);

      if (pixels > MAX_PIXELS_PER_PAGE) {
        throw new Error(
          `Page ${pageNumber} would be ${(pixels / 1_000_000).toFixed(1)} megapixels at ${options.dpi} DPI, which is above the ${MAX_PIXELS_PER_PAGE / 1_000_000} megapixel ceiling. Try a lower DPI.`,
        );
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('This browser did not provide a drawing surface for the page.');
      }

      // JPEG has no transparency, so paint the page white first instead of letting it go black.
      if (options.format === 'jpeg') {
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const bytes = await canvasToBytes(canvas, options.format, options.format === 'jpeg' ? 0.92 : 1);

      files.push({
        name: `${name}-page-${String(pageNumber).padStart(3, '0')}.${extension}`,
        bytes,
      });

      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      onProgress(index + 1, pages.length);
    }

    return { files, pageCount: pages.length };
  } finally {
    await loading.destroy();
  }
}
