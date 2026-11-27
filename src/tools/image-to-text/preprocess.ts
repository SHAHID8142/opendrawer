// SPDX-License-Identifier: AGPL-3.0-or-later
// Simple photo clean-up before OCR. Pixel maths only, so node --test can cover it.

export interface PreprocessOptions {
  grayscale: boolean;
  contrast: boolean;
}

/** Contrast amount for the classic 259-based formula; 40 is noticeable without clipping. */
const CONTRAST = 40;

function contrastFactor(): number {
  const c = CONTRAST;
  return (259 * (c + 255)) / (255 * (259 - c));
}

/**
 * Applies the chosen adjustments in place. Grayscale first, because a contrast boost on three
 * channels independently would tint the edge of dark text.
 */
export function processPixels(
  data: Uint8ClampedArray,
  options: PreprocessOptions,
): Uint8ClampedArray {
  if (!options.grayscale && !options.contrast) return data;
  const factor = contrastFactor();
  for (let index = 0; index < data.length; index += 4) {
    let red = data[index] ?? 0;
    let green = data[index + 1] ?? 0;
    let blue = data[index + 2] ?? 0;
    if (options.grayscale) {
      const grey = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
      red = grey;
      green = grey;
      blue = grey;
    }
    if (options.contrast) {
      red = factor * (red - 128) + 128;
      green = factor * (green - 128) + 128;
      blue = factor * (blue - 128) + 128;
    }
    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
  }
  return data;
}
