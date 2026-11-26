// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Ranked spelling suggestions.
 *
 * Kept apart from acceptance so the acceptance hot path (every word on every check) stays small.
 * The order of passes is the order of trust: a dictionary REP rule beats a one-edit typo, which
 * beats a two-edit typo. The stem scan is bounded by length bucket and edit distance so a wrong
 * word cannot make the UI crawl.
 */

import type { AffixFile } from '../types.ts';
import { applyCase, capitalise } from './case.ts';

export interface SuggestionCandidate {
  value: string;
  reason: string;
  distance: number;
  order: number;
}

export interface SuggestSource {
  affix: AffixFile;
  stems: string[];
  /** Indexes of stems with this exact length, or undefined when the bucket is empty. */
  nearStemIndexes: (length: number) => number[] | undefined;
  flagsOf: (stem: string) => string;
  /** Surface forms this dictionary allows for a stem, already bounded by the caller. */
  inflectedForms: (stem: string, flags: string) => string[];
  normalise: (raw: string) => string;
  present: (value: string) => string;
  isAccepted: (value: string) => boolean;
}

export const MAX_SUGGESTIONS = 8;
const MAX_NEAR_STEMS = 400;
const MAX_FORMS_PER_STEM = 40;

export class Suggester {
  private readonly source: SuggestSource;

  constructor(source: SuggestSource) {
    this.source = source;
  }

  suggest(raw: string, limit = MAX_SUGGESTIONS): SuggestionCandidate[] {
    const word = this.source.normalise(raw);
    if (word === '') return [];
    const found = new Map<string, SuggestionCandidate>();
    const lower = word.toLocaleLowerCase();

    const add = (value: string, reason: string, distance: number): void => {
      if (value === '' || value === word) return;
      const key = value.toLocaleLowerCase();
      const existing = found.get(key);
      if (existing !== undefined) {
        if (distance < existing.distance) {
          existing.distance = distance;
          existing.reason = reason;
        }
        return;
      }
      if (!this.source.isAccepted(value)) return;
      found.set(key, { value, reason, distance, order: found.size });
    };

    // 1. Dictionary replacement pairs, e.g. `shun` -> `tion`.
    for (const replacement of this.source.affix.replacements) {
      if (!word.includes(replacement.from)) continue;
      add(word.replace(replacement.from, replacement.to), 'common typing error', 0.4);
    }

    // 2. Equivalent character groups from MAP.
    for (const group of this.source.affix.maps) {
      for (const char of word) {
        if (!group.includes(char)) continue;
        for (const alternative of group) {
          if (alternative === char) continue;
          add(word.replace(char, alternative), 'similar letter', 0.6);
        }
      }
    }

    // 3. Capitalisation-only fixes (`tehran` -> `Tehran`, `PARIS` -> `Paris`).
    const capitalised = capitalise(word);
    if (capitalised !== word) add(capitalised, 'capitalisation', 0.2);
    if (lower !== word) add(lower, 'capitalisation', 0.3);

    // 4. Bounded edit-distance search over stems, then re-inflect the nearest ones.
    const threshold = word.length <= 4 ? 1 : 2;
    const nearStems: Array<{ stem: string; distance: number; index: number }> = [];
    for (let length = word.length - threshold; length <= word.length + threshold; length += 1) {
      const bucket = this.source.nearStemIndexes(length);
      if (bucket === undefined) continue;
      for (const index of bucket) {
        const stem = this.source.stems[index] ?? '';
        const distance = damerauLevenshtein(lower, stem.toLocaleLowerCase(), threshold);
        if (distance > threshold) continue;
        nearStems.push({ stem, distance, index });
        if (nearStems.length > MAX_NEAR_STEMS) break;
      }
      if (nearStems.length > MAX_NEAR_STEMS) break;
    }
    nearStems.sort((a, b) => a.distance - b.distance || a.index - b.index);

    for (const near of nearStems.slice(0, 80)) {
      add(near.stem, this.caseReason(word, near.stem), near.distance);
      const flags = this.source.flagsOf(near.stem);
      for (const form of this.source.inflectedForms(near.stem, flags)) {
        const distance = damerauLevenshtein(lower, form.toLocaleLowerCase(), threshold);
        if (distance <= threshold) add(form, this.caseReason(word, form), distance + 0.1);
      }
    }

    return [...found.values()]
      .sort((a, b) => a.distance - b.distance || a.order - b.order)
      .slice(0, limit)
      .map((candidate) => ({
        ...candidate,
        value: this.source.present(applyCase(word, candidate.value)),
      }));
  }

  private caseReason(original: string, candidate: string): string {
    if (original.toLocaleLowerCase() === candidate.toLocaleLowerCase() && original !== candidate) {
      return 'capitalisation';
    }
    return 'spelling';
  }
}

/**
 * Optimal string alignment distance with an upper bound.
 *
 * Returns `max + 1` as soon as the bound is exceeded, which is what keeps a scan over 90k stems
 * in single-digit milliseconds.
 */
export function damerauLevenshtein(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const previous: number[] = new Array(b.length + 1);
  const current: number[] = new Array(b.length + 1);
  const beforePrevious: number[] = new Array(b.length + 1);
  for (let column = 0; column <= b.length; column += 1) {
    previous[column] = column;
    beforePrevious[column] = 0;
  }
  for (let row = 1; row <= a.length; row += 1) {
    current[0] = row;
    let rowBest = current[0];
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      let value = Math.min(
        (previous[column] ?? 0) + 1,
        (current[column - 1] ?? 0) + 1,
        (previous[column - 1] ?? 0) + cost,
      );
      if (row > 1 && column > 1 && a[row - 1] === b[column - 2] && a[row - 2] === b[column - 1]) {
        value = Math.min(value, (beforePrevious[column - 2] ?? 0) + 1);
      }
      current[column] = value;
      if (value < rowBest) rowBest = value;
    }
    if (rowBest > max) return max + 1;
    for (let column = 0; column <= b.length; column += 1) {
      beforePrevious[column] = previous[column] ?? 0;
      previous[column] = current[column] ?? 0;
    }
  }
  return previous[b.length] ?? max + 1;
}
