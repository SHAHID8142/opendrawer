// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves sheet counts, A4 output and the grid geometry for N-up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { GRIDS, cellsFor, nUpPdf, sheetCount } from '../../src/tools/n-up-pdf/engine.ts';

test('counts sheets for each grid', () => {
  assert.equal(sheetCount(5, 2), 3);
  assert.equal(sheetCount(5, 4), 2);
  assert.equal(sheetCount(9, 9), 1);
  assert.equal(sheetCount(0, 4), 0);
});

test('builds one cell per slot inside the margins', () => {
  const cells = cellsFor(4, 595.28, 841.89, 12);
  assert.equal(cells.length, 4);
  assert.equal(GRIDS[4].cols, 2);
  assert.equal(GRIDS[4].rows, 2);
  assert.ok(cells[0]!.x >= 12 - 0.01);
  assert.ok(cells[0]!.y >= 12 - 0.01);
  const last = cells[3]!;
  assert.ok(last.x + last.width <= 595.28 - 12 + 0.01);
  assert.ok(last.y + last.height <= 841.89 - 12 + 0.01);
});

test('lays 5 pages out on 2 A4 sheets of 4', async () => {
  const source = await PDFDocument.create();
  const font = await source.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 5; i += 1) {
    const page = source.addPage([300, 400]);
    page.drawText(`Source page ${i}`, { x: 20, y: 360, size: 14, font });
  }
  const result = await nUpPdf({ name: 'five.pdf', bytes: await source.save() }, 4);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.sheets, 2);
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 2);
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - 595.28) < 0.01);
});
