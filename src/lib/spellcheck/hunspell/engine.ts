// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The Hunspell-compatible checker.
 *
 * Design notes that matter for correctness:
 *
 * - **Affix checking, not affix expansion.** A dictionary is stored as stems plus affix rules and
 *   a candidate word is matched by stripping known affixes. Expanding every stem into every
 *   inflected form up front costs tens of megabytes on a phone; stripping costs a few string
 *   operations per word.
 * - **Single-character interned flags.** `FlagCodec` turns each flag into one private-use code
 *   unit, so a word entry's flags are a short string rather than an array.
 * - **Bounded suggestion search.** Suggestions use Damerau-Levenshtein against length-bucketed
 *   stems and then re-inflect the nearest stems, which finds `writing` for `writting` without
 *   scanning every possible inflected form of the dictionary.
 *
 * Known limitation, stated in the docs: two-level affix chains driven by continuation classes
 * inside a single word (Hunspell's `continuation` flags) and compound rules are implemented for
 * the common cross-product case only. The bundled dictionaries' everyday vocabulary does not
 * depend on them, and numbers (the main compound users) are excluded by the number filter.
 */

import { comparisonForm, dictionaryForm } from '../unicode.ts';
import type { AffixFile, AffixRule } from '../types.ts';
import { compileCondition } from './aff.ts';
import type { FlagCodec } from './aff.ts';
import { caseVariants } from './case.ts';
import { MAX_SUGGESTIONS, Suggester, type SuggestionCandidate } from './suggester.ts';

export type { SuggestionCandidate };

interface RuleMatcher {
  rule: AffixRule;
  condition: RegExp | null;
}

export interface DictionarySource {
  id: string;
  affix: AffixFile;
  codec: FlagCodec;
  words: Map<string, string>;
}

const MAX_FORMS_PER_STEM = 40;

export class HunspellEngine {
  readonly id: string;
  private readonly affix: AffixFile;
  private readonly codec: FlagCodec;
  private readonly words: Map<string, string>;
  private readonly stems: string[];
  private readonly byLength = new Map<number, number[]>();
  private readonly suffixByLastChar = new Map<string, RuleMatcher[]>();
  private readonly prefixByFirstChar = new Map<string, RuleMatcher[]>();
  private readonly suffixRules: RuleMatcher[];
  private readonly prefixRules: RuleMatcher[];
  private readonly suggester: Suggester;

  constructor(source: DictionarySource) {
    this.id = source.id;
    this.affix = source.affix;
    this.codec = source.codec;
    this.words = source.words;
    this.stems = [...source.words.keys()];
    this.stems.forEach((stem, index) => {
      const bucket = this.byLength.get(stem.length);
      if (bucket === undefined) this.byLength.set(stem.length, [index]);
      else bucket.push(index);
    });

    this.suffixRules = this.affix.suffixes
      .filter((rule) => rule.affix !== '')
      .map((rule) => ({ rule, condition: compileCondition(rule, 'suffix') }));
    this.prefixRules = this.affix.prefixes
      .filter((rule) => rule.affix !== '')
      .map((rule) => ({ rule, condition: compileCondition(rule, 'prefix') }));

    for (const matcher of this.suffixRules) {
      const key = matcher.rule.affix.slice(-1);
      const list = this.suffixByLastChar.get(key);
      if (list === undefined) this.suffixByLastChar.set(key, [matcher]);
      else list.push(matcher);
    }
    for (const matcher of this.prefixRules) {
      const key = matcher.rule.affix.slice(0, 1);
      const list = this.prefixByFirstChar.get(key);
      if (list === undefined) this.prefixByFirstChar.set(key, [matcher]);
      else list.push(matcher);
    }
    this.suggester = new Suggester({
      affix: this.affix,
      stems: this.stems,
      nearStemIndexes: (length) => this.byLength.get(length),
      flagsOf: (stem) => this.words.get(stem) ?? '',
      inflectedForms: (stem, flags) => this.inflectedForms(stem, flags),
      normalise: (raw) => this.normalise(raw),
      present: (value) => this.present(value),
      isAccepted: (value) => this.isAccepted(value),
    });
  }

  /** Ranked replacements for a word the engine rejected. */
  suggest(raw: string, limit = MAX_SUGGESTIONS): SuggestionCandidate[] {
    return this.suggester.suggest(raw, limit);
  }

  get wordCount(): number {
    return this.words.size;
  }

  /** Normalise a token the way this dictionary expects before any comparison. */
  normalise(raw: string): string {
    let value = raw;
    for (const conversion of this.affix.iconv) {
      if (value.includes(conversion.from)) value = value.replaceAll(conversion.from, conversion.to);
    }
    if (this.affix.ignore !== '') {
      const ignore = new Set([...this.affix.ignore]);
      value = [...value].filter((char) => !ignore.has(char)).join('');
    }
    return dictionaryForm(value);
  }

  /** Presentation form for a suggestion. */
  present(value: string): string {
    let result = value;
    for (const conversion of this.affix.oconv) {
      if (result.includes(conversion.from)) result = result.replaceAll(conversion.from, conversion.to);
    }
    return comparisonForm(result);
  }

  /** True when `raw` is an accepted word, trying the usual case variants. */
  isAccepted(raw: string): boolean {
    const normalised = this.normalise(raw);
    if (normalised === '') return false;
    for (const variant of caseVariants(normalised)) {
      if (this.acceptable(variant) === 'accepted') return true;
    }
    return false;
  }

  private acceptable(word: string): 'accepted' | 'keepcase' | 'rejected' {
    const flags = this.words.get(word);
    if (flags !== undefined) {
      return this.flagsAcceptWord(flags);
    }
    if (this.hasAffixedForm(word)) return 'accepted';
    return 'rejected';
  }

  private flagsAcceptWord(flags: string): 'accepted' | 'keepcase' | 'rejected' {
    if (this.hasFlag(flags, this.affix.forbiddenWord)) return 'rejected';
    if (this.hasFlag(flags, this.affix.onlyInCompound)) return 'rejected';
    if (this.hasFlag(flags, this.affix.needAffix)) return 'rejected';
    if (this.hasFlag(flags, this.affix.keepCase)) return 'keepcase';
    return 'accepted';
  }

  private hasFlag(flags: string, flag: string): boolean {
    return flag !== '' && flags !== '' && flags.includes(flag);
  }

  private matchesCondition(matcher: RuleMatcher, stem: string): boolean {
    return matcher.condition === null || matcher.condition.test(stem);
  }

  private hasAffixedForm(word: string): boolean {
    // Suffix only. Indexed by the word's last character, which must equal the affix's last
    // character for the rule to apply at all.
    const suffixes = this.suffixByLastChar.get(word.slice(-1));
    if (suffixes !== undefined) {
      for (const matcher of suffixes) {
        const { rule } = matcher;
        if (!word.endsWith(rule.affix)) continue;
        if (word.length <= rule.affix.length) continue;
        const stem = word.slice(0, word.length - rule.affix.length) + rule.strip;
        const flags = this.words.get(stem);
        if (flags === undefined) continue;
        if (!this.hasFlag(flags, rule.flag)) continue;
        if (this.hasFlag(flags, this.affix.forbiddenWord)) continue;
        if (this.hasFlag(flags, this.affix.onlyInCompound)) continue;
        if (!this.matchesCondition(matcher, stem)) continue;
        return true;
      }
    }

    // Prefix only.
    const prefixes = this.prefixByFirstChar.get(word.slice(0, 1));
    if (prefixes !== undefined) {
      for (const matcher of prefixes) {
        const { rule } = matcher;
        if (!word.startsWith(rule.affix)) continue;
        if (word.length <= rule.affix.length) continue;
        const stem = rule.strip + word.slice(rule.affix.length);
        const flags = this.words.get(stem);
        if (flags === undefined) continue;
        if (!this.hasFlag(flags, rule.flag)) continue;
        if (this.hasFlag(flags, this.affix.forbiddenWord)) continue;
        if (this.hasFlag(flags, this.affix.onlyInCompound)) continue;
        if (!this.matchesCondition(matcher, stem)) continue;
        return true;
      }
    }

    // Prefix + suffix with the cross-product permission on both rules.
    if (prefixes !== undefined && word.length > 3) {
      for (const prefixMatcher of prefixes) {
        const prefix = prefixMatcher.rule;
        if (!prefix.crossProduct) continue;
        if (!word.startsWith(prefix.affix)) continue;
        const afterPrefix = prefix.strip + word.slice(prefix.affix.length);
        if (afterPrefix.length <= 1) continue;
        const suffixList = this.suffixByLastChar.get(afterPrefix.slice(-1));
        if (suffixList === undefined) continue;
        for (const suffixMatcher of suffixList) {
          const suffix = suffixMatcher.rule;
          if (!suffix.crossProduct) continue;
          if (!afterPrefix.endsWith(suffix.affix)) continue;
          if (afterPrefix.length <= suffix.affix.length) continue;
          const stem = afterPrefix.slice(0, afterPrefix.length - suffix.affix.length) + suffix.strip;
          const flags = this.words.get(stem);
          if (flags === undefined) continue;
          if (!this.hasFlag(flags, prefix.flag) || !this.hasFlag(flags, suffix.flag)) continue;
          if (this.hasFlag(flags, this.affix.forbiddenWord)) continue;
          if (this.hasFlag(flags, this.affix.onlyInCompound)) continue;
          if (!this.matchesCondition(prefixMatcher, stem)) continue;
          if (!this.matchesCondition(suffixMatcher, stem)) continue;
          return true;
        }
      }
    }

    return false;
  }

  /**
  /** Surface forms of a stem, limited so one odd word cannot dominate a scan. */
  private inflectedForms(stem: string, flags: string): string[] {
    const forms: string[] = [];
    if (flags === '') return forms;
    for (const matcher of this.suffixRules) {
      if (forms.length >= MAX_FORMS_PER_STEM) break;
      const { rule } = matcher;
      if (!this.hasFlag(flags, rule.flag)) continue;
      if (!this.matchesCondition(matcher, stem)) continue;
      if (!stem.endsWith(rule.strip)) continue;
      forms.push(stem.slice(0, stem.length - rule.strip.length) + rule.affix);
    }
    for (const matcher of this.prefixRules) {
      if (forms.length >= MAX_FORMS_PER_STEM) break;
      const { rule } = matcher;
      if (!this.hasFlag(flags, rule.flag)) continue;
      if (!this.matchesCondition(matcher, stem)) continue;
      if (!stem.startsWith(rule.strip)) continue;
      forms.push(rule.affix + stem.slice(rule.strip.length));
    }
    return forms;
  }
}

