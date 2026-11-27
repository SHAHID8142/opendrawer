// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { diffLines, MAX_LINES, toUnified } from '../../src/tools/text-diff/diff.ts';

const options = { ignoreCase: false, ignoreTrailingWhitespace: false };

test('identical texts have no changes', () => {
  const result = diffLines('a\nb', 'a\nb', options);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.diff.added, 0);
  assert.equal(result.diff.removed, 0);
  assert.equal(result.diff.unchanged, 2);
});

test('reports a removed and an added line with line numbers', () => {
  const result = diffLines('a\nb\nc', 'a\nx\nc', options);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.diff.added, 1);
  assert.equal(result.diff.removed, 1);
  const removed = result.diff.lines.find((line) => line.kind === 'removed');
  const added = result.diff.lines.find((line) => line.kind === 'added');
  assert.deepEqual(removed, { kind: 'removed', text: 'b', oldLine: 2, newLine: null });
  assert.deepEqual(added, { kind: 'added', text: 'x', oldLine: null, newLine: 2 });
});

test('ignore options treat case and trailing whitespace as equal', () => {
  const strict = diffLines('Hello  ', 'hello', options);
  assert.equal(strict.ok, true);
  if (strict.ok) assert.equal(strict.diff.unchanged, 0);

  const loose = diffLines('Hello  ', 'hello', { ignoreCase: true, ignoreTrailingWhitespace: true });
  assert.equal(loose.ok, true);
  if (loose.ok) assert.equal(loose.diff.unchanged, 1);
});

test('refuses documents above the line cap', () => {
  const long = Array.from({ length: MAX_LINES + 1 }, (_, index) => `line ${index}`).join('\n');
  const result = diffLines(long, 'a', options);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /1000 lines/);
});

test('writes a unified diff without timestamps', () => {
  const result = diffLines('a\nb', 'a\nc', options);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(toUnified(result.diff), '--- before\n+++ after\n a\n-b\n+c');
});
