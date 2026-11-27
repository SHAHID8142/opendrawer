// SPDX-License-Identifier: AGPL-3.0-or-later
// Line diff for the text-diff tool. Pure, bounded and dependency-free.

export type DiffKind = 'equal' | 'added' | 'removed';

export interface DiffOptions {
  ignoreCase: boolean;
  ignoreTrailingWhitespace: boolean;
}

export interface DiffLine {
  kind: DiffKind;
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface DiffSummary {
  lines: DiffLine[];
  added: number;
  removed: number;
  unchanged: number;
}

export type DiffResult = { ok: true; diff: DiffSummary } | { ok: false; message: string };

/** The matrix is n×m, so both sides are capped to keep a phone responsive. */
export const MAX_LINES = 1000;

function normalise(line: string, options: DiffOptions): string {
  let value = options.ignoreTrailingWhitespace ? line.replace(/\s+$/, '') : line;
  if (options.ignoreCase) value = value.toLocaleLowerCase();
  return value;
}

export function diffLines(left: string, right: string, options: DiffOptions): DiffResult {
  const a = left.split(/\r?\n/);
  const b = right.split(/\r?\n/);
  if (a.length > MAX_LINES || b.length > MAX_LINES) {
    return {
      ok: false,
      message: `Each side is limited to ${MAX_LINES} lines. Split the file and compare the parts.`,
    };
  }
  const normA = a.map((line) => normalise(line, options));
  const normB = b.map((line) => normalise(line, options));
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      table[i * width + j] =
        normA[i - 1] === normB[j - 1]
          ? (table[(i - 1) * width + (j - 1)] ?? 0) + 1
          : Math.max(table[(i - 1) * width + j] ?? 0, table[i * width + (j - 1)] ?? 0);
    }
  }

  const reversed: DiffLine[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    if (normA[i - 1] === normB[j - 1]) {
      reversed.push({ kind: 'equal', text: a[i - 1] ?? '', oldLine: i, newLine: j });
      i -= 1;
      j -= 1;
    } else if ((table[(i - 1) * width + j] ?? 0) > (table[i * width + (j - 1)] ?? 0)) {
      reversed.push({ kind: 'removed', text: a[i - 1] ?? '', oldLine: i, newLine: null });
      i -= 1;
    } else {
      reversed.push({ kind: 'added', text: b[j - 1] ?? '', oldLine: null, newLine: j });
      j -= 1;
    }
  }
  while (i > 0) {
    reversed.push({ kind: 'removed', text: a[i - 1] ?? '', oldLine: i, newLine: null });
    i -= 1;
  }
  while (j > 0) {
    reversed.push({ kind: 'added', text: b[j - 1] ?? '', oldLine: null, newLine: j });
    j -= 1;
  }

  const lines = reversed.reverse();
  return {
    ok: true,
    diff: {
      lines,
      added: lines.filter((line) => line.kind === 'added').length,
      removed: lines.filter((line) => line.kind === 'removed').length,
      unchanged: lines.filter((line) => line.kind === 'equal').length,
    },
  };
}

/** Unified-diff text for the download button; no timestamps, so output is reproducible. */
export function toUnified(diff: DiffSummary, leftLabel = 'before', rightLabel = 'after'): string {
  const body = diff.lines.map((line) => {
    const marker = line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' ';
    return `${marker}${line.text}`;
  });
  return [`--- ${leftLabel}`, `+++ ${rightLabel}`, ...body].join('\n');
}
