// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves rotation is applied to the right pages and composes with existing rotation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { degrees, PDFDocument } from 'pdf-lib';

import { rotatePdf } from '../../src/tools/rotate-pdf/engine.ts';

async function makePdf(pages: number, initialRotation = 0): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) {
    const page = pdf.addPage([100, 200]);
    if (initialRotation !== 0) page.setRotation(degrees(initialRotation));
  }
  return pdf.save();
}

async function rotations(bytes: Uint8Array): Promise<number[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => page.getRotation().angle);
}

test('rotates every page when the whole document is selected', async () => {
  const result = await rotatePdf({ name: 'a.pdf', bytes: await makePdf(3) }, 90, [1, 2, 3]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(await rotations(result.bytes), [90, 90, 90]);
});

test('rotates only the selected pages', async () => {
  const result = await rotatePdf({ name: 'a.pdf', bytes: await makePdf(3) }, 270, [2]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(await rotations(result.bytes), [0, 270, 0]);
});

test('composes with rotation already in the file', async () => {
  const result = await rotatePdf(
    { name: 'scan.pdf', bytes: await makePdf(1, 270) },
    90,
    [1],
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(await rotations(result.bytes), [0]);
});

test('refuses a page outside the document', async () => {
  const result = await rotatePdf({ name: 'a.pdf', bytes: await makePdf(2) }, 90, [3]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'PAGE_OUT_OF_RANGE');
});

test('refuses an unsupported angle', async () => {
  const result = await rotatePdf({ name: 'a.pdf', bytes: await makePdf(1) }, 45 as 90, [1]);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_ANGLE');
});

test('refuses a file that is not a PDF', async () => {
  const result = await rotatePdf(
    { name: 'notes.txt', bytes: Uint8Array.from(Buffer.from('hello', 'utf8')) },
    90,
    [1],
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NOT_PDF');
});
