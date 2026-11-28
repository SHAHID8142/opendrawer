// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser-side image compression with canvas. Decoding and encoding happen in this tab.

import { byteLimitMessage, pixelLimitMessage } from '../../lib/image-format';
import { decodeImageFile, type DecodedImage } from '../../lib/decode-image';
import { fitDimensions, mimeFor, type OutputFormat } from './engine';

export interface CompressSettings {
  format: OutputFormat;
  quality: number;
  maxEdge: number;
}

export interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalBytes: number;
}

export type CompressOutcome =
  | { ok: true; result: CompressResult }
  | { ok: false; message: string };

function encode(canvas: HTMLCanvasElement, mime: string, quality: number | undefined): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), mime, quality));
}

export async function compressImage(file: File, settings: CompressSettings): Promise<CompressOutcome> {
  const tooBig = byteLimitMessage(file.size);
  if (tooBig !== null) return { ok: false, message: tooBig };
  let decoded: DecodedImage | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    decoded = await decodeImageFile(file);
    if (!decoded) {
      return { ok: false, message: 'The image could not be decoded. Re-export it as PNG or JPEG and try again.' };
    }
    const tooManyPixels = pixelLimitMessage(decoded.width, decoded.height);
    if (tooManyPixels !== null) return { ok: false, message: tooManyPixels };

    const originalWidth = decoded.width;
    const originalHeight = decoded.height;
    const size = fitDimensions(originalWidth, originalHeight, settings.maxEdge);
    canvas = window.document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return { ok: false, message: 'This browser did not provide a drawing surface.' };
    if (settings.format === 'jpeg') {
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(decoded.source, 0, 0, size.width, size.height);
    decoded.close();
    decoded = null;

    const mime = mimeFor(settings.format);
    const blob = await encode(canvas, mime, settings.format === 'png' ? undefined : settings.quality / 100);
    if (blob === null) {
      return { ok: false, message: 'This browser could not encode that format. Try JPEG or WebP.' };
    }
    return {
      ok: true,
      result: {
        blob,
        width: size.width,
        height: size.height,
        originalWidth,
        originalHeight,
        originalBytes: file.size,
      },
    };
  } catch {
    return { ok: false, message: 'The image could not be compressed. Reload the page and try again.' };
  } finally {
    if (decoded) decoded.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
