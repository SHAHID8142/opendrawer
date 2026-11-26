// SPDX-License-Identifier: AGPL-3.0-or-later
// Stamps page numbers onto a PDF. Adds a thin text layer; it does not re-render the pages.

import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { PDF_INK } from '../../lib/pdf-ink.ts';
import { looksLikePdf } from '../../lib/pdf.ts';

export type NumberPosition =
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'top-left'
  | 'top-center'
  | 'top-right';

export type NumberFormat = 'number' | 'page' | 'page-of-total';

export interface NumberOptions {
  position: NumberPosition;
  format: NumberFormat;
  /** First number printed on the first numbered page. */
  start: number;
  /** Leave the first page unnumbered (a cover). */
  skipFirst?: boolean;
  /** Font size in points, 8–24. */
  size?: number;
}

export interface NumberInput {
  name: string;
  bytes: Uint8Array;
}

export type NumberErrorCode =
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'INVALID_OPTIONS'
  | 'FAILED';

export type NumberResult =
  | { ok: true; bytes: Uint8Array; numbered: number }
  | { ok: false; code: NumberErrorCode; message: string };

const POSITIONS: NumberPosition[] = [
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'top-left',
  'top-center',
  'top-right',
];
const FORMATS: NumberFormat[] = ['number', 'page', 'page-of-total'];
const MARGIN_PT = 36;

function failure(code: NumberErrorCode, message: string): NumberResult {
  return { ok: false, code, message };
}

function label(format: NumberFormat, number: number, total: number): string {
  if (format === 'number') return String(number);
  if (format === 'page') return `Page ${number}`;
  return `Page ${number} of ${total}`;
}

function place(page: PDFPage, text: string, font: PDFFont, size: number, position: NumberPosition) {
  const width = font.widthOfTextAtSize(text, size);
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const align = position.split('-')[1];
  const top = position.startsWith('top');
  const x =
    align === 'left' ? MARGIN_PT : align === 'right' ? pageWidth - MARGIN_PT - width : (pageWidth - width) / 2;
  const y = top ? pageHeight - MARGIN_PT : MARGIN_PT - size * 0.35;
  page.drawText(text, { x, y, size, font, color: PDF_INK });
}

export async function addPageNumbers(
  input: NumberInput,
  options: NumberOptions,
): Promise<NumberResult> {
  const size = options.size ?? 11;
  if (!POSITIONS.includes(options.position) || !FORMATS.includes(options.format)) {
    return failure('INVALID_OPTIONS', 'Choose a supported position and number format.');
  }
  if (!Number.isInteger(options.start) || options.start < 1) {
    return failure('INVALID_OPTIONS', 'The first number must be a whole number of 1 or more.');
  }
  if (size < 8 || size > 24) {
    return failure('INVALID_OPTIONS', 'Choose a font size between 8 and 24 points.');
  }
  if (!looksLikePdf(input.bytes)) {
    return failure('NOT_PDF', `"${input.name}" is not a PDF file.`);
  }

  let pdf;
  try {
    pdf = await PDFDocument.load(input.bytes, { updateMetadata: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${input.name}" is password protected. Remove the password first, then number it.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  const pages = pdf.getPages();
  const firstIndex = options.skipFirst ? 1 : 0;
  const totalNumbered = Math.max(pages.length - firstIndex, 0);
  // Logical last number: numbering 3 pages from 5 reads "Page 5 of 7", not "of 4".
  const lastNumber = options.start + totalNumbered - 1;
  if (totalNumbered === 0) {
    return failure('INVALID_OPTIONS', 'There is no page left to number after skipping the cover.');
  }

  try {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    for (let index = firstIndex; index < pages.length; index += 1) {
      const number = options.start + (index - firstIndex);
      const page = pages[index];
      if (!page) continue;
      place(page, label(options.format, number, lastNumber), font, size, options.position);
    }
    return { ok: true, bytes: await pdf.save(), numbered: totalNumbered };
  } catch {
    return failure('FAILED', 'The numbers could not be written. Try again with fewer pages.');
  }
}
