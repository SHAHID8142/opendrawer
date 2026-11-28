// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser rotation and flipping with canvas. No pixels leave the tab.

import { byteLimitMessage, pixelLimitMessage, sniffImage } from '../../lib/image-format';
import {
  rotateMime,
  transformSize,
  type RotateFormat,
  type TransformState,
} from './engine';

export interface RotateOutcome {
  blob: Blob;
  width: number;
  height: number;
}

export type RotateResult = { ok: true; outcome: RotateOutcome } | { ok: false; message: string };

export async function rotateImage(
  file: File,
  state: TransformState,
  format: RotateFormat,
): Promise<RotateResult> {
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

    const size = transformSize(bitmap.width, bitmap.height, state.rotation);
    canvas = window.document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return { ok: false, message: 'This browser did not provide a drawing surface.' };
    if (format === 'jpeg') {
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.translate(size.width / 2, size.height / 2);
    context.rotate((state.rotation * Math.PI) / 180);
    context.scale(state.flipHorizontal ? -1 : 1, state.flipVertical ? -1 : 1);
    context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2, bitmap.width, bitmap.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas?.toBlob((value) => resolve(value), rotateMime(format), format === 'png' ? undefined : 0.9),
    );
    if (blob === null) return { ok: false, message: 'This browser could not encode that format. Try PNG or JPEG.' };
    return { ok: true, outcome: { blob, width: size.width, height: size.height } };
  } catch {
    return { ok: false, message: 'The image could not be transformed. Reload the page and try again.' };
  } finally {
    if (bitmap) bitmap.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
