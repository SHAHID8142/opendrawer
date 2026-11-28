// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clampQuality,
  convertFileName,
  convertMime,
  encodeBmp,
  keepsTransparency,
  wrapIco,
} from '../../src/tools/convert-image/engine.ts';

test('maps formats to MIME types and output names', () => {
  assert.equal(convertMime('jpeg'), 'image/jpeg');
  assert.equal(convertMime('webp'), 'image/webp');
  assert.equal(convertMime('png'), 'image/png');
  assert.equal(convertMime('bmp'), 'image/bmp');
  assert.equal(convertMime('ico'), 'image/x-icon');
  assert.equal(convertFileName('Screenshot 2026.PNG', 'webp'), 'Screenshot 2026-converted.webp');
  assert.equal(convertFileName('.png', 'jpeg'), 'image-converted.jpg');
  assert.equal(convertFileName('app.png', 'ico'), 'app-converted.ico');
});

test('PNG, WebP and ICO keep alpha; JPEG and BMP do not', () => {
  assert.equal(keepsTransparency('png'), true);
  assert.equal(keepsTransparency('webp'), true);
  assert.equal(keepsTransparency('ico'), true);
  assert.equal(keepsTransparency('jpeg'), false);
  assert.equal(keepsTransparency('bmp'), false);
});

test('clamps quality to the supported range', () => {
  assert.equal(clampQuality(5), 40);
  assert.equal(clampQuality(99), 95);
  assert.equal(clampQuality(72.6), 73);
});

test('BMP header is valid and rows are bottom-up BGR', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255,
    0, 0, 255, 255,
  ]);
  const bmp = encodeBmp(pixels, 2, 1);
  const view = new DataView(bmp.buffer);
  assert.equal(String.fromCharCode(bmp[0] ?? 0, bmp[1] ?? 0), 'BM');
  assert.equal(view.getUint32(18, true), 2);
  assert.equal(view.getUint32(22, true), 1);
  assert.equal(view.getUint16(28, true), 24);
  assert.equal(bmp.length, 54 + 8);
  assert.deepEqual([...bmp.subarray(54, 60)], [0, 0, 255, 255, 0, 0]);
});

test('BMP flattens semi-transparent black onto white', () => {
  const pixels = new Uint8ClampedArray([0, 0, 0, 128]);
  const bmp = encodeBmp(pixels, 1, 1);
  assert.equal(bmp[54], 127);
  assert.equal(bmp[55], 127);
  assert.equal(bmp[56], 127);
});

test('ICO wraps a PNG in a single 256px entry', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const ico = wrapIco(png);
  const view = new DataView(ico.buffer);
  assert.equal(ico.length, 22 + png.length);
  assert.equal(view.getUint16(2, true), 1);
  assert.equal(view.getUint16(4, true), 1);
  assert.equal(ico[6], 0);
  assert.equal(ico[7], 0);
  assert.equal(view.getUint32(14, true), png.length);
  assert.equal(view.getUint32(18, true), 22);
  assert.deepEqual([...ico.subarray(22)], [...png]);
});
