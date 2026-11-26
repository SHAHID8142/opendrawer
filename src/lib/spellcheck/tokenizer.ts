// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Tokenising and block splitting.
 *
 * The analyser never re-reads the document character by character in the UI thread: blocks are
 * the unit of incremental checking, and words are the unit of dictionary lookup. Offsets are
 * absolute in the document so an issue can be highlighted and replaced without a second parse.
 */

import { hasBengali } from './unicode.ts';
import type { TextBlock } from './types.ts';

export interface WordToken {
  text: string;
  /** Absolute offset of the first character. */
  start: number;
  /** Absolute offset one past the last character. */
  end: number;
  /** True when the token contains at least one Bengali code point. */
  bengali: boolean;
  /** True when the token contains a digit, which the number filter may skip. */
  hasDigit: boolean;
}

/**
 * A word is a run of letters, combining marks (Bengali vowel signs and viramas live here),
 * invisible format characters (so a joiner stays inside its word) and digits (so `mp3` is one
 * token that the number filter can then reject). Apostrophes are allowed inside a word because
 * `don't` and `it's` are single dictionary entries; hyphens are separators, matching Hunspell.
 */
const WORD_PATTERN = /[\p{L}\p{M}][\p{L}\p{M}\p{N}\u200C\u200D]*(?:['\u2019][\p{L}\p{M}][\p{L}\p{M}\p{N}\u200C\u200D]*)*/gu;

export function tokenizeWords(text: string, offset = 0): WordToken[] {
  const tokens: WordToken[] = [];
  // A fresh regex per call keeps `lastIndex` from leaking between documents.
  const pattern = new RegExp(WORD_PATTERN.source, WORD_PATTERN.flags);
  let match = pattern.exec(text);
  while (match !== null) {
    const value = match[0];
    tokens.push({
      text: value,
      start: offset + match.index,
      end: offset + match.index + value.length,
      bengali: hasBengali(value),
      hasDigit: /\p{N}/u.test(value),
    });
    match = pattern.exec(text);
  }
  return tokens;
}

/**
 * Split a document into blocks for incremental checking.
 *
 * A block is a paragraph: one or more lines, separated by a blank line. Paragraphs are short
 * enough to re-check on every keystroke, and stable enough that typing in one paragraph does not
 * invalidate the others.
 */
export function splitIntoBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const separator = /\n[ \t]*\n+/g;
  let cursor = 0;
  let index = 0;
  let match = separator.exec(text);
  while (match !== null) {
    pushBlock(blocks, text, cursor, match.index, index);
    index += 1;
    cursor = match.index + match[0].length;
    match = separator.exec(text);
  }
  pushBlock(blocks, text, cursor, text.length, index);
  return blocks;
}

function pushBlock(blocks: TextBlock[], text: string, from: number, to: number, index: number): void {
  if (to <= from) return;
  blocks.push({ id: `b${index}`, text: text.slice(from, to), offset: from });
}

/** Cheap content hash used to decide whether a block needs re-checking. */
export function hashBlock(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Sentence-ish segmentation, used by the capitalisation check. */
export function sentenceStarts(text: string): number[] {
  const starts: number[] = [];
  const pattern = /(?:^|[.!?।\u0964]\s+|\n\s*)(?=\S)/g;
  let match = pattern.exec(text);
  while (match !== null) {
    starts.push(match.index + match[0].length);
    match = pattern.exec(text);
  }
  return starts;
}
