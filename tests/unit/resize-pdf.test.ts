// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves resizing produces the target paper size on every page and keeps the page count.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { PAPERS, resizePdf } from '../../src/tools/resize-pdf/engine.ts';

async function makePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pages; index += 1) {
    const page = pdf.addPage([400, 500]);
    page.drawText(`Source ${index + 1}`, { x: 40, y: 440, size: 16, font });
  }
  return pdf.save();
}

test('creates A4 pages from a different source size', async () => {
  const result = await resizePdf({ name: 'doc.pdf', bytes: await makePdf(2) }, 'a4');
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 2);
  for (const page of pdf.getPages()) {
    const size = page.getSize();
    assert.ok(Math.abs(size.width - PAPERS.a4.width) < 0.01);
    assert.ok(Math.abs(size.height - PAPERS.a4.height) < 0.01);
  }
});

test('supports US Letter and A5', async () => {
  for (const target of ['letter', 'a5'] as const) {
    const result = await resizePdf({ name: 'doc.pdf', bytes: await makePdf(1) }, target);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const pdf = await PDFDocument.load(result.bytes);
    assert.ok(Math.abs(pdf.getPage(0).getWidth() - PAPERS[target].width) < 0.01);
    assert.ok(Math.abs(pdf.getPage(0).getHeight() - PAPERS[target].height) < 0.01);
  }
});

test('refuses a file that is not a PDF', async () => {
  const result = await resizePdf(
    { name: 'notes.txt', bytes: Uint8Array.from(Buffer.from('hello', 'utf8')) },
    'a4',
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
