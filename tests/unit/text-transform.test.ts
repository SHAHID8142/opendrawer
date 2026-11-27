// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  replaceLiteral,
  sentenceCase,
  textStats,
  titleCase,
  transformText,
} from '../../src/tools/text-transform/transform.ts';

test('sentence case lowercases shouting and fixes sentence starts', () => {
  assert.equal(sentenceCase('HELLO WORLD. this is A test!'), 'Hello world. This is a test!');
});

test('title case keeps acronyms and short joining words quiet', () => {
  assert.equal(titleCase('the NASA story of a fox'), 'The NASA Story of a Fox');
});

test('sorts lines case-insensitively and removes duplicates', () => {
  assert.equal(transformText('banana\nApple\napple\n', 'sort-asc'), 'Apple\napple\nbanana');
  assert.equal(transformText('One\ntwo\nONE\n', 'unique'), 'One\ntwo');
});

test('tidy trims lines and collapses blank runs', () => {
  assert.equal(transformText('  a  \n\n\n\n  b  ', 'tidy'), 'a\n\nb');
});

test('numbers lines with alignment', () => {
  assert.equal(transformText('a\nb', 'number'), '  1. a\n  2. b');
});

test('replace is literal and follows the case toggle', () => {
  const insensitive = replaceLiteral('Cat and cat', 'cat', 'dog', false);
  assert.deepEqual(insensitive, { text: 'dog and dog', count: 2 });
  const sensitive = replaceLiteral('Cat and cat', 'cat', 'dog', true);
  assert.deepEqual(sensitive, { text: 'Cat and dog', count: 1 });
  assert.deepEqual(replaceLiteral('abc', '', 'x', false), { text: 'abc', count: 0 });
  assert.equal(replaceLiteral('price', 'price', '$& 5', false).text, '$& 5');
});

test('stats count lines and words', () => {
  assert.deepEqual(textStats('one two\nthree'), { characters: 13, words: 3, lines: 2 });
});
