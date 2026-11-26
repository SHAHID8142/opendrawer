// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Unicode handling for the checker.
 *
 * Two different normal forms are needed and mixing them up is the classic complex-script bug:
 *
 * 1. **Comparison form** — Unicode NFC. Used to decide whether two strings are the same word.
 * 2. **Dictionary form** — NFC, then the three Bengali nukta letters are composed back into
 *    their precomposed code points (U+09DC, U+09DD, U+09DF). NFC decomposes them because they
 *    are in Unicode's composition-exclusion list, while the bundled bn_BD Hunspell dictionary
 *    stores them precomposed. Composing here is what makes an NFC-normalised document match the
 *    dictionary at all. The dictionary's own ICONV table is applied later by the engine and is
 *    idempotent with this.
 *
 * Offsets are never normalised. Analysis always runs on the original text and carries absolute
 * offsets, so a fix never lands in the wrong place when a normalised form changes length.
 */

const BENGALI_RANGE = /[\u0980-\u09FF]/;
const BENGALI_LETTER = /[\u0985-\u09B9\u09CE\u09DC-\u09DF\u09F0-\u09F1]/;

/** Nukta compositions that NFC undoes but the Bengali dictionary expects. */
const BENGALI_NUKTA_COMPOSE: ReadonlyArray<readonly [string, string]> = [
  ['\u09AF\u09BC', '\u09DF'], // ya + nukta -> yya
  ['\u09A1\u09BC', '\u09DC'], // dda + nukta -> rra
  ['\u09A2\u09BC', '\u09DD'], // dha + nukta -> rha
];

/** Kar signs whose canonical form is a single two-part vowel code point. */
const KAR_COMPOSE: ReadonlyArray<{ sequence: string; composed: string; name: string }> = [
  { sequence: '\u09C7\u09BE', composed: '\u09CB', name: 'ো' },
  { sequence: '\u09C7\u09D7', composed: '\u09CC', name: 'ৌ' },
];

export function hasBengali(text: string): boolean {
  return BENGALI_RANGE.test(text);
}

export function isBengaliLetter(char: string): boolean {
  return BENGALI_LETTER.test(char);
}

/** Unicode comparison form. */
export function comparisonForm(text: string): string {
  return text.normalize('NFC');
}

/** Form the bundled Hunspell dictionaries index. */
export function dictionaryForm(text: string): string {
  let result = text.normalize('NFC');
  for (const [decomposed, composed] of BENGALI_NUKTA_COMPOSE) {
    result = result.replaceAll(decomposed, composed);
  }
  return result;
}

/** True when NFC changes the string, ignoring the Bengali nukta exclusions. */
export function isNotNfc(text: string): boolean {
  return text.normalize('NFC') !== text;
}

export interface TextProblem {
  from: number;
  to: number;
  message: string;
  replacement: string;
}

/**
 * Kar-sign ordering mistakes, e.g. `ে` followed by `া` instead of the single `ো`.
 *
 * Both spellings render identically in most fonts, which is exactly why this goes unnoticed and
 * why search and comparison then fail on the "same" text.
 */
export function findKarSignProblems(text: string): TextProblem[] {
  const problems: TextProblem[] = [];
  for (const { sequence, composed, name } of KAR_COMPOSE) {
    let index = text.indexOf(sequence);
    while (index !== -1) {
      problems.push({
        from: index,
        to: index + sequence.length,
        message: `The vowel sign ${name} is written as two code points. Use the single character so the text is consistent and searchable.`,
        replacement: composed,
      });
      index = text.indexOf(sequence, index + sequence.length);
    }
  }
  return problems;
}

/**
 * Invisible characters. A zero-width joiner is almost never wanted in prose; a zero-width
 * non-joiner is legitimate directly after a virama, where it suppresses a conjunct.
 */
export function findInvisibleCharacterProblems(text: string): TextProblem[] {
  const problems: TextProblem[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\u200D') {
      problems.push({
        from: index,
        to: index + 1,
        message: 'A zero-width joiner is hidden in this text. It can break search and copy without showing anything.',
        replacement: '',
      });
      continue;
    }
    if (char === '\u200C') {
      const previous = text[index - 1];
      if (previous !== '\u09CD') {
        problems.push({
          from: index,
          to: index + 1,
          message: 'A zero-width non-joiner is hidden in this text. It is only needed directly after a virama.',
          replacement: '',
        });
      }
    }
  }
  return problems;
}

/** Capitalisation pattern of a word, used to keep suggestions looking like the original. */
export type CasePattern = 'lower' | 'upper' | 'title' | 'mixed';

export function casePattern(word: string): CasePattern {
  const upper = word.toLocaleUpperCase();
  const lower = word.toLocaleLowerCase();
  if (word === upper && word !== lower) return 'upper';
  if (word === lower) return 'lower';
  const firstUpper = word[0] === word[0]?.toLocaleUpperCase() && word.slice(1) === word.slice(1).toLocaleLowerCase();
  if (firstUpper) return 'title';
  return 'mixed';
}

/**
 * Apply the original word's capitalisation to a replacement.
 *
 * `Tehran` typed as `Tehram` should suggest `Tehran`, not `tehran`, and an all-caps heading
 * should stay all-caps.
 */
export function applyCasePattern(original: string, replacement: string): string {
  const pattern = casePattern(original);
  if (pattern === 'upper') return replacement.toLocaleUpperCase();
  if (pattern === 'title') {
    return replacement.charAt(0).toLocaleUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** Words that are entirely upper case and longer than one letter are usually acronyms. */
export function isAcronym(word: string): boolean {
  if (word.length < 2) return false;
  if (!/^\p{Lu}+$/u.test(word)) return false;
  return true;
}

/** `parseJSONResponse` style identifiers: camelCase, PascalCase or snake_case. */
export function isIdentifier(word: string): boolean {
  if (/^[a-z]+[A-Z]/.test(word)) return true;
  if (/^[A-Z][a-z]+[A-Z]/.test(word)) return true;
  if (/^\w+_\w+/.test(word)) return true;
  if (/^\w+-\w+-\w+/.test(word)) return true;
  return false;
}
