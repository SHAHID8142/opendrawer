// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Hunspell `.dic` parser.
 *
 * The word list is kept as a `Map<string, string>` of word -> interned flag string. Insertion
 * order is preserved and later used as a crude frequency prior when ranking suggestions, because
 * dictionaries are usually written roughly in order of prominence.
 */

import type { AffixFile } from '../types.ts';
import type { FlagCodec } from './aff.ts';

export interface ParsedDictionary {
  words: Map<string, string>;
  /** Entries whose first line claim did not match reality, for diagnostics only. */
  declaredCount: number;
  parsedCount: number;
}

export function parseDictionary(
  source: string,
  codec: FlagCodec,
  flagType: AffixFile['flagType'],
  flagAliases: string[],
): ParsedDictionary {
  const words = new Map<string, string>();
  const lines = source.split(/\r?\n/);
  let declaredCount = 0;
  let cursor = 0;

  // The first non-empty line is a word count. Files in the wild are often wrong; it is only a
  // hint and never a stop condition.
  while (cursor < lines.length) {
    const candidate = (lines[cursor] ?? '').trim();
    if (candidate === '') {
      cursor += 1;
      continue;
    }
    if (/^\d+$/.test(candidate)) {
      declaredCount = Number(candidate);
      cursor += 1;
    }
    break;
  }

  for (; cursor < lines.length; cursor += 1) {
    const line = lines[cursor] ?? '';
    if (line === '' || line.startsWith('\uFEFF')) continue;
    const entry = parseLine(line);
    if (entry === null) continue;

    let rawFlags = entry.flags;
    // A dictionary may replace flags with an index into the AF alias table.
    if (flagAliases.length > 0 && /^\d+$/.test(rawFlags)) {
      const aliasIndex = Number(rawFlags);
      const alias = flagAliases[aliasIndex - 1];
      if (alias !== undefined) rawFlags = alias;
    }
    const flags = codec.encode(rawFlags, flagType);
    if (flags === '' && words.has(entry.word)) continue;
    if (words.has(entry.word)) {
      // Merge flags when a word appears twice (some converted dictionaries do this).
      const existing = words.get(entry.word) ?? '';
      const merged = existing + flags;
      words.set(entry.word, merged);
      continue;
    }
    words.set(entry.word, flags);
  }

  return { words, declaredCount, parsedCount: words.size };
}

interface LineEntry {
  word: string;
  flags: string;
}

/**
 * Parse one dictionary line.
 *
 * Formats seen in the wild:
 *   `word`
 *   `word/FLAGS`
 *   `word/FLAGS<TAB>po:noun st:...`  (morphological data, ignored)
 *   `word\/with\/slash/FLAGS`        (escaped slash inside the word)
 */
function parseLine(line: string): LineEntry | null {
  let word = line;
  let flags = '';

  const slash = findUnescapedSlash(word);
  if (slash !== -1) {
    const after = word.slice(slash + 1);
    // Everything after the slash up to the first whitespace is the flag field.
    const whitespace = after.search(/\s/u);
    flags = whitespace === -1 ? after : after.slice(0, whitespace);
    word = word.slice(0, slash);
  } else {
    const whitespace = word.search(/\s/u);
    if (whitespace !== -1) word = word.slice(0, whitespace);
  }

  word = word.replaceAll('\\/', '/').trim();
  // A handful of converted dictionaries prefix excluded headwords with '*'. They are not
  // headwords at all, so they are not indexed.
  if (word === '' || word.startsWith('*')) return null;
  return { word, flags };
}

function findUnescapedSlash(value: string): number {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '\\') {
      index += 1;
      continue;
    }
    if (value[index] === '/') return index;
  }
  return -1;
}
