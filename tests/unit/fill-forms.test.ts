// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves form discovery, value writing and optional flattening with pdf-lib fixtures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { fillForm, inspectForm } from '../../src/tools/fill-forms/engine.ts';

async function makeForm(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 500]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const form = pdf.getForm();
  const text = form.createTextField('full_name');
  text.setText('Ada Lovelace');
  text.addToPage(page, { x: 40, y: 400, width: 240, height: 24, font });
  const check = form.createCheckBox('agree');
  check.addToPage(page, { x: 40, y: 360, width: 16, height: 16 });
  const dropdown = form.createDropdown('country');
  dropdown.addOptions(['United Kingdom', 'Bangladesh']);
  dropdown.select('Bangladesh');
  dropdown.addToPage(page, { x: 40, y: 320, width: 160, height: 24, font });
  return pdf.save();
}

test('lists text, checkbox and dropdown fields with their values', async () => {
  const result = await inspectForm({ name: 'form.pdf', bytes: await makeForm() });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const byName = Object.fromEntries(result.fields.map((field) => [field.name, field]));
  assert.equal(byName.full_name?.kind, 'text');
  assert.equal(byName.full_name?.value, 'Ada Lovelace');
  assert.equal(byName.agree?.kind, 'checkbox');
  assert.equal(byName.agree?.checked, false);
  assert.equal(byName.country?.kind, 'dropdown');
  assert.equal(byName.country?.value, 'Bangladesh');
});

test('writes values and keeps fields editable when flatten is off', async () => {
  const result = await fillForm(
    { name: 'form.pdf', bytes: await makeForm() },
    { values: { full_name: 'Grace Hopper', agree: true }, flatten: false },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const pdf = await PDFDocument.load(result.bytes);
  const form = pdf.getForm();
  assert.equal(form.getTextField('full_name').getText(), 'Grace Hopper');
  assert.equal(form.getCheckBox('agree').isChecked(), true);
});

test('flattening removes the fields after writing values', async () => {
  const result = await fillForm(
    { name: 'form.pdf', bytes: await makeForm() },
    { values: { full_name: 'Grace Hopper' }, flatten: true },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getForm().getFields().length, 0);
});

test('refuses a PDF with no form fields', async () => {
  const empty = await PDFDocument.create();
  empty.addPage([200, 200]);
  const result = await inspectForm({ name: 'plain.pdf', bytes: await empty.save() });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NO_FIELDS');
});
