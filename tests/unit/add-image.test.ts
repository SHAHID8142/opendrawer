// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves image placement lands in the right corner, keeps its aspect ratio and clamps to the page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import { placeImage } from '../../src/tools/add-image/placement.ts';
import { addImageToPdf } from '../../src/tools/add-image/engine.ts';

const box = { x: 0, y: 0, width: 300, height: 400 };

test('places a bottom-right image at the margin', () => {
  const placed = placeImage(box, 2, 60, 10, 'bottom-right');
  assert.equal(placed.scaled, false);
  assert.ok(Math.abs(placed.x - (300 - 60 - 10)) < 0.01);
  assert.ok(Math.abs(placed.y - 10) < 0.01);
  assert.equal(placed.height, 30);
});

test('places a top-left image at the margin', () => {
  const placed = placeImage(box, 1, 40, 12, 'top-left');
  assert.ok(Math.abs(placed.x - 12) < 0.01);
  assert.ok(Math.abs(placed.y - (400 - 40 - 12)) < 0.01);
});

test('centres the image on the page, ignoring the margin', () => {
  const placed = placeImage(box, 1, 100, 25, 'centre');
  assert.ok(Math.abs(placed.x - 100) < 0.01);
  assert.ok(Math.abs(placed.y - 150) < 0.01);
});

test('shrinks an image that would not fit and says so', () => {
  const placed = placeImage(box, 0.5, 280, 10, 'centre');
  assert.equal(placed.scaled, true);
  assert.ok(placed.width <= 280);
  assert.ok(placed.height <= 380);
  assert.ok(Math.abs(placed.width / placed.height - 0.5) < 0.001);
});

test('honours a media box that does not start at zero', () => {
  const placed = placeImage({ x: 20, y: 30, width: 100, height: 100 }, 1, 20, 5, 'bottom-left');
  assert.ok(Math.abs(placed.x - 25) < 0.01);
  assert.ok(Math.abs(placed.y - 35) < 0.01);
});

async function makePdf(pages = 1): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) pdf.addPage([300, 400]);
  return pdf.save();
}

// A 1×1 PNG is enough to prove the embedding path without a large fixture.
const PNG_1X1 = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
);

test('adds the image to every selected page', async () => {
  const result = await addImageToPdf(
    { name: 'doc.pdf', bytes: await makePdf(2) },
    { name: 'dot.png', bytes: PNG_1X1 },
    { placement: 'bottom-right', widthMm: 20, marginMm: 10, opacity: 1, pages: [1, 2] },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.placed, 2);
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 2);
});

test('refuses an image that is not PNG or JPEG', async () => {
  const result = await addImageToPdf(
    { name: 'doc.pdf', bytes: await makePdf() },
    { name: 'pic.webp', bytes: Uint8Array.from(Buffer.from('RIFFxxxxWEBP', 'utf8')) },
    { placement: 'bottom-right', widthMm: 20, marginMm: 10, opacity: 1, pages: [1] },
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'UNSUPPORTED_IMAGE');
});

test('refuses a page that does not exist', async () => {
  const result = await addImageToPdf(
    { name: 'doc.pdf', bytes: await makePdf() },
    { name: 'dot.png', bytes: PNG_1X1 },
    { placement: 'centre', widthMm: 20, marginMm: 10, opacity: 1, pages: [3] },
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'PAGE_OUT_OF_RANGE');
});

test('refuses a file that is not a PDF', async () => {
  const result = await addImageToPdf(
    { name: 'doc.txt', bytes: Uint8Array.from(Buffer.from('nope', 'utf8')) },
    { name: 'dot.png', bytes: PNG_1X1 },
    { placement: 'centre', widthMm: 20, marginMm: 10, opacity: 1, pages: [1] },
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
