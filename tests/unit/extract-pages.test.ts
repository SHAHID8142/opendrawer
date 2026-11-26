// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves extract keeps exactly the chosen pages, in the order typed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import { extractPdfPages } from '../../src/tools/extract-pages/engine.ts';

async function makePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) pdf.addPage([100 + index, 100]);
  return pdf.save();
}

async function widths(bytes: Uint8Array): Promise<number[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => Math.round(page.getWidth()));
}

test('keeps only the chosen pages', async () => {
  const result = await extractPdfPages({ name: 'a.pdf', bytes: await makePdf(5) }, [2, 4]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(await widths(result.bytes), [101, 103]);
  assert.equal(result.pageCount, 2);
});

test('follows the order the pages were written in', async () => {
  const result = await extractPdfPages({ name: 'a.pdf', bytes: await makePdf(3) }, [3, 1]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(await widths(result.bytes), [102, 100]);
});

test('refuses an empty selection', async () => {
  const result = await extractPdfPages({ name: 'a.pdf', bytes: await makePdf(2) }, []);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'EMPTY');
});

test('refuses a page outside the document', async () => {
  const result = await extractPdfPages({ name: 'a.pdf', bytes: await makePdf(2) }, [3]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'PAGE_OUT_OF_RANGE');
});

test('refuses a file that is not a PDF', async () => {
  const result = await extractPdfPages(
    { name: 'x.txt', bytes: Uint8Array.from(Buffer.from('hi', 'utf8')) },
    [1],
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
