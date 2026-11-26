// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves split produces the right pages per output and refuses bad selections.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import { splitPdf } from '../../src/tools/split-pdf/engine.ts';
import { parsePageGroups } from '../../src/lib/page-range.ts';

async function makePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) pdf.addPage([100 + index, 100 + index]);
  return pdf.save();
}

async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => Math.round(page.getWidth()));
}

test('groups comma-separated pieces into separate outputs', () => {
  const groups = parsePageGroups('1-2, 4', 4);
  assert.deepEqual(groups.map((group) => group.pages), [[1, 2], [4]]);
});

test('an empty selection means the whole document', () => {
  const groups = parsePageGroups('', 3);
  assert.deepEqual(groups[0]?.pages, [1, 2, 3]);
});

test('rejects ranges outside the document', () => {
  assert.throws(() => parsePageGroups('2-5', 3), /outside this document/);
});

test('splits a document into one PDF per range, keeping page order', async () => {
  const bytes = await makePdf(4);
  const result = await splitPdf({ name: 'report.pdf', bytes }, parsePageGroups('1-2, 4', 4));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.files.length, 2);
  assert.deepEqual(await pageWidths(result.files[0]!.bytes), [100, 101]);
  assert.deepEqual(await pageWidths(result.files[1]!.bytes), [103]);
  assert.equal(result.files[0]!.name, 'report-pages-1-2.pdf');
});

test('one file per page uses zero-padded names', async () => {
  const bytes = await makePdf(3);
  const groups = [{ pages: [1], label: '1' }, { pages: [2], label: '2' }, { pages: [3], label: '3' }];
  const result = await splitPdf({ name: 'scan.pdf', bytes }, groups);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.files.length, 3);
  assert.equal(result.files[0]!.name, 'scan-page-001.pdf');
  assert.equal(result.files[2]!.name, 'scan-page-003.pdf');
});

test('refuses a selection that is out of range', async () => {
  const result = await splitPdf({ name: 'a.pdf', bytes: await makePdf(2) }, [
    { pages: [3], label: '3' },
  ]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'PAGE_OUT_OF_RANGE');
});

test('refuses a file that is not a PDF', async () => {
  const result = await splitPdf(
    { name: 'notes.txt', bytes: Uint8Array.from(Buffer.from('hello', 'utf8')) },
    [{ pages: [1], label: '1' }],
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
