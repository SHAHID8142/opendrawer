// SPDX-License-Identifier: AGPL-3.0-or-later
// Crops pages by shrinking the CropBox. The content outside it stays in the file, so this is
// framing, not redaction — the UI must say so.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export interface CropInput {
  name: string;
  bytes: Uint8Array;
}

export type CropErrorCode =
  | 'EMPTY'
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'PAGE_OUT_OF_RANGE'
  | 'INVALID_MARGIN'
  | 'MARGIN_TOO_LARGE'
  | 'FAILED';

export type CropResult =
  | { ok: true; bytes: Uint8Array; cropped: number }
  | { ok: false; code: CropErrorCode; message: string };

/** 1 mm in PDF points; PDF pages are measured in 1/72 inch. */
export const MM_TO_PT = 72 / 25.4;
export const MIN_MARGIN_MM = 1;
export const MAX_MARGIN_MM = 50;
/** A page may not be cropped smaller than this on either side. */
export const MIN_PAGE_MM = 20;

function failure(code: CropErrorCode, message: string): CropResult {
  return { ok: false, code, message };
}

export async function cropPdf(
  input: CropInput,
  marginMm: number,
  pages: number[],
): Promise<CropResult> {
  if (!Number.isFinite(marginMm) || marginMm < MIN_MARGIN_MM || marginMm > MAX_MARGIN_MM) {
    return failure(
      'INVALID_MARGIN',
      `Choose a margin between ${MIN_MARGIN_MM} and ${MAX_MARGIN_MM} mm.`,
    );
  }
  if (pages.length === 0) {
    return failure('EMPTY', 'Select at least one page to crop.');
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
        `"${input.name}" is password protected. Remove the password first, then crop it.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  const pageCount = pdf.getPageCount();
  const unique = [...new Set(pages)];
  const margin = marginMm * MM_TO_PT;
  const minSize = MIN_PAGE_MM * MM_TO_PT;

  for (const pageNumber of unique) {
    if (pageNumber < 1 || pageNumber > pageCount) {
      return failure(
        'PAGE_OUT_OF_RANGE',
        `Page ${pageNumber} does not exist: this document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`,
      );
    }
    const media = pdf.getPage(pageNumber - 1).getMediaBox();
    if (media.width - margin * 2 < minSize || media.height - margin * 2 < minSize) {
      return failure(
        'MARGIN_TOO_LARGE',
        `Page ${pageNumber} is too small for a ${marginMm} mm margin on every side. A page must keep at least ${MIN_PAGE_MM} mm.`,
      );
    }
  }

  try {
    for (const pageNumber of unique) {
      const page = pdf.getPage(pageNumber - 1);
      const media = page.getMediaBox();
      page.setCropBox(
        media.x + margin,
        media.y + margin,
        media.width - margin * 2,
        media.height - margin * 2,
      );
    }
    return { ok: true, bytes: await pdf.save(), cropped: unique.length };
  } catch {
    return failure('FAILED', 'The crop could not be written. Try again with a smaller margin.');
  }
}
