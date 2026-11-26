// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves the repaired-file name and the not-a-PDF refusal.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { repairPdf, repairedName } from '../../src/tools/repair-pdf/engine.ts';

test('names the output after the input', () => {
  assert.equal(repairedName('Broken File.PDF'), 'Broken File-repaired.pdf');
  assert.equal(repairedName('.pdf'), 'document-repaired.pdf');
});

test('refuses bytes that are not a PDF at all', async () => {
  const result = await repairPdf({
    name: 'notes.txt',
    bytes: Uint8Array.from(Buffer.from('hello', 'utf8')),
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
