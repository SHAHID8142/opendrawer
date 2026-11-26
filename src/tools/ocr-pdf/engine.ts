// SPDX-License-Identifier: AGPL-3.0-or-later
// Text assembly and limits for OCR, kept free of browser APIs so node --test can cover it.

export const MAX_PAGES = 20;
export const OCR_DPI = 200;

export interface OcrPage {
  pageNumber: number;
  text: string;
}

/** Join recognised pages in order with a page label, trimmed at the end. */
export function assembleOcrText(pages: readonly OcrPage[]): string {
  const body = pages
    .map((page) => `--- Page ${page.pageNumber} ---\n${page.text.trim()}`)
    .join('\n\n');
  return `${body.replace(/\n+$/, '')}\n`;
}

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

export function ocrFileName(pdfName: string): string {
  const base = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'document' : base}-ocr.txt`;
}

/** A specific message for the one limit that is checked before any rendering starts. */
export function pageLimitMessage(pageCount: number): string | null {
  if (pageCount <= MAX_PAGES) return null;
  return `That is ${pageCount} pages. OCR stops at ${MAX_PAGES} pages at once, because each page takes several seconds. Split the document first.`;
}
