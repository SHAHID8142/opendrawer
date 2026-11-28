// SPDX-License-Identifier: AGPL-3.0-or-later
// Rotation geometry and output naming. Pure so node --test can cover the edges.

export type Rotation = 0 | 90 | 180 | 270;
export type RotateFormat = 'png' | 'jpeg' | 'webp';

export interface TransformState {
  rotation: Rotation;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export function nextRotation(current: Rotation, direction: 'left' | 'right'): Rotation {
  const step = direction === 'right' ? 90 : 270;
  return (((current + step) % 360) as Rotation);
}

/** A quarter turn swaps width and height; half turns do not. */
export function transformSize(width: number, height: number, rotation: Rotation): { width: number; height: number } {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height };
}

export function rotateMime(format: RotateFormat): 'image/png' | 'image/jpeg' | 'image/webp' {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

export function rotateFileName(imageName: string, format: RotateFormat): string {
  const base = imageName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  const safe = base === '' || base === '.' ? 'image' : base;
  return `${safe}-rotated.${format === 'jpeg' ? 'jpg' : format}`;
}

export function describeTransform(state: TransformState): string {
  const parts = [state.rotation === 0 ? 'No rotation' : `${state.rotation}° clockwise`];
  if (state.flipHorizontal) parts.push('flipped horizontally');
  if (state.flipVertical) parts.push('flipped vertically');
  return parts.join(', ');
}

/** Adds -2, -3… before the extension so a batch ZIP never contains duplicate names. */
export function uniqueRotateName(name: string, used: Set<string>): string {
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
