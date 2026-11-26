// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves file naming and MIME mapping for every PDF-to-image output format.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FORMATS, FORMAT_ORDER, imageFileName } from '../../src/tools/pdf-to-image/formats.ts';

test('names files with the right extension and padded page number', () => {
  assert.equal(imageFileName('report', 7, 'png'), 'report-page-007.png');
  assert.equal(imageFileName('report', 12, 'jpeg'), 'report-page-012.jpg');
  assert.equal(imageFileName('report', 1, 'webp'), 'report-page-001.webp');
  assert.equal(imageFileName('report', 1000, 'avif'), 'report-page-1000.avif');
});

test('maps every format to a browser MIME type and alpha rule', () => {
  assert.equal(FORMATS.png.mime, 'image/png');
  assert.equal(FORMATS.jpeg.mime, 'image/jpeg');
  assert.equal(FORMATS.webp.mime, 'image/webp');
  assert.equal(FORMATS.avif.mime, 'image/avif');
  assert.equal(FORMATS.jpeg.needsWhiteBackground, true);
  assert.equal(FORMATS.webp.needsWhiteBackground, false);
  assert.deepEqual(FORMAT_ORDER, ['png', 'jpeg', 'webp', 'avif']);
});
