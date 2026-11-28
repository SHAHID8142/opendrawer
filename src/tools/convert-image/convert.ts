// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser image conversion. Any format the browser can decode, encoded to a chosen output.

import { byteLimitMessage, pixelLimitMessage, sniffImage } from '../../lib/image-format';
import {
  ICO_SIZE,
  ICO_SIZES,
  convertMime,
  encodeBmp,
  wrapIcoMulti,
  type ConvertFormat,
} from './engine';
import { decodeImageFile, type DecodedImage } from './decode';

export interface ConvertOutcome {
  blob: Blob;
  width: number;
  height: number;
  sourceLabel: string;
}

export type ConvertResult = { ok: true; outcome: ConvertOutcome } | { ok: false; message: string };

function labelFor(bytes: Uint8Array): string {
  const sniffed = sniffImage(bytes);
  if (sniffed.ok) return sniffed.format.label;
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 3) === 'GIF') return 'GIF';
  if (ascii(0, 2) === 'BM') return 'BMP';
  if (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) return 'ICO';
  const head = ascii(0, Math.min(bytes.length, 600)).toLocaleLowerCase();
  if (head.includes('<svg')) return 'SVG';
  return 'Image';
}

function canvasOf(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null {
  const canvas = window.document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  return context ? { canvas, context } : null;
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), mime, quality));
}

export async function convertImage(
  file: File,
  format: ConvertFormat,
  quality: number,
): Promise<ConvertResult> {
  const tooBig = byteLimitMessage(file.size);
  if (tooBig !== null) return { ok: false, message: tooBig };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sourceLabel = labelFor(bytes);

  let decoded: DecodedImage | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    decoded = await decodeImageFile(file);
    if (!decoded) {
      return {
        ok: false,
        message:
          'That file could not be decoded as an image. This browser reads PNG, JPEG, WebP, AVIF, GIF, BMP, ICO and SVG; HEIC and TIFF depend on the browser.',
      };
    }
    const pixels = pixelLimitMessage(decoded.width, decoded.height);
    if (pixels !== null) return { ok: false, message: pixels };

    if (format === 'ico') {
      const layers: { png: Uint8Array; size: number }[] = [];
      for (const size of ICO_SIZES) {
        const square = canvasOf(size, size);
        if (!square) return { ok: false, message: 'This browser did not provide a drawing surface.' };
        canvas = square.canvas;
        const scale = Math.min(size / decoded.width, size / decoded.height);
        const width = Math.max(1, Math.round(decoded.width * scale));
        const height = Math.max(1, Math.round(decoded.height * scale));
        square.context.drawImage(
          decoded.source,
          Math.round((size - width) / 2),
          Math.round((size - height) / 2),
          width,
          height,
        );
        const png = await toBlob(square.canvas, 'image/png');
        if (png === null) return { ok: false, message: 'This browser could not encode the icon.' };
        layers.push({ png: new Uint8Array(await png.arrayBuffer()), size });
      }
      const ico = wrapIcoMulti(layers);
      return {
        ok: true,
        outcome: { blob: new Blob([ico], { type: 'image/x-icon' }), width: ICO_SIZE, height: ICO_SIZE, sourceLabel },
      };
    }

    const made = canvasOf(decoded.width, decoded.height);
    if (!made) return { ok: false, message: 'This browser did not provide a drawing surface.' };
    const target = made.canvas;
    const context = made.context;
    canvas = target;
    if (format === 'jpeg' || format === 'bmp') {
      context.fillStyle = 'white';
      context.fillRect(0, 0, target.width, target.height);
    }
    context.drawImage(decoded.source, 0, 0);

    if (format === 'bmp') {
      const data = context.getImageData(0, 0, target.width, target.height);
      const bmp = encodeBmp(data.data, target.width, target.height);
      return {
        ok: true,
        outcome: {
          blob: new Blob([bmp], { type: 'image/bmp' }),
          width: target.width,
          height: target.height,
          sourceLabel,
        },
      };
    }

    const blob = await toBlob(
      target,
      convertMime(format),
      format === 'png' ? undefined : quality / 100,
    );
    if (blob === null) return { ok: false, message: 'This browser could not encode that format. Try PNG or JPEG.' };
    return {
      ok: true,
      outcome: { blob, width: target.width, height: target.height, sourceLabel },
    };
  } catch {
    return { ok: false, message: 'The image could not be converted. Reload the page and try again.' };
  } finally {
    if (decoded) decoded.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
