// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves the unlocked-file name and the empty-password guard.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { unlockPdf, unlockedName } from '../../src/tools/unlock-pdf/engine.ts';

test('names the output after the input', () => {
  assert.equal(unlockedName('Statement.PDF'), 'Statement-unlocked.pdf');
  assert.equal(unlockedName('.pdf'), 'document-unlocked.pdf');
});

test('asks for a password before touching the file', async () => {
  const result = await unlockPdf(
    { name: 'locked.pdf', bytes: Uint8Array.from(Buffer.from('%PDF-1.7\n', 'utf8')) },
    '',
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NO_PASSWORD');
});
