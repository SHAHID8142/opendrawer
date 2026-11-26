// SPDX-License-Identifier: AGPL-3.0-or-later
// Reorders PDF pages by copying them in the requested sequence. Nothing is rendered.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export interface ReorderInput {
  name: string;
  bytes: Uint8Array;
}

export type ReorderErrorCode =
  | 'EMPTY'
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'INVALID_ORDER'
  | 'FAILED';

export type ReorderResult =
  | { ok: true; bytes: Uint8Array; pageCount: number }
  | { ok: false; code: ReorderErrorCode; message: string };

function failure(code: ReorderErrorCode, message: string): ReorderResult {
  return { ok: false, code, message };
}

export async function reorderPdf(
  input: ReorderInput,
  order: number[],
): Promise<ReorderResult> {
  if (order.length === 0) {
    return failure('EMPTY', 'The new page order is empty.');
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
        `"${input.name}" is password protected. Remove the password first, then reorder it.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  const pageCount = source.getPageCount();
  const unique = new Set(order);
  const isPermutation =
    order.length === pageCount &&
    unique.size === pageCount &&
    order.every((pageNumber) => pageNumber >= 1 && pageNumber <= pageCount);
  if (!isPermutation) {
    return failure(
      'INVALID_ORDER',
      `The new order must list every one of the ${pageCount} pages exactly once.`,
    );
  }

  try {
    const output = await PDFDocument.create();
    const copied = await output.copyPages(
      source,
      order.map((pageNumber) => pageNumber - 1),
    );
    for (const page of copied) output.addPage(page);
    return { ok: true, bytes: await output.save(), pageCount };
  } catch {
    return failure('FAILED', 'The pages could not be reordered. Try again with fewer pages.');
  }
}
