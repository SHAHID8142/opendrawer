// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves delete-pages removes exactly the chosen pages and never empties a document.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import { deletePdfPages } from '../../src/tools/delete-pages/engine.ts';

async function makePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) pdf.addPage([100 + index, 100]);
  return pdf.save();
}

async function widths(bytes: Uint8Array): Promise<number[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => Math.round(page.getWidth()));
}

test('removes the chosen pages and keeps the rest in order', async () => {
  const result = await deletePdfPages({ name: 'a.pdf', bytes: await makePdf(5) }, [2, 4]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(await widths(result.bytes), [100, 102, 104]);
  assert.equal(result.remaining, 3);
});

test('refuses to delete every page', async () => {
  const result = await deletePdfPages({ name: 'a.pdf', bytes: await makePdf(3) }, [1, 2, 3]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'WOULD_EMPTY');
});

test('ignores duplicate page numbers', async () => {
  const result = await deletePdfPages({ name: 'a.pdf', bytes: await makePdf(3) }, [2, 2]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(await widths(result.bytes), [100, 102]);
});

test('refuses pages outside the document', async () => {
  const result = await deletePdfPages({ name: 'a.pdf', bytes: await makePdf(2) }, [3]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'PAGE_OUT_OF_RANGE');
});

test('refuses a file that is not a PDF', async () => {
  const result = await deletePdfPages(
    { name: 'x.txt', bytes: Uint8Array.from(Buffer.from('hi', 'utf8')) },
    [1],
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
