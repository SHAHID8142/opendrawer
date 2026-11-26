// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves flattening removes form fields while keeping every page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { flattenPdf } from '../../src/tools/flatten-pdf/engine.ts';

async function makeForm(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 400]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const form = pdf.getForm();
  const field = form.createTextField('full_name');
  field.setText('Ada Lovelace');
  field.addToPage(page, { x: 30, y: 300, width: 200, height: 24, font });
  return pdf.save();
}

test('flattens every field and keeps the pages', async () => {
  const result = await flattenPdf({ name: 'form.pdf', bytes: await makeForm() });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.flattened, 1);
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(pdf.getForm().getFields().length, 0);
});

test('refuses a document with no form fields', async () => {
  const empty = await PDFDocument.create();
  empty.addPage([200, 200]);
  const result = await flattenPdf({ name: 'plain.pdf', bytes: await empty.save() });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NO_FIELDS');
});

test('refuses a file that is not a PDF', async () => {
  const result = await flattenPdf({
    name: 'notes.txt',
    bytes: Uint8Array.from(Buffer.from('hello', 'utf8')),
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
