// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Promito Bangla (প্রমিত বাংলা বানানের নিয়ম) rule pack.
 *
 * A Bangla dictionary says "this string is used". The Bangla Academy standard says which of
 * several used strings is the *correct* one for formal writing. Those are different questions,
 * and this pack answers the second one.
 *
 * Safety rule that shapes the whole pack: **a pattern only fires when the dictionary rejects the
 * written form and accepts the proposed one.** Hard-coded corrections fire unconditionally
 * because they are the standard's own examples; everything generative is dictionary-arbitrated,
 * so the pack cannot invent Bengali spellings. Where the dictionary has no opinion, the checker
 * stays silent instead of guessing.
 *
 * Unicode concerns (NFC, nukta, kar-sign ordering, ZWJ/ZWNJ) are handled by the normalization
 * module and by the engine's ICONV table, not here.
 */

export interface PromitoCorrection {
  replacement: string;
  ruleId: string;
  message: string;
}

export interface PromitoContext {
  /** True when the Bangla dictionary accepts this exact spelling. */
  accepted: (word: string) => boolean;
}

/**
 * Failures the standard names explicitly. These are the cases a dictionary is least likely to
 * help with, because both spellings circulate widely.
 */
const PROMITO_EXACT: ReadonlyArray<[written: string, correct: string]> = [
  // The -রী / -রি group. Genuine dictionary spellings, ignored by the generative rule below
  // because some dictionaries list the non-standard form too.
  ['তৈরী', 'তৈরি'],
  ['জানুয়ারী', 'জানুয়ারি'],
  ['ইংরেজী', 'ইংরেজি'],
  ['শ্রদ্ধাঞ্জলী', 'শ্রদ্ধাঞ্জলি'],
  ['বাঙ্গালী', 'বাঙালি'],
  ['বাঙ্গালা', 'বাংলা'],
  // Orthography the standard names directly.
  ['সার্বজনীন', 'সর্বজনীন'],
  ['পোষাক', 'পোশাক'],
  ['উজ্জল', 'উজ্জ্বল'],
  ['সুষ্ঠ', 'সুষ্ঠু'],
  ['সম্পুর্ণ', 'সম্পূর্ণ'],
  ['নূন্যতম', 'ন্যূনতম'],
  ['দারিদ্রতা', 'দারিদ্র্য'],
  ['অত্যাধিক', 'অত্যধিক'],
  ['পুনরূত্থান', 'পুনরুত্থান'],
  // Archaic forms that still appear in print; the standard prefers the modern one.
  ['কিম্বা', 'কিংবা'],
  ['হইতে', 'হতে'],
  ['ভবিষ্যত', 'ভবিষ্যৎ'],
];

/** Corrections that are also useful for users to see described by the standard. */
const EXACT = new Map<string, string>(PROMITO_EXACT.filter(([written, correct]) => written !== correct));

const VIRAMA = '\u09CD';
const CONSONANT = /^[\u0995-\u09B9]$/u;

/**
 * Check one word against the Promito Bangla standard.
 *
 * Returns the correction to offer, or `undefined` when the standard has nothing to say.
 */
export function checkPromito(word: string, context: PromitoContext): PromitoCorrection | undefined {
  const exact = EXACT.get(word);
  if (exact !== undefined) {
    return {
      replacement: exact,
      ruleId: 'promito/exact',
      message: `"${word}" is not the Promito Bangla spelling. The Bangla Academy standard writes it "${exact}".`,
    };
  }

  // The adjective ending -রী is -রি in the standard. Only fires when the dictionary knows the
  // corrected form and does not know the written one.
  if (word.endsWith('\u09B0\u09C0') && word.length > 3) {
    const candidate = `${word.slice(0, -2)}\u09B0\u09BF`;
    if (!context.accepted(word) && context.accepted(candidate)) {
      return {
        replacement: candidate,
        ruleId: 'promito/ri-ending',
        message: `The word ending -রী is written -রি in Promito Bangla: "${candidate}".`,
      };
    }
  }

  // সঙ্ক- is সংক- in the standard: সঙ্কট -> সংকট, সঙ্কলন -> সংকলন, সঙ্কেত -> সংকেত.
  if (word.startsWith('\u09B8\u09A8\u09CD\u0995') && word.length > 5) {
    const candidate = `\u09B8\u0982\u0995${word.slice(4)}`;
    if (!context.accepted(word) && context.accepted(candidate)) {
      return {
        replacement: candidate,
        ruleId: 'promito/sank',
        message: `Promito Bangla writes সংক, not সঙ্ক: "${candidate}".`,
      };
    }
  }

  // Old-style doubled consonants: কর্ম্ম -> কর্ম, সর্ব্ব -> সর্ব, ধর্ম্ম -> ধর্ম.
  for (let index = 0; index + 2 < word.length; index += 1) {
    const first = word[index] ?? '';
    if (!CONSONANT.test(first)) continue;
    if (word[index + 1] !== VIRAMA) continue;
    if (word[index + 2] !== first) continue;
    const candidate = word.slice(0, index) + first + word.slice(index + 3);
    if (candidate !== word && !context.accepted(word) && context.accepted(candidate)) {
      return {
        replacement: candidate,
        ruleId: 'promito/geminate',
        message: `Promito Bangla does not double this consonant: "${candidate}".`,
      };
    }
  }

  // ো/ৌ written as two code points, and other canonical-order problems, are reported by the
  // normalization module so the user gets one issue per problem, not two.
  return undefined;
}

/** Count of explicit, unconditional corrections, exposed for the settings UI. */
export const promitoExactCount = EXACT.size;
