// SPDX-License-Identifier: AGPL-3.0-or-later
// Naming and geometry for image compression, kept free of browser APIs for node --test.

export type OutputFormat = 'jpeg' | 'webp' | 'png';

export const QUALITY_MIN = 40;
export const QUALITY_MAX = 95;
export const MAX_EDGE_OPTIONS = [0, 1920, 1280, 800] as const;

export interface FitResult {
  width: number;
  height: number;
  resized: boolean;
}

export function mimeFor(format: OutputFormat): 'image/jpeg' | 'image/webp' | 'image/png' {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

/** Fits inside a square bound without ever enlarging a small image. */
export function fitDimensions(width: number, height: number, maxEdge: number): FitResult {
  if (maxEdge <= 0 || (width <= maxEdge && height <= maxEdge)) {
    return { width, height, resized: false };
  }
  const scale = maxEdge / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true,
  };
}

export function outputName(imageName: string, format: OutputFormat): string {
  const base = imageName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  const safe = base === '' || base === '.' ? 'image' : base;
  return `${safe}-compressed.${format === 'jpeg' ? 'jpg' : format}`;
}

export function clampQuality(value: number): number {
  return Math.min(QUALITY_MAX, Math.max(QUALITY_MIN, Math.round(value)));
}

/** Adds -2, -3… before the extension so a batch ZIP never contains duplicate names. */
export function uniqueOutputName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';
  let index = 2;
  let candidate = `${base}-${index}${extension}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}${extension}`;
  }
  used.add(candidate);
  return candidate;
}
