// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves text joining keeps words apart, honours line ends and writes page markers.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assembleDocument,
  isReadablePage,
  joinPageText,
  stripControlChars,
  textFileName,
  type TextItem,
} from '../../src/tools/extract-text/engine.ts';

const item = (str: string, hasEOL = false): TextItem => ({ str, hasEOL });

test('joins line items without welding words together', () => {
  assert.equal(
    joinPageText([item('Hello'), item('world', true), item('Second'), item('line', true)]),
    'Hello world\nSecond line',
  );
});

test('keeps spacing that the PDF itself stores', () => {
  assert.equal(joinPageText([item('Total: '), item('42', true)]), 'Total: 42');
});

test('drops blank trailing lines', () => {
  assert.equal(joinPageText([item('Only', true), item('', true)]), 'Only');
});

test('collapses runs of empty lines left by broken glyphs', () => {
  assert.equal(joinPageText([item('Top', true), item('', true), item('', true), item('', true), item('Bottom')]), 'Top\n\nBottom');
});

test('separates pages with markers when asked', () => {
  const text = assembleDocument(['First page', 'Second page'], { markers: true });
  assert.equal(text, '--- Page 1 ---\nFirst page\n\n--- Page 2 ---\nSecond page\n');
});

test('leaves markers out when they are off', () => {
  assert.equal(
    assembleDocument(['First page', 'Second page'], { markers: false }),
    'First page\n\nSecond page\n',
  );
});

test('names the text file after the PDF', () => {
  assert.equal(textFileName('Report Final.PDF'), 'Report Final.txt');
  assert.equal(textFileName('weird/name?.pdf'), 'weird_name_.txt');
  assert.equal(textFileName('.pdf'), 'document.txt');
});

test('strips control noise and calls such a page unreadable', () => {
  const junk = [item('\u001f\u001e\u001d\u001c\u001b\u001a\u0019\u0018'), item(' \u0019\u0015\u0016', true)];
  const text = joinPageText(junk);
  assert.equal(text.trim(), '');
  assert.equal(isReadablePage(text), false);
});

test('keeps real text readable, including non-Latin scripts', () => {
  assert.equal(isReadablePage('Membership form'), true);
  assert.equal(isReadablePage('شهادة عضوية'), true);
  assert.equal(isReadablePage('日本語のテキスト'), true);
});

test('treats a mostly broken page as unreadable', () => {
  assert.equal(isReadablePage('\u0001\u0002\u0003\u0004 abc'), false);
  assert.equal(isReadablePage('\u0081\u008d\u008f'), false);
  assert.equal(stripControlChars('a\u0001b'), 'ab');
  assert.equal(stripControlChars('a\u0081b\u009fb'), 'abb');
});
