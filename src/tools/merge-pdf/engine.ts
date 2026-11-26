// SPDX-License-Identifier: AGPL-3.0-or-later
// Merges several PDFs into one. Pure pdf-lib, no DOM: pages are copied, not re-rendered.

import { PDFDocument } from 'pdf-lib';

export interface MergeInput {
  name: string;
  bytes: Uint8Array;
}

export type MergeErrorCode =
  | 'EMPTY'
  | 'TOO_MANY_FILES'
  | 'TOO_LARGE'
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'FAILED';

export type MergeResult =
  | { ok: true; bytes: Uint8Array; pageCount: number }
  | { ok: false; code: MergeErrorCode; message: string };

/** Limits are stated in the UI; change both together. */
export const MAX_FILES = 50;
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024;

function failure(code: MergeErrorCode, message: string): MergeResult {
  return { ok: false, code, message };
}

function isPdf(bytes: Uint8Array): boolean {
  // A PDF must start with %PDF- within the first 1024 bytes; most start at byte 0.
  const window = bytes.subarray(0, 1024);
  for (let index = 0; index <= window.length - 5; index += 1) {
    if (
      window[index] === 0x25 &&
      window[index + 1] === 0x50 &&
      window[index + 2] === 0x44 &&
      window[index + 3] === 0x46 &&
      window[index + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

export async function mergePdfs(files: MergeInput[]): Promise<MergeResult> {
  if (files.length === 0) {
    return failure('EMPTY', 'Choose at least two PDFs to merge.');
  }
  if (files.length > MAX_FILES) {
    return failure(
      'TOO_MANY_FILES',
      `That is ${files.length} files. This tool stops at ${MAX_FILES} in one merge.`,
    );
  }
  const total = files.reduce((sum, file) => sum + file.bytes.length, 0);
  if (total > MAX_TOTAL_BYTES) {
    return failure(
      'TOO_LARGE',
      `The files add up to more than ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)} MB. Merge them in two groups.`,
    );
  }

  const merged = await PDFDocument.create();
  let pageCount = 0;

  for (const file of files) {
    if (!isPdf(file.bytes)) {
      return failure('NOT_PDF', `"${file.name}" is not a PDF file.`);
    }

    let source;
    try {
      source = await PDFDocument.load(file.bytes, { updateMetadata: false });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      if (/encrypt|password/i.test(message)) {
        return failure(
          'ENCRYPTED',
          `"${file.name}" is password protected. Remove the password first, then merge it.`,
        );
      }
      return failure(
        'CORRUPT',
        `"${file.name}" could not be read. The file may be damaged or incomplete.`,
      );
    }

    try {
      const pages = await merged.copyPages(source, source.getPageIndices());
      for (const page of pages) merged.addPage(page);
      pageCount += pages.length;
    } catch {
      return failure('CORRUPT', `"${file.name}" has pages that could not be copied.`);
    }
  }

  try {
    const bytes = await merged.save();
    return { ok: true, bytes, pageCount };
  } catch {
    return failure('FAILED', 'The merged PDF could not be written. Try fewer files.');
  }
}
