// SPDX-License-Identifier: AGPL-3.0-or-later
// Rule-based writing checks that need no model: repetition, spacing, capitalisation, a short
// list of high-confidence confusions, and sentence length. Spelling lives in analyze.ts.

import { tokenizeWords } from '../../lib/spellcheck/tokenizer.ts';

export type IssueCategory = 'spelling' | 'mechanical' | 'confusable' | 'style';
export type IssueSeverity = 'error' | 'warning' | 'info';

export interface RuleIssue {
  ruleId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  from: number;
  to: number;
  text: string;
  message: string;
  replacements: string[];
}

export interface WritingStats {
  words: number;
  characters: number;
  sentences: number;
  readingMinutes: number;
}

const CONFUSABLES: { ruleId: string; pattern: RegExp; replacement: string; message: string }[] = [
  {
    ruleId: 'confusable-should-of',
    pattern: /\bshould of\b/gi,
    replacement: 'should have',
    message: '"Should of" is not standard; write "should have".',
  },
  {
    ruleId: 'confusable-could-of',
    pattern: /\bcould of\b/gi,
    replacement: 'could have',
    message: '"Could of" is not standard; write "could have".',
  },
  {
    ruleId: 'confusable-would-of',
    pattern: /\bwould of\b/gi,
    replacement: 'would have',
    message: '"Would of" is not standard; write "would have".',
  },
  {
    ruleId: 'confusable-alot',
    pattern: /\balot\b/gi,
    replacement: 'a lot',
    message: '"Alot" is two words: "a lot".',
  },
  {
    ruleId: 'confusable-your-welcome',
    pattern: /\byour welcome\b/gi,
    replacement: "you're welcome",
    message: 'This means "you are welcome": "you\'re welcome".',
  },
];

export function mechanicalIssues(text: string): RuleIssue[] {
  const issues: RuleIssue[] = [];

  for (const token of tokenizeWords(text)) {
    if (token.start === 0) continue;
    const previous = tokenizeWords(text.slice(0, token.start)).pop();
    if (!previous) continue;
    if (previous.text.toLowerCase() === token.text.toLowerCase()) {
      issues.push({
        ruleId: 'repeated-word',
        category: 'mechanical',
        severity: 'warning',
        from: previous.start,
        to: token.end,
        text: text.slice(previous.start, token.end),
        message: `"${previous.text}" is repeated.`,
        replacements: [previous.text],
      });
    }
  }

  for (const match of text.matchAll(/ {2,}/g)) {
    const from = match.index ?? 0;
    issues.push({
      ruleId: 'double-space',
      category: 'mechanical',
      severity: 'info',
      from,
      to: from + match[0].length,
      text: match[0],
      message: 'Use a single space.',
      replacements: [' '],
    });
  }

  for (const match of text.matchAll(/[ \t]+([,.;:!?])/g)) {
    const from = match.index ?? 0;
    issues.push({
      ruleId: 'space-before-punctuation',
      category: 'mechanical',
      severity: 'warning',
      from,
      to: from + match[0].length,
      text: match[0],
      message: 'No space before punctuation.',
      replacements: [match[1] ?? ''],
    });
  }

  for (const match of text.matchAll(/(^|[.!?]\s+)([a-z])/g)) {
    const offset = match.index ?? 0;
    const lead = match[1] ?? '';
    const letter = match[2] ?? '';
    const from = offset + lead.length;
    issues.push({
      ruleId: 'sentence-case',
      category: 'mechanical',
      severity: 'info',
      from,
      to: from + 1,
      text: letter,
      message: 'A sentence should start with a capital letter.',
      replacements: [letter.toUpperCase()],
    });
  }

  for (const rule of CONFUSABLES) {
    for (const match of text.matchAll(rule.pattern)) {
      const from = match.index ?? 0;
      issues.push({
        ruleId: rule.ruleId,
        category: 'confusable',
        severity: 'warning',
        from,
        to: from + match[0].length,
        text: match[0],
        message: rule.message,
        replacements: [rule.replacement],
      });
    }
  }

  for (const match of text.matchAll(/[^.!?]+[.!?]?/g)) {
    const sentence = match[0];
    if (sentence.trim().split(/\s+/).filter(Boolean).length <= 35) continue;
    const from = match.index ?? 0;
    issues.push({
      ruleId: 'long-sentence',
      category: 'style',
      severity: 'info',
      from,
      to: from + sentence.length,
      text: sentence.trim().slice(0, 80),
      message: 'This sentence is long. Consider splitting it.',
      replacements: [],
    });
  }

  return issues.sort((a, b) => a.from - b.from);
}

/** Applies the first replacement for each clear issue, skipping overlaps, from the end. */
export function applyClearFixes(text: string, issues: RuleIssue[]): { text: string; applied: number } {
  let next = text;
  let applied = 0;
  let lastStart = Number.POSITIVE_INFINITY;
  const usable = issues
    .filter((issue) => issue.replacements[0] !== undefined && issue.to > issue.from)
    .sort((a, b) => b.from - a.from);
  for (const issue of usable) {
    if (issue.to > lastStart) continue;
    next = next.slice(0, issue.from) + (issue.replacements[0] ?? '') + next.slice(issue.to);
    lastStart = issue.from;
    applied += 1;
  }
  return { text: next, applied };
}

export function writingStats(text: string): WritingStats {
  const words = tokenizeWords(text).length;
  const sentences = (text.match(/[.!?]+(\s|$)/g) ?? []).length || (text.trim() === '' ? 0 : 1);
  return {
    words,
    characters: text.length,
    sentences,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.round(words / 200)),
  };
}
