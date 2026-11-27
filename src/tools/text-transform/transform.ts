// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure text transforms for the text-transform tool. No DOM, no network, safe in tests.

export type TransformAction =
  | 'sentence'
  | 'title'
  | 'upper'
  | 'lower'
  | 'tidy'
  | 'spaces'
  | 'sort-asc'
  | 'sort-desc'
  | 'unique'
  | 'reverse'
  | 'number';

const SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per',
  'the', 'to', 'via', 'vs',
]);

function capitalise(word: string): string {
  if (word === '') return word;
  return word.charAt(0).toLocaleUpperCase() + word.slice(1);
}

/** Headline-style title case that leaves acronyms and short joining words alone. */
export function titleCase(text: string): string {
  const words = text.split(/(\s+)/);
  const letterIndexes = words
    .map((word, index) => (/[\p{L}]/u.test(word) ? index : -1))
    .filter((index) => index >= 0);
  const first = letterIndexes[0];
  const last = letterIndexes[letterIndexes.length - 1];
  return words
    .map((word, index) => {
      if (!/[\p{L}]/u.test(word)) return word;
      if (word.length > 1 && word === word.toLocaleUpperCase()) return word;
      const lower = word.toLocaleLowerCase();
      if (index !== first && index !== last && SMALL_WORDS.has(lower)) return lower;
      return capitalise(lower);
    })
    .join('');
}

/** Lowercases the text, then capitalises the first letter of each sentence. */
export function sentenceCase(text: string): string {
  let result = text.toLocaleLowerCase();
  result = result.replace(/(^|[.!?]\s+)([\p{L}])/gu, (_match, lead: string, letter: string) =>
    lead + letter.toLocaleUpperCase(),
  );
  return result;
}

/** Trims each line, drops blank edges and collapses three or more newlines. */
export function tidyLines(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Removes runs of spaces and tabs inside each line, leaving indentation alone. */
function squeezeSpaces(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/, ''))
    .join('\n');
}

function linesOf(text: string): string[] {
  return text.split('\n').filter((line) => line !== '');
}

/** Applies one action and returns the new text. */
export function transformText(text: string, action: TransformAction): string {
  switch (action) {
    case 'sentence':
      return sentenceCase(text);
    case 'title':
      return titleCase(text);
    case 'upper':
      return text.toLocaleUpperCase();
    case 'lower':
      return text.toLocaleLowerCase();
    case 'tidy':
      return tidyLines(text);
    case 'spaces':
      return squeezeSpaces(text);
    case 'sort-asc':
      return linesOf(text)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .join('\n');
    case 'sort-desc':
      return linesOf(text)
        .sort((a, b) => b.localeCompare(a, undefined, { sensitivity: 'base' }))
        .join('\n');
    case 'unique': {
      const seen = new Set<string>();
      return linesOf(text)
        .filter((line) => {
          const key = line.trim().toLocaleLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .join('\n');
    }
    case 'reverse':
      return linesOf(text).reverse().join('\n');
    case 'number':
      return linesOf(text)
        .map((line, index) => `${String(index + 1).padStart(3, ' ')}. ${line}`)
        .join('\n');
    default:
      return text;
  }
}

export interface ReplaceResult {
  text: string;
  count: number;
}

/** Literal replace-all. An empty needle changes nothing; case can be ignored on request. */
export function replaceLiteral(
  text: string,
  find: string,
  replacement: string,
  matchCase: boolean,
): ReplaceResult {
  if (find === '') return { text, count: 0 };
  if (matchCase) {
    const count = text.split(find).length - 1;
    return { text: text.split(find).join(replacement), count };
  }
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escaped, 'gi');
  const count = (text.match(pattern) ?? []).length;
  return { text: text.replace(pattern, () => replacement), count };
}

export function textStats(text: string): { characters: number; words: number; lines: number } {
  const trimmed = text.trim();
  return {
    characters: text.length,
    words: trimmed === '' ? 0 : trimmed.split(/\s+/).length,
    lines: trimmed === '' ? 0 : text.split('\n').length,
  };
}
