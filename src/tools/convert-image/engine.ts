// SPDX-License-Identifier: AGPL-3.0-or-later
// Output naming, quality bounds, and dependency-free BMP/ICO encoders.

export type ConvertFormat = 'png' | 'jpeg' | 'webp' | 'bmp' | 'ico';

export const QUALITY_MIN = 40;
export const QUALITY_MAX = 95;

/** ICO files embed one square PNG; 256 is the largest size the container can describe. */
export const ICO_SIZE = 256;
/** Sizes written into a multi-resolution icon, smallest first. */
export const ICO_SIZES = [16, 32, 48, 256] as const;

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

/** Wraps a square PNG in a single-entry ICO container (the Vista+ PNG-icon form). */
export function wrapIco(png: Uint8Array, size = ICO_SIZE): Uint8Array {
  const bytes = new Uint8Array(22 + png.length);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  bytes[6] = size >= 256 ? 0 : size;
  bytes[7] = size >= 256 ? 0 : size;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  writeUint32(view, 14, png.length);
  writeUint32(view, 18, 22);
  bytes.set(png, 22);
  return bytes;
}

/** Wraps several square PNGs in one ICO, one directory entry per size. */
export function wrapIcoMulti(images: { png: Uint8Array; size: number }[]): Uint8Array {
  const header = 6 + images.length * 16;
  const total = images.reduce((sum, image) => sum + image.png.length, header);
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = header;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    bytes[entry] = image.size >= 256 ? 0 : image.size;
    bytes[entry + 1] = image.size >= 256 ? 0 : image.size;
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, image.png.length, true);
    view.setUint32(entry + 12, offset, true);
    bytes.set(image.png, offset);
    offset += image.png.length;
  });
  return bytes;
}
