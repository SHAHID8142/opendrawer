// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser crop: decode once, draw the selected source rectangle into a canvas, encode locally.

import { byteLimitMessage, pixelLimitMessage, sniffImage } from '../../lib/image-format';
import { clampRect, cropMime, type CropFormat, type CropRect } from './engine';

export interface CropOutcome {
  blob: Blob;
  width: number;
  height: number;
}

export type CropResult = { ok: true; outcome: CropOutcome } | { ok: false; message: string };

export async function cropImage(
  file: File,
  rect: CropRect,
  format: CropFormat,
): Promise<CropResult> {
  const tooBig = byteLimitMessage(file.size);
  if (tooBig !== null) return { ok: false, message: tooBig };
  const sniffed = sniffImage(new Uint8Array(await file.arrayBuffer()));
  if (!sniffed.ok) return { ok: false, message: sniffed.message };

  let bitmap: ImageBitmap | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return { ok: false, message: 'The image could not be decoded. Re-export it as PNG or JPEG and try again.' };
    }
    const pixels = pixelLimitMessage(bitmap.width, bitmap.height);
    if (pixels !== null) return { ok: false, message: pixels };

    const area = clampRect(rect, bitmap.width, bitmap.height);
    canvas = window.document.createElement('canvas');
    canvas.width = area.width;
    canvas.height = area.height;
    const context = canvas.getContext('2d');
    if (!context) return { ok: false, message: 'This browser did not provide a drawing surface.' };
    if (format === 'jpeg') {
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas?.toBlob((value) => resolve(value), cropMime(format), format === 'png' ? undefined : 0.9),
    );
    if (blob === null) return { ok: false, message: 'This browser could not encode that format. Try PNG or JPEG.' };
    return { ok: true, outcome: { blob, width: area.width, height: area.height } };
  } catch {
    return { ok: false, message: 'The crop could not be made. Reload the page and try again.' };
  } finally {
    if (bitmap) bitmap.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
