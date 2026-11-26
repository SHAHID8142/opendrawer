// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves redaction geometry: clamping, ordering and the minimum drag size.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MIN_RECT,
  normalizeRect,
  redactedName,
  rectToPixels,
} from '../../src/tools/redact-pdf/engine.ts';

test('normalises a drag regardless of direction', () => {
  const rect = normalizeRect({ x: 80, y: 60 }, { x: 20, y: 10 }, 200, 100);
  assert.ok(rect);
  if (!rect) return;
  assert.ok(Math.abs(rect.x - 0.1) < 1e-9);
  assert.ok(Math.abs(rect.y - 0.1) < 1e-9);
  assert.ok(Math.abs(rect.width - 0.3) < 1e-9);
  assert.ok(Math.abs(rect.height - 0.5) < 1e-9);
});

test('clamps a drag that runs off the canvas', () => {
  const rect = normalizeRect({ x: -20, y: 130 }, { x: 250, y: -10 }, 200, 100);
  assert.ok(rect);
  if (!rect) return;
  assert.ok(rect.x >= 0 && rect.y >= 0);
  assert.ok(rect.x + rect.width <= 1.0000001);
  assert.ok(rect.y + rect.height <= 1.0000001);
});

test('ignores a click-sized drag', () => {
  assert.equal(normalizeRect({ x: 10, y: 10 }, { x: 11, y: 11 }, 1000, 1000), null);
  assert.notEqual(
    normalizeRect({ x: 10, y: 10 }, { x: 10 + MIN_RECT + 1, y: 10 + MIN_RECT + 1 }, 1000, 1000),
    null,
  );
});

test('converts a stored rect back to canvas pixels', () => {
  const pixels = rectToPixels({ x: 0.1, y: 0.2, width: 0.5, height: 0.25 }, 400, 200);
  assert.deepEqual(pixels, { x: 40, y: 40, width: 200, height: 50 });
});

test('names the redacted file after the input', () => {
  assert.equal(redactedName('Contract.PDF'), 'Contract-redacted.pdf');
});
