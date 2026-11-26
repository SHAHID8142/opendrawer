// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseAffix } from '../../src/lib/spellcheck/hunspell/aff.ts';
import { parseDictionary } from '../../src/lib/spellcheck/hunspell/dic.ts';
import { HunspellEngine } from '../../src/lib/spellcheck/hunspell/engine.ts';

const root = process.cwd();

function load(locale: string): HunspellEngine {
  const base = join(root, 'public', 'dictionaries', locale);
  const aff = parseAffix(readFileSync(join(base, 'index.aff'), 'utf8'));
  const dic = parseDictionary(
    readFileSync(join(base, 'index.dic'), 'utf8'),
    aff.codec,
    aff.file.flagType,
    aff.flagAliases,
  );
  return new HunspellEngine({
    id: locale,
    affix: aff.file,
    codec: aff.codec,
    words: dic.words,
  });
}

test('parses the English dictionary', () => {
  const engine = load('en-US');
  assert.ok(engine.wordCount > 40_000, `expected a large dictionary, got ${engine.wordCount}`);
});

test('accepts words and inflections, rejects typos', () => {
  const engine = load('en-US');
  for (const word of ['color', 'receive', 'running', 'nationalization', "don't", 'hello']) {
    assert.equal(engine.isAccepted(word), true, `expected "${word}" to be accepted`);
  }
  assert.equal(engine.isAccepted('recieve'), false);
  assert.equal(engine.isAccepted('writting'), false);
});

test('suggests the right spelling for common typos', () => {
  const engine = load('en-US');
  const suggestions = engine.suggest('recieve').map((entry) => entry.value.toLowerCase());
  assert.ok(suggestions.includes('receive'), `got ${suggestions.join(', ')}`);

  const writting = engine.suggest('writting').map((entry) => entry.value.toLowerCase());
  assert.ok(writting.includes('writing'), `got ${writting.join(', ')}`);
});

test('parses and queries the Bengali dictionary', () => {
  const engine = load('bn-BD');
  assert.ok(engine.wordCount > 50_000, `expected a large dictionary, got ${engine.wordCount}`);
  for (const word of ['বাংলা', 'বাংলাদেশ', 'মানুষ', 'স্কুল']) {
    assert.equal(engine.isAccepted(word), true, `expected "${word}" to be accepted`);
  }
});
