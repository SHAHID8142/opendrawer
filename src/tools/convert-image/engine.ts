// SPDX-License-Identifier: AGPL-3.0-or-later
// Output naming, quality bounds and a dependency-free BMP encoder.

export type ConvertFormat = 'png' | 'jpeg' | 'webp' | 'bmp' | 'ico';

export const QUALITY_MIN = 40;
export const QUALITY_MAX = 95;

export { ICO_SIZE, ICO_SIZES, wrapIco, wrapIcoMulti } from '../../lib/ico.ts';

export function convertMime(format: ConvertFormat): string {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  if (format === 'bmp') return 'image/bmp';
  if (format === 'ico') return 'image/x-icon';
  return 'image/png';
}

export function convertFileName(imageName: string, format: ConvertFormat): string {
  const base = imageName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  const safe = base === '' || base === '.' ? 'image' : base;
  return `${safe}-converted.${format === 'jpeg' ? 'jpg' : format}`;
}

export function clampQuality(value: number): number {
  return Math.min(QUALITY_MAX, Math.max(QUALITY_MIN, Math.round(value)));
}

/** True when the chosen output can carry an alpha channel. */
export function keepsTransparency(format: ConvertFormat): boolean {
  return format === 'png' || format === 'webp' || format === 'ico';
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

/**
 * Uncompressed 24-bit BMP, bottom-up with rows padded to four bytes. Alpha is flattened onto
 * white because BMP at this depth has no transparency; that matches the JPEG behaviour users see.
 */
export function encodeBmp(pixels: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const rowBytes = Math.ceil((width * 3) / 4) * 4;
  const fileSize = 54 + rowBytes * height;
  const bytes = new Uint8Array(fileSize);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  writeUint32(view, 2, fileSize);
  writeUint32(view, 10, 54);
  writeUint32(view, 14, 40);
  writeUint32(view, 18, width);
  writeUint32(view, 22, height);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  writeUint32(view, 34, rowBytes * height);

  for (let y = 0; y < height; y += 1) {
    const targetRow = height - 1 - y;
    let offset = 54 + targetRow * rowBytes;
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4;
      const alpha = (pixels[source + 3] ?? 255) / 255;
      const red = pixels[source] ?? 0;
      const green = pixels[source + 1] ?? 0;
      const blue = pixels[source + 2] ?? 0;
      bytes[offset] = Math.round(blue * alpha + 255 * (1 - alpha));
      bytes[offset + 1] = Math.round(green * alpha + 255 * (1 - alpha));
      bytes[offset + 2] = Math.round(red * alpha + 255 * (1 - alpha));
      offset += 3;
    }
  }
  return bytes;
}
