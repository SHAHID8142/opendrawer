// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves reorder maps every page exactly once and rejects partial or duplicated orders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import { reorderPdf } from '../../src/tools/reorder-pages/engine.ts';

async function makePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) pdf.addPage([100 + index, 100]);
  return pdf.save();
}

async function widths(bytes: Uint8Array): Promise<number[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => Math.round(page.getWidth()));
}

test('moves pages into the requested order', async () => {
  const result = await reorderPdf({ name: 'a.pdf', bytes: await makePdf(3) }, [3, 1, 2]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(await widths(result.bytes), [102, 100, 101]);
});

test('rejects a missing page', async () => {
  const result = await reorderPdf({ name: 'a.pdf', bytes: await makePdf(3) }, [1, 2]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_ORDER');
});

test('rejects a duplicated page', async () => {
  const result = await reorderPdf({ name: 'a.pdf', bytes: await makePdf(3) }, [1, 2, 2]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_ORDER');
});

test('rejects a page number outside the document', async () => {
  const result = await reorderPdf({ name: 'a.pdf', bytes: await makePdf(2) }, [1, 4]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_ORDER');
});

test('refuses a file that is not a PDF', async () => {
  const result = await reorderPdf(
    { name: 'x.txt', bytes: Uint8Array.from(Buffer.from('hi', 'utf8')) },
    [1],
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
