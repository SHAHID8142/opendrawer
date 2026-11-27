// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_IMAGE_BYTES,
  MAX_PIXELS,
  byteLimitMessage,
  pixelLimitMessage,
  sniffImage,
  textFileName,
} from '../../src/tools/image-to-text/engine.ts';
import { isUsableOcrText } from '../../src/lib/ocr-text.ts';

test('recognises the supported image signatures', () => {
  const label = (bytes: Uint8Array): string => {
    const result = sniffImage(bytes);
    return result.ok ? result.format.label : 'rejected';
  };
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const webp = new Uint8Array([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')]);
  const avif = new Uint8Array([0, 0, 0, 24, ...Buffer.from('ftypavif'), 0, 0, 0, 0]);
  assert.equal(label(png), 'PNG');
  assert.equal(label(jpeg), 'JPEG');
  assert.equal(label(webp), 'WebP');
  assert.equal(label(avif), 'AVIF');
});

test('rejects a PDF or an unknown file with a plain message', () => {
  const pdf = new Uint8Array([...Buffer.from('%PDF-1.7'), 0, 0, 0, 0]);
  const result = sniffImage(pdf);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /not a PNG/);
});

test('rejects tiny and oversized inputs with specific messages', () => {
  const tiny = sniffImage(new Uint8Array([1, 2, 3]));
  assert.equal(tiny.ok, false);
  assert.match(byteLimitMessage(MAX_IMAGE_BYTES + 1) ?? '', /limit is 25 MB/);
  assert.equal(byteLimitMessage(MAX_IMAGE_BYTES), null);
  assert.match(pixelLimitMessage(9000, 5000) ?? '', /40 megapixels/);
  assert.equal(pixelLimitMessage(4000, 3000), null);
  assert.equal(MAX_PIXELS, 40_000_000);
});

test('names the download after the image', () => {
  assert.equal(textFileName('Receipt scan.PNG'), 'Receipt scan-text.txt');
  assert.equal(textFileName('.png'), 'image-text.txt');
});

test('separates readable OCR text from punctuation noise', () => {
  assert.equal(isUsableOcrText('Hello there, receipt 42.'), true);
  assert.equal(isUsableOcrText('..,-'), false);
});

test('grayscale makes channels equal and keeps alpha', async () => {
  const { processPixels } = await import('../../src/tools/image-to-text/preprocess.ts');
  const data = new Uint8ClampedArray([100, 150, 200, 255]);
  processPixels(data, { grayscale: true, contrast: false });
  assert.equal(data[0], data[1]);
  assert.equal(data[1], data[2]);
  assert.equal(data[3], 255);
});

test('contrast pushes dark pixels darker and light pixels lighter', async () => {
  const { processPixels } = await import('../../src/tools/image-to-text/preprocess.ts');
  const dark = new Uint8ClampedArray([100, 100, 100, 255]);
  const light = new Uint8ClampedArray([200, 200, 200, 255]);
  processPixels(dark, { grayscale: false, contrast: true });
  processPixels(light, { grayscale: false, contrast: true });
  assert.ok((dark[0] ?? 0) < 100);
  assert.ok((light[0] ?? 0) > 200);
});

test('no options leaves the pixels untouched', async () => {
  const { processPixels } = await import('../../src/tools/image-to-text/preprocess.ts');
  const data = new Uint8ClampedArray([10, 20, 30, 255]);
  processPixels(data, { grayscale: false, contrast: false });
  assert.deepEqual([...data], [10, 20, 30, 255]);
});
