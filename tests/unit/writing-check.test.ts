// SPDX-License-Identifier: AGPL-3.0-or-later
// Runs the full analyser against the real en-US dictionary, read from disk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { analyzeWriting } from '../../src/tools/writing-check/analysis.ts';

const fetcher = async (url: string) =>
  readFileSync(join(process.cwd(), 'public', url.replace(/^\//, '')), 'utf8');

test('finds a misspelling and suggests the real word', async () => {
  const result = await analyzeWriting('I recieve the report.', 'en-US', fetcher);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const issue = result.analysis.issues.find((entry) => entry.text === 'recieve');
  assert.ok(issue);
  assert.ok(issue?.replacements.includes('receive'));
  assert.equal(result.analysis.stats.words, 4);
});

test('accepts correctly spelled text with mechanical issues only', async () => {
  const result = await analyzeWriting('This is the the report.', 'en-US', fetcher);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(!result.analysis.issues.some((issue) => issue.ruleId === 'spelling'));
  assert.ok(result.analysis.issues.some((issue) => issue.ruleId === 'repeated-word'));
});

test('refuses an unknown language', async () => {
  const result = await analyzeWriting('Hello', 'xx-YY', fetcher);
  assert.equal(result.ok, false);
});
