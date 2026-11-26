// SPDX-License-Identifier: AGPL-3.0-or-later
// Parses "1-3, 7, 10-12" into page numbers. Shared by page-selection tools so the syntax
// and the error copy cannot drift apart.

export interface PageGroup {
  /** 1-based page numbers, in the order they were written. */
  pages: number[];
  /** The comma-separated piece exactly as typed, used in filenames and messages. */
  label: string;
}

interface RangeSpan {
  start: number;
  end: number;
  label: string;
}

function parseTokens(spec: string): { spans: RangeSpan[]; error: string | null } {
  const trimmed = spec.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'all') return { spans: [], error: null };

  const pieces = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
  if (pieces.length === 0) {
    return { spans: [], error: 'Enter page numbers or ranges separated by commas, such as 1-3, 7.' };
  }

  const spans: RangeSpan[] = [];
  for (const piece of pieces) {
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(piece);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end < 1) return { spans: [], error: 'Page numbers start at 1.' };
      if (start > end) {
        return {
          spans: [],
          error: `The range "${piece}" counts backwards. Write it as ${end}-${start}.`,
        };
      }
      spans.push({ start, end, label: piece });
    } else if (/^\d+$/.test(piece)) {
      const page = Number(piece);
      if (page < 1) return { spans: [], error: 'Page numbers start at 1.' };
      spans.push({ start: page, end: page, label: piece });
    } else {
      return {
        spans: [],
        error: `"${piece}" is not a page or a range. Use numbers and ranges separated by commas, such as 1-3, 7, 10-12.`,
      };
    }
  }
  return { spans, error: null };
}

/** Syntax-only check for live form feedback; it cannot know the page count. */
export function validatePageRangeSyntax(spec: string): string | null {
  return parseTokens(spec).error;
}

function spansToGroups(spans: RangeSpan[], pageCount: number): PageGroup[] {
  return spans.map((span) => {
    if (span.start > pageCount || span.end > pageCount) {
      throw new Error(
        span.start === span.end
          ? `Page ${span.start} does not exist: this document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`
          : `The range "${span.label}" is outside this document: it has ${pageCount} page${pageCount === 1 ? '' : 's'}, numbered 1 to ${pageCount}.`,
      );
    }
    return {
      pages: Array.from({ length: span.end - span.start + 1 }, (_, index) => span.start + index),
      label: span.label,
    };
  });
}

/** One group per comma-separated piece; an empty spec means the whole document. */
export function parsePageGroups(spec: string, pageCount: number): PageGroup[] {
  const { spans, error } = parseTokens(spec);
  if (error) throw new Error(error);
  if (spans.length === 0) {
    return [
      {
        pages: Array.from({ length: pageCount }, (_, index) => index + 1),
        label: 'all',
      },
    ];
  }
  return spansToGroups(spans, pageCount);
}

/** A single ordered, de-duplicated selection; an empty spec means every page. */
export function parsePageSelection(spec: string, pageCount: number): number[] {
  const { spans, error } = parseTokens(spec);
  if (error) throw new Error(error);
  if (spans.length === 0) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages: number[] = [];
  const seen = new Set<number>();
  for (const group of spansToGroups(spans, pageCount)) {
    for (const page of group.pages) {
      if (!seen.has(page)) {
        seen.add(page);
        pages.push(page);
      }
    }
  }
  return pages;
}

/** Explicit page numbers when typed; empty when spec is blank. */
export function parseExplicitPages(spec: string, pageCount: number): number[] {
  if (spec.trim() === '') return [];
  try {
    return parsePageSelection(spec, pageCount);
  } catch {
    return [];
  }
}

/** Toggles a page number inside a comma-separated range string and compacts runs cleanly. */
export function togglePageInRange(spec: string, pageNumber: number, pageCount: number): string {
  const current = new Set(parseExplicitPages(spec, pageCount));
  if (current.has(pageNumber)) current.delete(pageNumber);
  else current.add(pageNumber);

  const sorted = Array.from(current).sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const parts: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const n = sorted[i];
    if (n === end + 1) end = n;
    else {
      parts.push(start === end ? `${start}` : `${start}-${end}`);
      start = n;
      end = n;
    }
  }
  parts.push(start === end ? `${start}` : `${start}-${end}`);
  return parts.join(', ');
}
