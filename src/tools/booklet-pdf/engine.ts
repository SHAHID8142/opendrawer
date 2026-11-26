// SPDX-License-Identifier: AGPL-3.0-or-later
// Saddle-stitch imposition: page pairs are placed on A4 landscape so a stack printed
// double-sided and folded becomes a booklet. A4 landscape only, no crop marks.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export const A4_LANDSCAPE = { width: 841.89, height: 595.28 };
export const MAX_PAGES = 400;
const MARGIN = 12;
const GUTTER = 10;

export type Pair = [number | null, number | null];

export interface BookletInput {
  name: string;
  bytes: Uint8Array;
}

export type BookletErrorCode = 'NOT_PDF' | 'ENCRYPTED' | 'CORRUPT' | 'TOO_MANY' | 'FAILED';

export type BookletResult =
  | { ok: true; bytes: Uint8Array; sheets: number; padded: number; pages: number }
  | { ok: false; code: BookletErrorCode; message: string };

export function paddedCount(pageCount: number): number {
  return Math.ceil(pageCount / 4) * 4;
}

export function sheetCount(pageCount: number): number {
  return paddedCount(pageCount) / 4;
}

/**
 * Saddle-stitch pairs in print order. Each sheet contributes a front and a back page; null
 * means a padded blank slot. Example for 8 pages: [8,1], [2,7], [6,3], [4,5].
 */
export function bookletOrder(pageCount: number): Pair[] {
  const padded = paddedCount(pageCount);
  const pair = (left: number, right: number): Pair => [
    left <= pageCount ? left : null,
    right <= pageCount ? right : null,
  ];
  const result: Pair[] = [];
  for (let sheet = 0; sheet < padded / 4; sheet += 1) {
    const last = padded - sheet * 2;
    const first = 1 + sheet * 2;
    result.push(pair(last, first));
    result.push(pair(first + 1, last - 1));
  }
  return result;
}

export function bookletName(pdfName: string): string {
  const base = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'document' : base}-booklet.pdf`;
}

export async function bookletPdf(input: BookletInput): Promise<BookletResult> {
  if (!looksLikePdf(input.bytes)) {
    return { ok: false, code: 'NOT_PDF', message: `"${input.name}" is not a PDF file.` };
  }

  let source;
  try {
    source = await PDFDocument.load(input.bytes, { updateMetadata: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return {
        ok: false,
        code: 'ENCRYPTED',
        message: `"${input.name}" is password protected. Remove the password first.`,
      };
    }
    return {
      ok: false,
      code: 'CORRUPT',
      message: `"${input.name}" could not be read. The file may be damaged; try Repair first.`,
    };
  }

  const pageCount = source.getPageCount();
  if (pageCount === 0) {
    return { ok: false, code: 'CORRUPT', message: 'This PDF has no pages to place.' };
  }
  if (pageCount > MAX_PAGES) {
    return {
      ok: false,
      code: 'TOO_MANY',
      message: `That is ${pageCount} pages. Booklet stops at ${MAX_PAGES} pages.`,
    };
  }

  try {
    const output = await PDFDocument.create();
    const pairs = bookletOrder(pageCount);
    const cellWidth = A4_LANDSCAPE.width / 2 - MARGIN - GUTTER / 2;
    const cellHeight = A4_LANDSCAPE.height - MARGIN * 2;

    for (const pair of pairs) {
      const sheet = output.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
      for (const [side, pageNumber] of pair.entries()) {
        if (pageNumber === null) continue;
        const embedded = await output.embedPage(source.getPage(pageNumber - 1));
        const size = source.getPage(pageNumber - 1).getSize();
        const scale = Math.min(cellWidth / size.width, cellHeight / size.height);
        const width = size.width * scale;
        const height = size.height * scale;
        const cellX = side === 0 ? MARGIN : A4_LANDSCAPE.width / 2 + GUTTER / 2;
        sheet.drawPage(embedded, {
          x: cellX + (cellWidth - width) / 2,
          y: MARGIN + (cellHeight - height) / 2,
          xScale: scale,
          yScale: scale,
        });
      }
    }
    return {
      ok: true,
      bytes: await output.save(),
      sheets: pairs.length,
      padded: paddedCount(pageCount) - pageCount,
      pages: pageCount,
    };
  } catch {
    return { ok: false, code: 'FAILED', message: 'The booklet pages could not be written.' };
  }
}
