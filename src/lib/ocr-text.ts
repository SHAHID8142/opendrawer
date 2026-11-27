// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared OCR text sanity check: separates real recognised words from punctuation noise.

/** True when OCR produced enough letters to be worth keeping rather than punctuation noise. */
export function isUsableOcrText(text: string): boolean {
  const meaningful = text.replace(/\s+/g, '');
  if (meaningful.length < 3) return false;
  let letters = 0;
  for (const char of meaningful) {
    if (/[\p{L}\p{N}]/u.test(char)) letters += 1;
  }
  return letters / meaningful.length >= 0.5;
}
