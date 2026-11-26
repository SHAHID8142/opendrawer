// SPDX-License-Identifier: AGPL-3.0-or-later
// Output formats for PDF to image, including which ones this browser can actually encode.

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif';

export interface FormatMeta {
  label: string;
  mime: string;
  extension: string;
  /** JPEG has no alpha, so pages are painted white first. */
  needsWhiteBackground: boolean;
}

export const FORMATS: Record<ImageFormat, FormatMeta> = {
  png: {
    label: 'PNG (lossless, larger)',
    mime: 'image/png',
    extension: 'png',
    needsWhiteBackground: false,
  },
  jpeg: {
    label: 'JPEG (smaller, slight loss)',
    mime: 'image/jpeg',
    extension: 'jpg',
    needsWhiteBackground: true,
  },
  webp: {
    label: 'WebP (small, good quality)',
    mime: 'image/webp',
    extension: 'webp',
    needsWhiteBackground: false,
  },
  avif: {
    label: 'AVIF (smallest, newer)',
    mime: 'image/avif',
    extension: 'avif',
    needsWhiteBackground: false,
  },
};

export const FORMAT_ORDER: ImageFormat[] = ['png', 'jpeg', 'webp', 'avif'];

/** How many of the requested formats this browser can encode through a canvas. */
export function detectFormats(): Record<ImageFormat, boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const support = {} as Record<ImageFormat, boolean>;
  for (const format of FORMAT_ORDER) {
    const url = canvas.toDataURL(FORMATS[format].mime);
    support[format] = url.startsWith(`data:${FORMATS[format].mime}`);
  }
  canvas.width = 0;
  canvas.height = 0;
  return support;
}

export function imageFileName(baseName: string, pageNumber: number, format: ImageFormat): string {
  return `${baseName}-page-${String(pageNumber).padStart(3, '0')}.${FORMATS[format].extension}`;
}
