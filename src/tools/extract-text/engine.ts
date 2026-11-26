// SPDX-License-Identifier: AGPL-3.0-or-later
// Text-only helpers for extract-text: they turn PDF.js text items into readable lines and
// keep the browser-free parts testable under node --test.

/** One PDF.js text item, reduced to the two fields this tool needs. */
export interface TextItem {
  str: string;
  hasEOL: boolean;
}

export interface ExtractOptions {
  markers: boolean;
}

export const MAX_PAGES = 500;

/**
 * Rebuild a page's reading text. PDF.js splits words at arbitrary positions, so a space is
 * inserted between items unless the stored text already provides whitespace.
 */
export function joinPageText(items: readonly TextItem[]): string {
  let text = '';
  for (const item of items) {
    const value = item.str.replace(/\u00a0/g, ' ').replace(/\r/g, '');
    if (value !== '') {
      if (text !== '' && !/\s$/.test(text) && !/^\s/.test(value)) text += ' ';
      text += value;
    }
    if (item.hasEOL) text += '\n';
  }
  return text.replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
}

/** Join pages in order, optionally labelling each one so the reader can find it again. */
export function assembleDocument(pages: readonly string[], options: ExtractOptions): string {
  const body = options.markers
    ? pages.map((page, index) => `--- Page ${index + 1} ---\n${page}`).join('\n\n')
    : pages.join('\n\n');
  return `${body.replace(/\n+$/, '')}\n`;
}

/** A safe .txt name derived from the PDF's name, never from its content. */
export function textFileName(pdfName: string): string {
  const base = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'document' : base}.txt`;
}
