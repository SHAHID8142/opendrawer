// SPDX-License-Identifier: AGPL-3.0-or-later
// Extracts chosen pages into a new PDF, in the order they were selected.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export interface ExtractInput {
  name: string;
  bytes: Uint8Array;
}

export type ExtractErrorCode =
  | 'EMPTY'
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'PAGE_OUT_OF_RANGE'
  | 'FAILED';

export type ExtractResult =
  | { ok: true; bytes: Uint8Array; pageCount: number }
  | { ok: false; code: ExtractErrorCode; message: string };

function failure(code: ExtractErrorCode, message: string): ExtractResult {
  return { ok: false, code, message };
}

export async function extractPdfPages(
  input: ExtractInput,
  pages: number[],
): Promise<ExtractResult> {
  if (pages.length === 0) {
    return failure('EMPTY', 'Choose at least one page to keep.');
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
        `"${input.name}" is password protected. Remove the password first, then extract pages.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  const pageCount = source.getPageCount();
  const unique = [...new Set(pages)];
  for (const pageNumber of unique) {
    if (pageNumber < 1 || pageNumber > pageCount) {
      return failure(
        'PAGE_OUT_OF_RANGE',
        `Page ${pageNumber} does not exist: this document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`,
      );
    }
  }

  try {
    const output = await PDFDocument.create();
    const copied = await output.copyPages(
      source,
      unique.map((pageNumber) => pageNumber - 1),
    );
    for (const page of copied) output.addPage(page);
    return { ok: true, bytes: await output.save(), pageCount: unique.length };
  } catch {
    return failedResult();
  }
}

function failedResult(): ExtractResult {
  return failure('FAILED', 'The pages could not be extracted. Try a smaller selection.');
}
