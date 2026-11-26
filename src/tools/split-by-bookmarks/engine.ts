// SPDX-License-Identifier: AGPL-3.0-or-later
// Splits a PDF at its top-level bookmarks. Only outline entries that point straight at a page
// are used; nested levels and named destinations are skipped and counted.

import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFString,
} from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export const MAX_SECTIONS = 100;

export interface Bookmark {
  title: string;
  page: number;
}

export interface SplitInput {
  name: string;
  bytes: Uint8Array;
}

export interface SectionFile {
  name: string;
  bytes: Uint8Array;
}

export type SplitErrorCode =
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'NO_BOOKMARKS'
  | 'TOO_FEW'
  | 'TOO_MANY'
  | 'FAILED';

export type BookmarksResult =
  | { ok: true; bookmarks: Bookmark[]; pages: number; skipped: number }
  | { ok: false; code: SplitErrorCode; message: string };

export type SplitResult =
  | { ok: true; files: SectionFile[]; sections: number; skipped: number }
  | { ok: false; code: SplitErrorCode; message: string };

export function safeTitle(title: string): string {
  const cleaned = title
    .replace(/[^\w.\- ]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[-\s]+|[-\s]+$/g, '')
    .slice(0, 40)
    .trim();
  return cleaned === '' ? 'Section' : cleaned;
}

export function sectionFileName(pdfName: string, index: number, title: string): string {
  const base = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' ? 'document' : base}-${String(index).padStart(2, '0')}-${safeTitle(title)}.pdf`;
}

function failure<T extends SplitErrorCode>(code: T, message: string) {
  return { ok: false as const, code, message };
}

function titleOf(dict: PDFDict): string {
  const raw = dict.get(PDFName.of('Title'));
  if (raw instanceof PDFString || raw instanceof PDFHexString) {
    try {
      return raw.decodeText().trim();
    } catch {
      return '';
    }
  }
  return '';
}

function destArray(dict: PDFDict, pdf: PDFDocument): PDFArray | null {
  let raw = dict.get(PDFName.of('Dest'));
  if (!raw) {
    const action = dict.get(PDFName.of('A'));
    if (action instanceof PDFRef) {
      const resolved = pdf.context.lookup(action);
      if (resolved instanceof PDFDict) raw = resolved.get(PDFName.of('D'));
    } else if (action instanceof PDFDict) {
      raw = action.get(PDFName.of('D'));
    }
  }
  if (!raw) return null;
  const resolved = pdf.context.lookup(raw);
  return resolved instanceof PDFArray ? resolved : null;
}

function pageFor(dest: PDFArray, pages: { ref: PDFRef }[], pdf: PDFDocument): number | null {
  const first = dest.get(0);
  const value = first instanceof PDFRef ? first : pdf.context.lookup(first);
  if (value instanceof PDFRef) {
    const index = pages.findIndex((page) => page.ref === value);
    return index >= 0 ? index + 1 : null;
  }
  if (first instanceof PDFNumber) {
    const number = first.asNumber();
    if (number >= 0 && number < pages.length) return number + 1;
  }
  return null;
}

async function open(input: SplitInput) {
  if (!looksLikePdf(input.bytes)) return failure('NOT_PDF', `"${input.name}" is not a PDF file.`);
  try {
    return {
      ok: true as const,
      pdf: await PDFDocument.load(input.bytes, { updateMetadata: false }),
    };
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
      `"${input.name}" could not be read. The file may be damaged; try Repair first.`,
    );
  }
}

function collect(pdf: PDFDocument): { bookmarks: Bookmark[]; skipped: number } {
  const bookmarks: Bookmark[] = [];
  let skipped = 0;
  const pages = pdf.getPages().map((page) => ({ ref: page.ref }));

  const outlinesRaw = pdf.catalog.get(PDFName.of('Outlines'));
  if (!outlinesRaw) return { bookmarks, skipped };
  const outlines = pdf.context.lookup(outlinesRaw);
  if (!(outlines instanceof PDFDict)) return { bookmarks, skipped };

  let current: unknown = outlines.get(PDFName.of('First'));
  let guard = 0;
  while (current && guard < 500) {
    guard += 1;
    const dict = current instanceof PDFRef ? pdf.context.lookup(current) : current;
    if (!(dict instanceof PDFDict)) break;
    const title = titleOf(dict);
    const dest = destArray(dict, pdf);
    const page = dest ? pageFor(dest, pages, pdf) : null;
    if (title !== '' && page !== null) bookmarks.push({ title, page });
    else skipped += 1;
    current = dict.get(PDFName.of('Next'));
  }
  return { bookmarks, skipped };
}

export async function readBookmarks(input: SplitInput): Promise<BookmarksResult> {
  const opened = await open(input);
  if (!opened.ok) return opened;
  const { pdf } = opened;
  const { bookmarks, skipped } = collect(pdf);
  if (bookmarks.length === 0) {
    return failure(
      'NO_BOOKMARKS',
      'This PDF has no top-level bookmarks that point at a page, so there is nothing to split on.',
    );
  }
  return { ok: true, bookmarks, pages: pdf.getPageCount(), skipped };
}

export async function splitByBookmarks(input: SplitInput): Promise<SplitResult> {
  const opened = await open(input);
  if (!opened.ok) return opened;
  const { pdf } = opened;
  const { bookmarks, skipped } = collect(pdf);
  const pageCount = pdf.getPageCount();

  if (bookmarks.length === 0) {
    return failure(
      'NO_BOOKMARKS',
      'This PDF has no top-level bookmarks that point at a page, so there is nothing to split on.',
    );
  }

  // Keep the first bookmark per starting page, then order sections by page.
  const seen = new Set<number>();
  const starts = bookmarks
    .slice()
    .sort((a, b) => a.page - b.page)
    .filter((bookmark) => {
      if (seen.has(bookmark.page)) return false;
      seen.add(bookmark.page);
      return true;
    });

  if (starts.length < 2) {
    return failure(
      'TOO_FEW',
      'This PDF has only one usable bookmark, so splitting would produce a single file. Use Split PDF instead.',
    );
  }
  if (starts.length > MAX_SECTIONS) {
    return failure(
      'TOO_MANY',
      `This PDF has ${starts.length} sections. This tool stops at ${MAX_SECTIONS}.`,
    );
  }

  const ranges: { title: string; start: number; end: number }[] = [];
  if (starts[0]!.page > 1) {
    ranges.push({ title: 'Front matter', start: 1, end: starts[0]!.page - 1 });
  }
  for (const [index, bookmark] of starts.entries()) {
    const next = starts[index + 1];
    ranges.push({
      title: bookmark.title,
      start: bookmark.page,
      end: next ? next.page - 1 : pageCount,
    });
  }

  const files: SectionFile[] = [];
  try {
    for (const [index, range] of ranges.entries()) {
      const output = await PDFDocument.create();
      const indices = Array.from({ length: range.end - range.start + 1 }, (_, offset) => range.start - 1 + offset);
      const copied = await output.copyPages(pdf, indices);
      for (const page of copied) output.addPage(page);
      files.push({
        name: sectionFileName(input.name, index + 1, range.title),
        bytes: await output.save(),
      });
    }
    return { ok: true, files, sections: files.length, skipped };
  } catch {
    return failure('FAILED', 'The sections could not be written. Try again with a smaller document.');
  }
}
