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

/** Strip control characters that a broken font mapping produces; they are not text. */
export function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '');
}

/**
 * False when a page decodes to control noise instead of letters. Some PDFs ship fonts without a
 * ToUnicode map, and PDF.js then returns glyph codes rather than readable characters.
 */
export function isReadablePage(value: string): boolean {
  const meaningful = value.replace(/\s+/g, '');
  if (meaningful === '') return false;
  let printable = 0;
  for (const char of meaningful) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x20 && (code < 0x7f || code > 0x9f)) printable += 1;
  }
  return printable / meaningful.length >= 0.6;
}

/**
 * Rebuild a page's reading text. PDF.js splits words at arbitrary positions, so a space is
 * inserted between items unless the stored text already provides whitespace.
 */
export function joinPageText(items: readonly TextItem[]): string {
  let text = '';
  for (const item of items) {
    const value = stripControlChars(item.str.replace(/\u00a0/g, ' ').replace(/\r/g, ''));
    if (value !== '') {
      if (text !== '' && !/\s$/.test(text) && !/^\s/.test(value)) text += ' ';
      text += value;
    }
    if (item.hasEOL) text += '\n';
  }
  // Broken mappings emit an end-of-line for glyphs that carry no text; keep at most one gap.
  return text.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '');
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
