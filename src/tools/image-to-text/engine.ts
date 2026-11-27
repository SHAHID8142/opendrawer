// SPDX-License-Identifier: AGPL-3.0-or-later
// Tool-specific naming for image OCR; shared image checks live in src/lib/image-format.ts.

export {
  MAX_IMAGE_BYTES,
  MAX_PIXELS,
  byteLimitMessage,
  pixelLimitMessage,
  sniffImage,
} from '../../lib/image-format.ts';

export function textFileName(imageName: string): string {
  const base = imageName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'image' : base}-text.txt`;
}
