// SPDX-License-Identifier: AGPL-3.0-or-later
// Splits one PDF into several documents. Pages are copied, never re-rendered, so quality
// and selectable text survive the split.

import { PDFDocument } from 'pdf-lib';
import type { PageGroup } from '../../lib/page-range';

export interface SplitInput {
  name: string;
  bytes: Uint8Array;
}

export interface SplitFile {
  name: string;
  bytes: Uint8Array;
}

export type SplitErrorCode =
  | 'EMPTY'
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'PAGE_OUT_OF_RANGE'
  | 'TOO_MANY_PAGES'
  | 'FAILED';

export type SplitResult =
  | { ok: true; files: SplitFile[]; pageCount: number }
  | { ok: false; code: SplitErrorCode; message: string };

/** One split may copy at most this many pages in total; stated in the UI. */
export const MAX_TOTAL_PAGES = 500;

function failure(code: SplitErrorCode, message: string): SplitResult {
  return { ok: false, code, message };
}

function baseName(name: string): string {
  const withoutExtension = name.replace(/\.pdf$/i, '');
  const safe = withoutExtension.replace(/[^\w.\- ]+/g, '_').slice(0, 60).trim();
  return safe === '' ? 'document' : safe;
}

function isPdf(bytes: Uint8Array): boolean {
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

function outputName(name: string, group: PageGroup): string {
  const base = baseName(name);
  if (group.pages.length === 1) {
    return `${base}-page-${String(group.pages[0]).padStart(3, '0')}.pdf`;
  }
  const label = group.label.replace(/\s+/g, '');
  return `${base}-pages-${label}.pdf`;
}

export async function countPdfPages(bytes: Uint8Array): Promise<number | null> {
  try {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    return pdf.getPageCount();
  } catch {
    return null;
  }
}

export async function splitPdf(input: SplitInput, groups: PageGroup[]): Promise<SplitResult> {
  if (groups.length === 0 || groups.every((group) => group.pages.length === 0)) {
    return failure('EMPTY', 'Choose at least one page or range to split.');
  }
  if (!isPdf(input.bytes)) {
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
        `"${input.name}" is password protected. Remove the password first, then split it.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  const totalRequested = groups.reduce((sum, group) => sum + group.pages.length, 0);
  if (totalRequested > MAX_TOTAL_PAGES) {
    return failure(
      'TOO_MANY_PAGES',
      `That selection is ${totalRequested} pages. This tool stops at ${MAX_TOTAL_PAGES} to keep the tab responsive.`,
    );
  }

  const pageCount = source.getPageCount();
  for (const group of groups) {
    for (const page of group.pages) {
      if (page < 1 || page > pageCount) {
        return failure(
          'PAGE_OUT_OF_RANGE',
          `Page ${page} does not exist: this document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`,
        );
      }
    }
  }

  const files: SplitFile[] = [];
  try {
    for (const group of groups) {
      if (group.pages.length === 0) continue;
      const part = await PDFDocument.create();
      const copied = await part.copyPages(
        source,
        group.pages.map((page) => page - 1),
      );
      for (const page of copied) part.addPage(page);
      files.push({ name: outputName(input.name, group), bytes: await part.save() });
    }
  } catch {
    return failure('FAILED', 'The pages could not be copied. Try a smaller selection.');
  }

  return { ok: true, files, pageCount: totalRequested };
}
