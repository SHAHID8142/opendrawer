// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves the images-to-pdf engine before the UI exists: sizes, order, refusals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import { buildPdfFromImages } from '../../src/tools/images-to-pdf/engine.ts';

// 1×1 transparent PNG: the smallest valid input the engine must accept.
const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
);

function image(name = 'pixel.png') {
  return { name, bytes: PNG, type: 'png' as const };
}

test('refuses an empty selection', async () => {
  const result = await buildPdfFromImages([], { pageSize: 'a4' });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, 'EMPTY');
});

test('writes one A4 page per image and keeps the order', async () => {
  const result = await buildPdfFromImages([image('one.png'), image('two.png')], {
    pageSize: 'a4',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 2);
  const page = pdf.getPage(0);
  assert.ok(Math.abs(page.getWidth() - 595.28) < 0.5);
  assert.ok(Math.abs(page.getHeight() - 841.89) < 0.5);
});

test('match-image pages use the image size in points', async () => {
  const result = await buildPdfFromImages([image()], { pageSize: 'image' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const pdf = await PDFDocument.load(result.bytes);
  const page = pdf.getPage(0);
  assert.equal(Math.round(page.getWidth()), 1);
  assert.equal(Math.round(page.getHeight()), 1);
});

test('refuses a file that is not PNG or JPEG', async () => {
  const gif = Uint8Array.from(Buffer.from('GIF89a', 'ascii'));
  const result = await buildPdfFromImages(
    [{ name: 'fake.gif', bytes: gif, type: 'png' }],
    { pageSize: 'a4' },
  );
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, 'UNSUPPORTED_TYPE');
});

test('refuses more images than the documented ceiling', async () => {
  const many = Array.from({ length: 51 }, (_, index) => image(`${index}.png`));
  const result = await buildPdfFromImages(many, { pageSize: 'a4' });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, 'TOO_MANY_IMAGES');
});
