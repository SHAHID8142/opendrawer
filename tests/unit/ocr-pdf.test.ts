// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves OCR text assembly, the usability filter and file naming.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_PAGES,
  assembleOcrText,
  isUsableOcrText,
  ocrFileName,
  pageLimitMessage,
} from '../../src/tools/ocr-pdf/engine.ts';

test('labels every recognised page in order', () => {
  const text = assembleOcrText([
    { pageNumber: 1, text: 'First page text' },
    { pageNumber: 3, text: 'Third page text' },
  ]);
  assert.equal(text, '--- Page 1 ---\nFirst page text\n\n--- Page 3 ---\nThird page text\n');
});

test('rejects empty and punctuation-only recognition', () => {
  assert.equal(isUsableOcrText(''), false);
  assert.equal(isUsableOcrText('.,;:!?'), false);
  assert.equal(isUsableOcrText('||| ~~~'), false);
});

test('accepts real words and numbers', () => {
  assert.equal(isUsableOcrText('Membership form 2026'), true);
  assert.equal(isUsableOcrText('شهادة عضوية'), true);
});

test('names the file after the source PDF', () => {
  assert.equal(ocrFileName('Scan 01.PDF'), 'Scan 01-ocr.txt');
  assert.equal(ocrFileName('.pdf'), 'document-ocr.txt');
});

test('explains the page limit before work starts', () => {
  assert.equal(pageLimitMessage(MAX_PAGES), null);
  assert.match(pageLimitMessage(MAX_PAGES + 1) ?? '', /stops at 20 pages/);
});
