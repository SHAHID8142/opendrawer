// SPDX-License-Identifier: AGPL-3.0-or-later
// Extracts raster images as they are decoded by PDF.js. Vector art, masks and the original
// embedded file stream are out of scope; each picture is rebuilt as a PNG at its drawn size.

export const MAX_IMAGES = 100;
export const MAX_PIXELS = 40_000_000;

export interface ExtractedImage {
  name: string;
  bytes: Uint8Array;
  page: number;
  width: number;
  height: number;
}

export type ImagesErrorCode = 'ENCRYPTED' | 'CORRUPT' | 'NO_IMAGES' | 'FAILED';

export type ImagesResult =
  | {
      ok: true;
      files: ExtractedImage[];
      pages: number;
      baseName: string;
      skipped: number;
      truncated: boolean;
    }
  | { ok: false; code: ImagesErrorCode; message: string };

export interface ImageProgress {
  page: number;
  total: number;
  found: number;
}

export function safeBaseName(pdfName: string): string {
  const safe = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return safe === '' ? 'document' : safe;
}

export function imageFileName(baseName: string, index: number): string {
  return `${baseName}-image-${String(index).padStart(3, '0')}.png`;
}

export function extractable(width: number, height: number, minimum: number): boolean {
  return width >= minimum && height >= minimum;
}

export function tooManyImages(count: number): string | null {
  if (count <= MAX_IMAGES) return null;
  return `That is ${count} images. This tool stops at ${MAX_IMAGES} images at once. Split the document first.`;
}

function failure(code: ImagesErrorCode, message: string): ImagesResult {
  return { ok: false, code, message };
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Extraction was cancelled.', 'AbortError');
}

type ImageSource = {
  data?: Uint8ClampedArray | Uint8Array;
  width?: number;
  height?: number;
  bitmap?: ImageBitmap | null;
};

/** PDF.js may hand back an ImageBitmap or raw RGBA pixels depending on the image filter. */
function drawSource(source: unknown): HTMLCanvasElement | null {
  if (!source || typeof source !== 'object') return null;
  const record = source as ImageSource;
  const bitmap = record.bitmap;
  if (bitmap && typeof createImageBitmap !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    return canvas;
  }
  if (record.data && record.width && record.height) {
    const canvas = document.createElement('canvas');
    canvas.width = record.width;
    canvas.height = record.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const pixels = new Uint8ClampedArray(record.data);
    context.putImageData(new ImageData(pixels, record.width, record.height), 0, 0);
    return canvas;
  }
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(source, 0, 0);
    return canvas;
  }
  if (source instanceof HTMLCanvasElement || source instanceof HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(source, 0, 0);
    return canvas;
  }
  return null;
}

function encodePng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The browser could not encode this image.'));
        return;
      }
      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch(() => reject(new Error('The image could not be read back.')));
    }, 'image/png');
  });
}

export async function extractImages(
  fileName: string,
  bytes: Uint8Array,
  minimumSize: number,
  onProgress: (progress: ImageProgress) => void,
  signal?: AbortSignal,
): Promise<ImagesResult> {
  throwIfAborted(signal);
  const pdfjs = await import('pdfjs-dist');
  const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

  const loading = pdfjs.getDocument({ data: bytes, useSystemFonts: false });
  let pdfDocument;
  try {
    pdfDocument = await loading.promise;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${fileName}" is password protected. Remove the password first, then extract its images.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${fileName}" could not be opened. The file may be damaged or incomplete.`,
    );
  }

  const baseName = safeBaseName(fileName);
  const files: ExtractedImage[] = [];
  let skipped = 0;
  let truncated = false;

  try {
    onProgress({ page: 0, total: pdfDocument.numPages, found: 0 });
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      throwIfAborted(signal);
      const page = await pdfDocument.getPage(pageNumber);
      try {
        // getOperatorList names the images but does not decode them; a cheap render forces
        // PDF.js to resolve each image object so it can be read back below.
        const probe = page.getViewport({ scale: 1 });
        const probeScale = Math.min(1, Math.sqrt(4_000_000 / (probe.width * probe.height)));
        const probeCanvas = document.createElement('canvas');
        const probeViewport = page.getViewport({ scale: probeScale });
        probeCanvas.width = Math.ceil(probeViewport.width);
        probeCanvas.height = Math.ceil(probeViewport.height);
        const probeContext = probeCanvas.getContext('2d');
        if (probeContext) {
          await page.render({ canvas: probeCanvas, canvasContext: probeContext, viewport: probeViewport }).promise;
        }
        probeCanvas.width = 0;
        probeCanvas.height = 0;

        const operators = await page.getOperatorList();
        for (let index = 0; index < operators.fnArray.length; index += 1) {
          if (files.length >= MAX_IMAGES) {
            truncated = true;
            break;
          }
          const fn = operators.fnArray[index];
          const args = (operators.argsArray[index] ?? []) as unknown[];
          let source: unknown = null;

          if (fn === pdfjs.OPS.paintImageXObject) {
            const objectId = String(args[0]);
            // PDFObjects throws when asked synchronously for a pending object; the callback
            // form resolves it whether it is already cached or still being decoded.
            source = await new Promise((resolve) => {
              let settled = false;
              const finish = (value: unknown) => {
                if (settled) return;
                settled = true;
                resolve(value);
              };
              const timer = setTimeout(() => finish(null), 5000);
              try {
                page.objs.get(objectId, (value: unknown) => {
                  clearTimeout(timer);
                  finish(value);
                });
              } catch {
                clearTimeout(timer);
                finish(null);
              }
            });
          } else if (fn === pdfjs.OPS.paintInlineImageXObject) {
            source = args[0];
          }

          if (!source) {
            skipped += 1;
            continue;
          }

          const canvas = drawSource(source);
          if (!canvas) {
            skipped += 1;
            continue;
          }
          try {
            if (canvas.width * canvas.height > MAX_PIXELS) {
              skipped += 1;
              continue;
            }
            if (!extractable(canvas.width, canvas.height, minimumSize)) {
              skipped += 1;
              continue;
            }
            const png = await encodePng(canvas);
            files.push({
              name: imageFileName(baseName, files.length + 1),
              bytes: png,
              page: pageNumber,
              width: canvas.width,
              height: canvas.height,
            });
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
      } finally {
        page.cleanup();
      }
      onProgress({ page: pageNumber, total: pdfDocument.numPages, found: files.length });
      if (truncated) break;
    }

    if (files.length === 0) {
      return failure(
        'NO_IMAGES',
        'No raster images matched. Pages made of vector graphics, text or 1-bit masks do not produce a picture this tool can export.',
      );
    }
    return { ok: true, files, pages: pdfDocument.numPages, baseName, skipped, truncated };
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    return failure(
      'FAILED',
      'The images could not be read. Some may use an encoding this reader cannot decode.',
    );
  } finally {
    await loading.destroy();
  }
}
