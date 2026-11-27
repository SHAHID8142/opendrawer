// SPDX-License-Identifier: AGPL-3.0-or-later
// Text assembly and limits for OCR, kept free of browser APIs so node --test can cover it.

export { isUsableOcrText } from '../../lib/ocr-text.ts';

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
