// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves saddle-stitch page order, padding and the A4 landscape output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { bookletOrder, bookletPdf, paddedCount, sheetCount } from '../../src/tools/booklet-pdf/engine.ts';

test('pads to a multiple of four and counts sheets', () => {
  assert.equal(paddedCount(5), 8);
  assert.equal(paddedCount(8), 8);
  assert.equal(sheetCount(8), 2);
  assert.equal(sheetCount(5), 2);
});

test('orders eight pages as two saddle-stitch sheets', () => {
  assert.deepEqual(bookletOrder(8), [
    [8, 1],
    [2, 7],
    [6, 3],
    [4, 5],
  ]);
});

test('marks padded slots as null pages', () => {
  assert.deepEqual(bookletOrder(5), [
    [null, 1],
    [2, null],
    [null, 3],
    [4, 5],
  ]);
});

test('creates A4 landscape sheets', async () => {
  const source = await PDFDocument.create();
  const font = await source.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 8; i += 1) {
    const page = source.addPage([300, 400]);
    page.drawText(`Page ${i}`, { x: 20, y: 360, size: 14, font });
  }
  const result = await bookletPdf({ name: 'eight.pdf', bytes: await source.save() });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.sheets, 4);
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 4);
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - 841.89) < 0.01);
  assert.ok(Math.abs(pdf.getPage(0).getHeight() - 595.28) < 0.01);
});
