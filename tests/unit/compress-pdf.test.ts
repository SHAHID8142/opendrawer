// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves the lossless-compression summary maths and file naming.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compressedName, savings, shouldKeepOriginal } from '../../src/tools/compress-pdf/engine.ts';

test('reports the percentage saved, rounded', () => {
  assert.equal(savings(1000, 800), 20);
  assert.equal(savings(1000, 1000), 0);
  assert.equal(savings(1000, 1200), 0);
});

test('keeps the original when qpdf cannot make it smaller', () => {
  assert.equal(shouldKeepOriginal(1000, 1000), true);
  assert.equal(shouldKeepOriginal(1000, 1010), true);
  assert.equal(shouldKeepOriginal(1000, 990), false);
});

test('names the output after the input', () => {
  assert.equal(compressedName('Report Final.PDF'), 'Report Final-compressed.pdf');
  assert.equal(compressedName('.pdf'), 'document-compressed.pdf');
});
