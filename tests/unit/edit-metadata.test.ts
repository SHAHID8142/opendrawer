// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves reading and writing the document information dictionary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';

import {
  metadataProblem,
  readMetadata,
  writeMetadata,
} from '../../src/tools/edit-metadata/engine.ts';

async function makePdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Quarterly report');
  pdf.setAuthor('Ada Lovelace');
  pdf.setSubject('Finance');
  pdf.setKeywords(['audit', '2026']);
  pdf.addPage([300, 400]);
  return pdf.save();
}

test('reads the existing information fields', async () => {
  const result = await readMetadata({ name: 'doc.pdf', bytes: await makePdf() });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.metadata.title, 'Quarterly report');
  assert.equal(result.metadata.author, 'Ada Lovelace');
  assert.equal(result.metadata.subject, 'Finance');
  assert.equal(result.metadata.keywords, 'audit, 2026');
});

test('writes new values and removes cleared ones', async () => {
  const result = await writeMetadata(
    { name: 'doc.pdf', bytes: await makePdf() },
    { title: 'Annual report', author: '', subject: 'Audit', keywords: 'one, two' },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getTitle(), 'Annual report');
  assert.equal(pdf.getAuthor(), '');
  assert.equal(pdf.getSubject(), 'Audit');
  assert.equal(pdf.getKeywords(), 'one two');
  assert.equal(pdf.getPageCount(), 1);
});

test('rejects fields that are too long', async () => {
  const problem = metadataProblem({ title: 'x'.repeat(201), author: '', subject: '', keywords: '' });
  assert.match(problem ?? '', /200 characters/);
});

test('refuses a file that is not a PDF', async () => {
  const result = await readMetadata({
    name: 'notes.txt',
    bytes: Uint8Array.from(Buffer.from('hello', 'utf8')),
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
