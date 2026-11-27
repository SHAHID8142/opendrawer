// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clampQuality,
  fitDimensions,
  mimeFor,
  outputName,
} from '../../src/tools/compress-image/engine.ts';

test('fits large images inside a square bound and keeps the aspect ratio', () => {
  assert.deepEqual(fitDimensions(4000, 3000, 1920), { width: 1920, height: 1440, resized: true });
  assert.deepEqual(fitDimensions(3000, 4000, 1280), { width: 960, height: 1280, resized: true });
});

test('never enlarges small images or changes them when no bound is set', () => {
  assert.deepEqual(fitDimensions(640, 480, 1920), { width: 640, height: 480, resized: false });
  assert.deepEqual(fitDimensions(8000, 6000, 0), { width: 8000, height: 6000, resized: false });
});

test('maps formats to MIME types and file extensions', () => {
  assert.equal(mimeFor('jpeg'), 'image/jpeg');
  assert.equal(mimeFor('webp'), 'image/webp');
  assert.equal(mimeFor('png'), 'image/png');
  assert.equal(outputName('Holiday Photo.JPG', 'jpeg'), 'Holiday Photo-compressed.jpg');
  assert.equal(outputName('scan.png', 'webp'), 'scan-compressed.webp');
  assert.equal(outputName('.png', 'png'), 'image-compressed.png');
});

test('clamps quality to the supported range', () => {
  assert.equal(clampQuality(10), 40);
  assert.equal(clampQuality(100), 95);
  assert.equal(clampQuality(81.4), 81);
});
