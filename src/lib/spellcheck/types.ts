// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Shared vocabulary for the spell checker.
 *
 * Everything in this folder is framework-agnostic: no React, no DOM. It runs in a Worker, in
 * Node (for tests) and in the browser. The UI only consumes these types.
 */

/** What a flag is about. The UI colours and filters by this. */
export type IssueCategory =
  | 'spelling'
  | 'dialect'
  | 'standard'
  | 'confusable'
  | 'mechanical'
  | 'normalization'
  | 'custom';

export type IssueSeverity = 'error' | 'warning' | 'info';

/** A replacement the user can apply. The first entry is the top suggestion. */
export interface Suggestion {
  value: string;
  /** Short human reason, e.g. "Promito Bangla rule" or "common typing error". */
  reason?: string;
}

/** One flagged span of text, positioned absolutely in the document. */
export interface Issue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  /** Stable identifier of the module and rule that produced this issue. */
  ruleId: string;
  /** Absolute character offsets in the analysed document. */
  from: number;
  to: number;
  /** The exact text between `from` and `to`. */
  text: string;
  /** One sentence the user can understand, without jargon. */
  message: string;
  suggestions: Suggestion[];
  /** Paragraph the issue belongs to, so incremental re-checks can replace it. */
  blockId: string;
  /**
   * True when the issue is a valid-in-another-dialect or standard mismatch that the
   * "Standardize entire document" action may rewrite automatically.
   */
  convertible: boolean;
}

/** Language and spelling-standard metadata for one dictionary pack. */
export interface LanguagePack {
  /** BCP-47 tag used as the identifier, e.g. `en-GB`, `bn-BD`. */
  id: string;
  /** Name in English, e.g. "English (United Kingdom)". */
  label: string;
  /** Name in the language itself, e.g. "বাংলা (বাংলাদেশ)". */
  nativeLabel: string;
  /** Script used, for tokeniser decisions and for showing a font hint. */
  script: 'latin' | 'bengali';
  /** Regional variant this pack enforces, when it has one. */
  variant?: 'US' | 'UK' | 'CA' | 'AU' | 'BD' | 'IN';
  /** Where the dictionary files are served from, same origin. */
  basePath: string;
  /** Approximate download size in bytes, shown in the pack manager. */
  bytes: number;
  /** Licence identifier and attribution, shown in the pack manager. */
  licence: { id: string; attribution: string };
  /** Rule packs bundled with this language. */
  rulePacks: string[];
}

/** What the analyzer is allowed to use, derived from user settings. */
export interface EnabledModules {
  spelling: boolean;
  dialect: boolean;
  confusable: boolean;
  mechanical: boolean;
  normalization: boolean;
  custom: boolean;
}

export interface ExclusionSettings {
  urls: boolean;
  emails: boolean;
  filePaths: boolean;
  numbers: boolean;
  acronyms: boolean;
  identifiers: boolean;
  code: boolean;
  markup: boolean;
  /** User-supplied regular expressions, one per line in the UI. */
  customPatterns: string[];
}

export type Strictness = 'minimal' | 'standard' | 'strict' | 'custom';

export type ScanMode = 'realtime' | 'manual';

/** Everything the settings panel edits. Persisted as UI preference, never document text. */
export interface SpellcheckSettings {
  enabled: boolean;
  scanMode: ScanMode;
  /** Global default language pack id. */
  defaultLanguage: string;
  /** Additional languages checked at the same time, for mixed-language documents. */
  secondaryLanguages: string[];
  /**
   * Document standard override. `null` follows the global default. When set, words that are
   * valid in another variant are flagged even though the dictionary accepts them.
   */
  documentStandard: string | null;
  strictness: Strictness;
  modules: EnabledModules;
  exclusions: ExclusionSettings;
  autoCorrect: {
    /** Apply custom rules marked automatic while typing. */
    enabled: boolean;
    /** Apply the top dictionary suggestion automatically (dangerous; off by default). */
    topSuggestion: boolean;
  };
  debounceMs: number;
  visuals: {
    spelling: boolean;
    dialect: boolean;
    standard: boolean;
    confusable: boolean;
    mechanical: boolean;
    normalization: boolean;
    custom: boolean;
    underlineStyle: 'wavy' | 'dotted' | 'solid';
  };
  engine: {
    /** Adapter id: only the local, offline adapter is available in this build. */
    adapter: string;
  };
}

/** A word the user has told us to accept. */
export interface DictionaryEntry {
  word: string;
  /** Lower-cased, language-tagged key for lookups. */
  language: string;
  addedAt?: string;
}

/** Multi-tier accepted words. */
export interface WordLists {
  /** Global personal dictionary, shared by every document. */
  personal: DictionaryEntry[];
  /** Project glossary: brand names and domain terms. */
  glossary: DictionaryEntry[];
}

/** Per-document ignore state. Never persisted. */
export interface DocumentIgnores {
  /** Lower-cased words ignored for this document only. */
  words: Set<string>;
  /** Issue ids the user dismissed once. */
  issues: Set<string>;
}

/** Trigger-to-replacement rule pair. */
export interface CustomRule {
  id: string;
  /** Literal text or a regular expression, depending on `isRegex`. */
  trigger: string;
  replacement: string;
  isRegex: boolean;
  caseSensitive: boolean;
  /** Apply while typing instead of suggesting. */
  automatic: boolean;
}

/** Result of one full or incremental scan. */
export interface ScanResult {
  issues: Issue[];
  /** Number of words actually checked, shown in the status bar. */
  wordCount: number;
  /** Wall-clock time of the scan in milliseconds, shown in the status bar. */
  durationMs: number;
  /** Non-fatal problems, e.g. a dictionary that failed to load. */
  warnings: string[];
}

/** One paragraph or block of the document. Blocks are the unit of incremental checking. */
export interface TextBlock {
  id: string;
  text: string;
  /** Absolute offset of `text[0]` in the document. */
  offset: number;
}

/** A single accepted word with its flags, as stored by the Hunspell engine. */
export interface DictionaryWord {
  flags: string;
  /** True when the word is only valid with an affix (NEEDAFFIX). */
  needsAffix: boolean;
}

/** Parsed `.aff` file. Only the parts the engine implements are modelled. */
export interface AffixFile {
  set: string;
  tryChars: string;
  flagType: 'single' | 'long' | 'num';
  prefixes: AffixRule[];
  suffixes: AffixRule[];
  /** Replacement pairs used to rank suggestions, e.g. `ph` -> `f`. */
  replacements: Array<{ from: string; to: string }>;
  maps: string[][];
  iconv: Array<{ from: string; to: string }>;
  oconv: Array<{ from: string; to: string }>;
  /** Characters removed before lookup (IGNORE). */
  ignore: string;
  wordChars: string;
  compoundMin: number;
  compoundRules: string[];
  onlyInCompound: string;
  needAffix: string;
  forbiddenWord: string;
  noSuggest: string;
  keepCase: string;
  circumfix: string;
}

/** One prefix or suffix rule. */
export interface AffixRule {
  /** Flag that must be present on the dictionary word. */
  flag: string;
  /** True when the rule may be combined with a rule of the opposite type. */
  crossProduct: boolean;
  /** Characters removed from the stem, empty for none. */
  strip: string;
  /** Characters appended. May be empty when the rule only strips. */
  affix: string;
  /** Regex source the stem must match before the rule applies. Empty means "any". */
  condition: string;
  /** Extra flags (continuation classes) that may follow the rule. */
  continuation: string;
}
