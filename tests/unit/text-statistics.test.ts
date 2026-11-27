// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { analyseText, countSyllables } from '../../src/tools/text-statistics/stats.ts';

test('counts syllables with the documented heuristic', () => {
  assert.equal(countSyllables('cat'), 1);
  assert.equal(countSyllables('beautiful'), 3);
  assert.equal(countSyllables('running'), 2);
  assert.equal(countSyllables('rhythm'), 1);
  assert.equal(countSyllables('make'), 1);
  assert.equal(countSyllables(''), 0);
});

test('counts words, sentences, paragraphs and unique words', () => {
  const result = analyseText('The cat sat on the mat. It was a good day. Another paragraph here.');
  assert.equal(result.words, 14);
  assert.equal(result.sentences, 3);
  assert.equal(result.paragraphs, 1);
  assert.equal(result.uniqueWords, 13);
  assert.ok(result.charactersNoSpaces > 0);
  assert.ok(result.charactersNoSpaces < result.characters);
});

test('splits paragraphs on blank lines', () => {
  const result = analyseText('First paragraph here.\n\nSecond paragraph here.');
  assert.equal(result.paragraphs, 2);
});

test('computes readability estimates and a plain-language level', () => {
  const result = analyseText('The cat sat on the mat. It was a good day.');
  assert.equal(result.fleschReadingEase, 100);
  assert.equal(result.level, 'Very easy');
  assert.ok(result.fleschKincaidGrade !== null && result.fleschKincaidGrade < 5);
  assert.ok(result.topWords.some((entry) => entry.word === 'cat'));
});

test('an empty document has no score and no division by zero', () => {
  const result = analyseText('   ');
  assert.equal(result.words, 0);
  assert.equal(result.sentences, 0);
  assert.equal(result.fleschReadingEase, null);
  assert.equal(result.level, 'No text yet');
});
