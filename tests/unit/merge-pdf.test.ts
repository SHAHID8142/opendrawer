// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves merge keeps page order and refuses inputs it cannot honestly merge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import { mergePdfs } from '../../src/tools/merge-pdf/engine.ts';

async function makePdf(sizes: [number, number][]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const [width, height] of sizes) pdf.addPage([width, height]);
  return pdf.save();
}

test('refuses an empty selection', async () => {
  const result = await mergePdfs([]);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, 'EMPTY');
});

test('keeps file order and page order', async () => {
  const first = await makePdf([[100, 100], [110, 110]]);
  const second = await makePdf([[200, 200]]);
  const result = await mergePdfs([
    { name: 'a.pdf', bytes: first },
    { name: 'b.pdf', bytes: second },
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const merged = await PDFDocument.load(result.bytes);
  assert.equal(merged.getPageCount(), 3);
  assert.deepEqual(
    merged.getPages().map((page) => Math.round(page.getWidth())),
    [100, 110, 200],
  );
});

test('refuses bytes that are not a PDF', async () => {
  const result = await mergePdfs([
    { name: 'notes.txt', bytes: Uint8Array.from(Buffer.from('hello there', 'utf8')) },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, 'NOT_PDF');
});

test('refuses a truncated PDF with a readable reason', async () => {
  const full = await makePdf([[100, 100]]);
  const broken = full.slice(0, Math.floor(full.length / 2));
  const result = await mergePdfs([{ name: 'broken.pdf', bytes: broken }]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'CORRUPT');
  assert.match(result.message, /broken\.pdf/);
});
