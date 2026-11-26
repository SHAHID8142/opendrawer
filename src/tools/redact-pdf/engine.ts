// SPDX-License-Identifier: AGPL-3.0-or-later
// Geometry and naming for redaction. The security step is in apply.ts: a redacted page is
// rasterised with the boxes burned in, so its text and hidden content are gone, not covered.

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A drag smaller than this many canvas pixels is treated as a click, not a box. */
export const MIN_RECT = 3;
export const MAX_PIXELS = 40_000_000;

export function normalizeRect(
  start: Point,
  end: Point,
  canvasWidth: number,
  canvasHeight: number,
): NormalizedRect | null {
  const left = Math.max(0, Math.min(start.x, end.x));
  const top = Math.max(0, Math.min(start.y, end.y));
  const right = Math.min(canvasWidth, Math.max(start.x, end.x));
  const bottom = Math.min(canvasHeight, Math.max(start.y, end.y));
  if (right - left < MIN_RECT || bottom - top < MIN_RECT) return null;
  return {
    x: left / canvasWidth,
    y: top / canvasHeight,
    width: (right - left) / canvasWidth,
    height: (bottom - top) / canvasHeight,
  };
}

export function rectToPixels(
  rect: NormalizedRect,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round(rect.x * canvasWidth),
    y: Math.round(rect.y * canvasHeight),
    width: Math.round(rect.width * canvasWidth),
    height: Math.round(rect.height * canvasHeight),
  };
}

export function redactedName(pdfName: string): string {
  const base = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'document' : base}-redacted.pdf`;
}

export function totalAreas(byPage: Record<number, NormalizedRect[]>): number {
  return Object.values(byPage).reduce((sum, rects) => sum + rects.length, 0);
}
