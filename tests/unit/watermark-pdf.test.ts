// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves watermarks validate their options and reach every page without changing page count.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import { watermarkPdf } from '../../src/tools/watermark-pdf/engine.ts';

async function makePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) pdf.addPage([300, 400]);
  return pdf.save();
}

const base = { text: 'CONFIDENTIAL', opacity: 0.2, size: 40, diagonal: true };

test('keeps the page count and changes the file', async () => {
  const input = await makePdf(3);
  const result = await watermarkPdf({ name: 'a.pdf', bytes: input }, base);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.notEqual(Buffer.from(result.bytes).toString('base64'), Buffer.from(input).toString('base64'));
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 3);
  assert.equal(result.watermarked, 3);
});

test('refuses empty text', async () => {
  const result = await watermarkPdf({ name: 'a.pdf', bytes: await makePdf(1) }, { ...base, text: '   ' });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_OPTIONS');
});

test('refuses text longer than the limit', async () => {
  const result = await watermarkPdf(
    { name: 'a.pdf', bytes: await makePdf(1) },
    { ...base, text: 'x'.repeat(81) },
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_OPTIONS');
});

test('refuses opacity outside 0.05–1', async () => {
  const result = await watermarkPdf(
    { name: 'a.pdf', bytes: await makePdf(1) },
    { ...base, opacity: 0 },
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_OPTIONS');
});

test('refuses a file that is not a PDF', async () => {
  const result = await watermarkPdf(
    { name: 'x.txt', bytes: Uint8Array.from(Buffer.from('hi', 'utf8')) },
    base,
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
