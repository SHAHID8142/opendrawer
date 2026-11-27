// SPDX-License-Identifier: AGPL-3.0-or-later
// Crop geometry, naming and format mapping. Pure so node --test can cover the edges.

export type CropFormat = 'png' | 'jpeg' | 'webp';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Keeps the box inside the image and never lets it collapse to zero. */
export function clampRect(rect: CropRect, imageWidth: number, imageHeight: number): CropRect {
  const width = Math.min(imageWidth, Math.max(1, Math.round(rect.width)));
  const height = Math.min(imageHeight, Math.max(1, Math.round(rect.height)));
  return {
    width,
    height,
    x: Math.min(imageWidth - width, Math.max(0, Math.round(rect.x))),
    y: Math.min(imageHeight - height, Math.max(0, Math.round(rect.y))),
  };
}

export function cropMime(format: CropFormat): 'image/png' | 'image/jpeg' | 'image/webp' {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

export function cropFileName(imageName: string, format: CropFormat): string {
  const base = imageName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  const safe = base === '' || base === '.' ? 'image' : base;
  return `${safe}-cropped.${format === 'jpeg' ? 'jpg' : format}`;
}

/** A whole-image selection used when an image is first opened. */
export function fullRect(width: number, height: number): CropRect {
  return { x: 0, y: 0, width, height };
}
