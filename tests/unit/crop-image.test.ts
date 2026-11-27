// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clampRect,
  cropFileName,
  cropMime,
  fullRect,
} from '../../src/tools/crop-image/engine.ts';

test('keeps a crop inside the image', () => {
  assert.deepEqual(clampRect({ x: 900, y: 500, width: 400, height: 300 }, 1000, 600), {
    x: 600,
    y: 300,
    width: 400,
    height: 300,
  });
  assert.deepEqual(clampRect({ x: -20, y: -10, width: 120, height: 90 }, 1000, 600), {
    x: 0,
    y: 0,
    width: 120,
    height: 90,
  });
});

test('never collapses a selection and rounds fractional input', () => {
  assert.deepEqual(clampRect({ x: 10.6, y: 11.2, width: 0, height: -5 }, 500, 400), {
    x: 11,
    y: 11,
    width: 1,
    height: 1,
  });
});

test('maps formats to MIME types and file names', () => {
  assert.equal(cropMime('jpeg'), 'image/jpeg');
  assert.equal(cropMime('webp'), 'image/webp');
  assert.equal(cropMime('png'), 'image/png');
  assert.equal(cropFileName('Family Photo.JPG', 'jpeg'), 'Family Photo-cropped.jpg');
  assert.equal(cropFileName('.png', 'webp'), 'image-cropped.webp');
});

test('a new image starts with the whole frame selected', () => {
  assert.deepEqual(fullRect(800, 600), { x: 0, y: 0, width: 800, height: 600 });
});
