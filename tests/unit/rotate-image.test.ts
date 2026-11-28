// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  describeTransform,
  nextRotation,
  rotateFileName,
  rotateMime,
  transformSize,
} from '../../src/tools/rotate-image/engine.ts';

test('rotation steps wrap in both directions', () => {
  assert.equal(nextRotation(0, 'right'), 90);
  assert.equal(nextRotation(270, 'right'), 0);
  assert.equal(nextRotation(0, 'left'), 270);
  assert.equal(nextRotation(90, 'left'), 0);
});

test('quarter turns swap dimensions and half turns do not', () => {
  assert.deepEqual(transformSize(1200, 800, 90), { width: 800, height: 1200 });
  assert.deepEqual(transformSize(1200, 800, 180), { width: 1200, height: 800 });
  assert.deepEqual(transformSize(1200, 800, 270), { width: 800, height: 1200 });
  assert.deepEqual(transformSize(1200, 800, 0), { width: 1200, height: 800 });
});

test('names the output and maps formats', () => {
  assert.equal(rotateMime('jpeg'), 'image/jpeg');
  assert.equal(rotateMime('webp'), 'image/webp');
  assert.equal(rotateMime('png'), 'image/png');
  assert.equal(rotateFileName('Holiday Photo.JPG', 'jpeg'), 'Holiday Photo-rotated.jpg');
  assert.equal(rotateFileName('.png', 'webp'), 'image-rotated.webp');
});

test('describes flips together with rotation', () => {
  assert.equal(describeTransform({ rotation: 0, flipHorizontal: false, flipVertical: false }), 'No rotation');
  assert.equal(
    describeTransform({ rotation: 90, flipHorizontal: true, flipVertical: true }),
    '90° clockwise, flipped horizontally, flipped vertically',
  );
});
