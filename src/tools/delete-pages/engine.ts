// SPDX-License-Identifier: AGPL-3.0-or-later
// Deletes chosen pages by copying the survivors into a new PDF. Lossless for the kept pages.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export interface DeleteInput {
  name: string;
  bytes: Uint8Array;
}

export type DeleteErrorCode =
  | 'EMPTY'
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'PAGE_OUT_OF_RANGE'
  | 'WOULD_EMPTY'
  | 'FAILED';

export type DeleteResult =
  | { ok: true; bytes: Uint8Array; removed: number; remaining: number }
  | { ok: false; code: DeleteErrorCode; message: string };

function failure(code: DeleteErrorCode, message: string): DeleteResult {
  return { ok: false, code, message };
}

export async function deletePdfPages(input: DeleteInput, pages: number[]): Promise<DeleteResult> {
  if (pages.length === 0) {
    return failure('EMPTY', 'Choose at least one page to remove.');
  }
  if (!looksLikePdf(input.bytes)) {
    return failure('NOT_PDF', `"${input.name}" is not a PDF file.`);
  }

  let source;
  try {
    source = await PDFDocument.load(input.bytes, { updateMetadata: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${input.name}" is password protected. Remove the password first, then delete pages.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  const pageCount = source.getPageCount();
  const unique = [...new Set(pages)].sort((a, b) => a - b);
  for (const pageNumber of unique) {
    if (pageNumber < 1 || pageNumber > pageCount) {
      return failure(
        'PAGE_OUT_OF_RANGE',
        `Page ${pageNumber} does not exist: this document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`,
      );
    }
  }
  if (unique.length >= pageCount) {
    return failure(
      'WOULD_EMPTY',
      'Every page is selected. A PDF must keep at least one page, so remove all but one.',
    );
  }

  const removed = new Set(unique);
  const keep = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (pageNumber) => !removed.has(pageNumber),
  );

  try {
    const output = await PDFDocument.create();
    const copied = await output.copyPages(
      source,
      keep.map((pageNumber) => pageNumber - 1),
    );
    for (const page of copied) output.addPage(page);
    return {
      ok: true,
      bytes: await output.save(),
      removed: unique.length,
      remaining: keep.length,
    };
  } catch {
    return failure('FAILED', 'The pages could not be removed. Try a smaller selection.');
  }
}
