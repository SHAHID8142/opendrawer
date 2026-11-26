// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves cropping sets the right box on the right pages and refuses unsafe margins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import { cropPdf, MM_TO_PT } from '../../src/tools/crop-pdf/engine.ts';

async function makePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) pdf.addPage([300, 400]);
  return pdf.save();
}

test('crops the chosen margin from every selected page', async () => {
  const result = await cropPdf({ name: 'a.pdf', bytes: await makePdf(1) }, 10, [1]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const pdf = await PDFDocument.load(result.bytes);
  const box = pdf.getPage(0).getCropBox();
  const margin = 10 * MM_TO_PT;
  assert.ok(Math.abs(box.x - margin) < 0.1);
  assert.ok(Math.abs(box.width - (300 - margin * 2)) < 0.1);
  assert.ok(Math.abs(box.height - (400 - margin * 2)) < 0.1);
});

test('leaves unselected pages alone', async () => {
  const result = await cropPdf({ name: 'a.pdf', bytes: await makePdf(2) }, 10, [2]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const pdf = await PDFDocument.load(result.bytes);
  assert.ok(Math.abs(pdf.getPage(0).getCropBox().width - 300) < 0.1);
  assert.ok(Math.abs(pdf.getPage(1).getCropBox().width - (300 - 20 * MM_TO_PT)) < 0.1);
});

test('refuses a margin that would leave no page', async () => {
  const tiny = await PDFDocument.create();
  tiny.addPage([40, 40]);
  const result = await cropPdf({ name: 'tiny.pdf', bytes: await tiny.save() }, 10, [1]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'MARGIN_TOO_LARGE');
});

test('refuses an out-of-range page', async () => {
  const result = await cropPdf({ name: 'a.pdf', bytes: await makePdf(1) }, 10, [2]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'PAGE_OUT_OF_RANGE');
});

test('refuses an empty page selection', async () => {
  const result = await cropPdf({ name: 'a.pdf', bytes: await makePdf(1) }, 10, []);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'EMPTY');
});

test('refuses a file that is not a PDF', async () => {
  const result = await cropPdf(
    { name: 'x.txt', bytes: Uint8Array.from(Buffer.from('hi', 'utf8')) },
    10,
    [1],
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
