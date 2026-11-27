// SPDX-License-Identifier: AGPL-3.0-or-later
// Combines the Hunspell dictionary with the rule checks. The dictionary is fetched from this
// origin only, and the caller supplies the fetcher so Node tests can read it from disk.

import { loadEngine, packById } from '../../lib/spellcheck/packs/registry.ts';
import type { HunspellEngine } from '../../lib/spellcheck/hunspell/engine.ts';
import { tokenizeWords } from '../../lib/spellcheck/tokenizer.ts';
import { mechanicalIssues, writingStats, type RuleIssue, type WritingStats } from './rules.ts';

export type TextFetcher = (url: string) => Promise<string>;

export interface Analysis {
  issues: RuleIssue[];
  stats: WritingStats;
  wordCount: number;
}

export type AnalysisResult =
  | { ok: true; analysis: Analysis }
  | { ok: false; message: string };

const engines = new Map<string, Promise<HunspellEngine>>();

function engineFor(packId: string, fetcher: TextFetcher): Promise<HunspellEngine> {
  const cached = engines.get(packId);
  if (cached) return cached;
  const pack = packById(packId);
  if (!pack) return Promise.reject(new Error(`Unknown language pack: ${packId}`));
  const loading = loadEngine(pack, fetcher);
  engines.set(packId, loading);
  return loading;
}

function spellingIssues(text: string, engine: HunspellEngine): RuleIssue[] {
  const issues: RuleIssue[] = [];
  for (const token of tokenizeWords(text)) {
    if (token.hasDigit || token.text.length < 2 || /[@_/]/.test(token.text)) continue;
    if (token.text.length > 3 && token.text === token.text.toUpperCase()) continue;
    if (engine.isAccepted(token.text)) continue;
    const suggestions = engine.suggest(token.text, 5).map((candidate) => {
      if (token.text[0] === token.text[0]?.toUpperCase()) {
        return candidate.value.charAt(0).toUpperCase() + candidate.value.slice(1);
      }
      return candidate.value;
    });
    issues.push({
      ruleId: 'spelling',
      category: 'spelling',
      severity: 'error',
      from: token.start,
      to: token.end,
      text: token.text,
      message: `"${token.text}" may be misspelled.`,
      replacements: suggestions,
    });
  }
  return issues;
}

export async function analyzeWriting(
  text: string,
  packId: string,
  fetcher: TextFetcher,
  allowed: Iterable<string> = [],
): Promise<AnalysisResult> {
  const pack = packById(packId);
  if (!pack) return { ok: false, message: 'Choose a language first.' };
  let engine: HunspellEngine;
  try {
    engine = await engineFor(packId, fetcher);
  } catch {
    return {
      ok: false,
      message: `The ${pack.label} dictionary could not be loaded. Check your connection and try again.`,
    };
  }
  const allow = new Set([...allowed].map((word) => word.toLocaleLowerCase()));
  const issues = [
    ...spellingIssues(text, engine).filter((issue) => !allow.has(issue.text.toLocaleLowerCase())),
    ...mechanicalIssues(text),
  ]
    .sort((a, b) => a.from - b.from)
    .slice(0, 300);
  return { ok: true, analysis: { issues, stats: writingStats(text), wordCount: engine.wordCount } };
}
