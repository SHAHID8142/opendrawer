// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser-side image OCR with the self-hosted Tesseract worker. The image never leaves the tab.

import { isUsableOcrText } from '../../lib/ocr-text';
import { byteLimitMessage, pixelLimitMessage, sniffImage } from './engine';

interface OcrWorker {
  recognize: (input: HTMLCanvasElement) => Promise<{ data: { text?: string } }>;
  terminate: () => Promise<unknown>;
}

export type ImageOcrResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new DOMException('Reading was cancelled.', 'AbortError');
}

export async function readImage(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<ImageOcrResult> {
  const tooBig = byteLimitMessage(file.size);
  if (tooBig !== null) return { ok: false, message: tooBig };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImage(bytes);
  if (!sniffed.ok) return { ok: false, message: sniffed.message };

  let createWorker;
  try {
    ({ createWorker } = await import('tesseract.js'));
  } catch {
    return {
      ok: false,
      message:
        'The OCR engine could not be loaded. The first run downloads about 18 MB from this site; check your connection, reload and try again.',
    };
  }

  let worker: OcrWorker | null = null;
  let bitmap: ImageBitmap | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    throwIfAborted(signal);
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return {
        ok: false,
        message: 'The image could not be decoded. Re-export it as PNG or JPEG and try again.',
      };
    }

    const tooManyPixels = pixelLimitMessage(bitmap.width, bitmap.height);
    if (tooManyPixels !== null) return { ok: false, message: tooManyPixels };

    try {
      worker = (await createWorker('eng', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/core',
        langPath: '/ocr/lang',
        cacheMethod: 'none',
        workerBlobURL: false,
        gzip: true,
        logger: (message: { status: string; progress: number }) => {
          if (message.status === 'recognizing text') onProgress(Math.round(message.progress * 100));
        },
      })) as unknown as OcrWorker;
    } catch {
      return {
        ok: false,
        message: 'The OCR engine started but could not prepare the English language data. Reload and try again.',
      };
    }

    throwIfAborted(signal);
    canvas = window.document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) return { ok: false, message: 'This browser did not provide a drawing surface.' };
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    bitmap = null;
    throwIfAborted(signal);

    onProgress(0);
    const recognition = await worker.recognize(canvas);
    throwIfAborted(signal);
    const text = (recognition.data.text ?? '').trim();
    if (!isUsableOcrText(text)) {
      return {
        ok: false,
        message:
          'Nothing legible was found. Try a sharper, brighter image with the text filling more of the frame, or crop to the text first.',
      };
    }
    return { ok: true, text };
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    return {
      ok: false,
      message: 'Reading the image stopped unexpectedly. Reload the page and try again.',
    };
  } finally {
    if (bitmap) bitmap.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    if (worker) await worker.terminate().catch(() => undefined);
  }
}
