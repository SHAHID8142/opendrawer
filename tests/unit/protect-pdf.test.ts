// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves password validation and the protected-file name.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { passwordProblem, protectedName } from '../../src/tools/protect-pdf/engine.ts';

test('rejects short, long and mismatched passwords', () => {
  assert.match(passwordProblem('abc', 'abc') ?? '', /at least 4/);
  assert.match(passwordProblem('abcd', 'abce') ?? '', /do not match/);
  assert.match(passwordProblem('x'.repeat(129), 'x'.repeat(129)) ?? '', /at most 128/);
  assert.equal(passwordProblem('correct horse', 'correct horse'), null);
});

test('names the output after the input', () => {
  assert.equal(protectedName('Contract.PDF'), 'Contract-protected.pdf');
  assert.equal(protectedName('.pdf'), 'document-protected.pdf');
});
