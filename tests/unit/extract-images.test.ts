// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves image naming, small-image filtering and the per-run cap.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_IMAGES,
  extractable,
  imageFileName,
  tooManyImages,
} from '../../src/tools/extract-images/engine.ts';

test('names extracted images in order', () => {
  assert.equal(imageFileName('report', 1), 'report-image-001.png');
  assert.equal(imageFileName('report', 12), 'report-image-012.png');
});

test('ignores images below the minimum size', () => {
  assert.equal(extractable(64, 64, 64), true);
  assert.equal(extractable(63, 64, 64), false);
  assert.equal(extractable(400, 10, 32), false);
  assert.equal(extractable(400, 400, 0), true);
});

test('explains the image cap before work starts', () => {
  assert.equal(tooManyImages(MAX_IMAGES), null);
  assert.match(tooManyImages(MAX_IMAGES + 1) ?? '', /stops at 100 images/);
});
