// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves text joining keeps words apart, honours line ends and writes page markers.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assembleDocument,
  joinPageText,
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
