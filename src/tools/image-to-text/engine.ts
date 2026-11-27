// SPDX-License-Identifier: AGPL-3.0-or-later
// Format checks and limits for image OCR, free of browser APIs so node --test can cover them.

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;

export interface ImageFormat {
  mime: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif';
  label: string;
}

export type SniffResult = { ok: true; format: ImageFormat } | { ok: false; message: string };

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

/** Identifies a supported image by its bytes, never by the file extension. */
export function sniffImage(bytes: Uint8Array): SniffResult {
  if (bytes.length < 12) {
    return { ok: false, message: 'That file is too small to be an image. Choose a PNG, JPEG, WebP or AVIF photo.' };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ok: true, format: { mime: 'image/png', label: 'PNG' } };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { ok: true, format: { mime: 'image/jpeg', label: 'JPEG' } };
  }
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    return { ok: true, format: { mime: 'image/webp', label: 'WebP' } };
  }
  if (ascii(4, 8) === 'ftyp' && (ascii(8, 12) === 'avif' || ascii(8, 12) === 'avis')) {
    return { ok: true, format: { mime: 'image/avif', label: 'AVIF' } };
  }
  return {
    ok: false,
    message: 'That is not a PNG, JPEG, WebP or AVIF image. Convert it first, or choose another file.',
  };
}

export function byteLimitMessage(size: number): string | null {
  if (size <= MAX_IMAGE_BYTES) return null;
  return `That image is ${(size / (1024 * 1024)).toFixed(1)} MB. The limit is 25 MB; resize or re-export it first.`;
}

export function pixelLimitMessage(width: number, height: number): string | null {
  if (width * height <= MAX_PIXELS) return null;
  return `That image is ${width} × ${height} pixels. The limit is 40 megapixels; resize it and try again.`;
}

export function textFileName(imageName: string): string {
  const base = imageName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'image' : base}-text.txt`;
}
