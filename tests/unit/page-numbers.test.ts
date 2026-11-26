// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves page numbering validates its options and keeps every page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import { addPageNumbers } from '../../src/tools/page-numbers/engine.ts';

async function makePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) pdf.addPage([300, 400]);
  return pdf.save();
}

const base = { position: 'bottom-center' as const, format: 'page-of-total' as const, start: 1 };

test('keeps every page and changes the file', async () => {
  const input = await makePdf(3);
  const result = await addPageNumbers({ name: 'a.pdf', bytes: input }, base);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.notEqual(Buffer.from(result.bytes).toString('base64'), Buffer.from(input).toString('base64'));
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 3);
  assert.equal(result.numbered, 3);
});

test('refuses a start below 1', async () => {
  const result = await addPageNumbers({ name: 'a.pdf', bytes: await makePdf(1) }, { ...base, start: 0 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_OPTIONS');
});

test('refuses an unknown position', async () => {
  const result = await addPageNumbers(
    { name: 'a.pdf', bytes: await makePdf(1) },
    { ...base, position: 'middle' as 'bottom-center' },
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_OPTIONS');
});

test('refuses a file that is not a PDF', async () => {
  const result = await addPageNumbers(
    { name: 'x.txt', bytes: Uint8Array.from(Buffer.from('hi', 'utf8')) },
    base,
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
