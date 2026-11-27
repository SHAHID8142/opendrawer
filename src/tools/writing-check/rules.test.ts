// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves the rule-based writing checks and the word statistics.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyClearFixes, mechanicalIssues, writingStats } from './rules.ts';

function ids(text: string) {
  return mechanicalIssues(text).map((issue) => issue.ruleId);
}

test('flags a repeated word and suggests removing the duplicate', () => {
  const issues = mechanicalIssues('This is the the report.');
  const repeated = issues.find((issue) => issue.ruleId === 'repeated-word');
  assert.ok(repeated);
  if (!repeated) return;
  assert.equal(repeated.text, 'the the');
  assert.deepEqual(repeated.replacements, ['the']);
});

test('flags double spaces and a space before punctuation', () => {
  const issues = mechanicalIssues('Hello  world , again.');
  assert.ok(issues.some((issue) => issue.ruleId === 'double-space'));
  assert.ok(issues.some((issue) => issue.ruleId === 'space-before-punctuation'));
});

test('flags a lowercase sentence start', () => {
  const issues = mechanicalIssues('first sentence. second one.');
  assert.equal(issues.filter((issue) => issue.ruleId === 'sentence-case').length, 2);
});

test('catches a common confusable phrase', () => {
  const issues = mechanicalIssues('I should of checked it.');
  const confusable = issues.find((issue) => issue.ruleId === 'confusable-should-of');
  assert.ok(confusable);
  if (!confusable) return;
  assert.deepEqual(confusable.replacements, ['should have']);
});

test('reports long sentences without rewriting them', () => {
  const text = `This sentence ${'word '.repeat(40)}ends.`;
  const issues = mechanicalIssues(text);
  assert.ok(issues.some((issue) => issue.ruleId === 'long-sentence'));
});

test('counts words, sentences and reading time', () => {
  const stats = writingStats('One two three. Four five!');
  assert.equal(stats.words, 5);
  assert.equal(stats.sentences, 2);
  assert.equal(stats.characters, 25);
  assert.equal(stats.readingMinutes, 1);
});

test('applies non-overlapping clear fixes from the end', () => {
  const text = 'I recieve the the report  with care.';
  const issues = mechanicalIssues(text);
  const { text: fixed, applied } = applyClearFixes(text, issues);
  assert.equal(fixed, 'I recieve the report with care.');
  assert.equal(applied, 2);
});
