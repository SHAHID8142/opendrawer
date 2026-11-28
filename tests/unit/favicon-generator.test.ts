// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FAVICON_PNGS,
  htmlSnippet,
  manifestJson,
} from '../../src/tools/favicon-generator/engine.ts';

test('lists the expected PNG sizes and names', () => {
  assert.deepEqual(
    FAVICON_PNGS.map((asset) => asset.size),
    [16, 32, 180, 192, 512],
  );
  assert.ok(FAVICON_PNGS.some((asset) => asset.name === 'apple-touch-icon.png'));
});

test('the HTML snippet references every package file', () => {
  const snippet = htmlSnippet();
  assert.match(snippet, /favicon\.ico/);
  assert.match(snippet, /favicon-32x32\.png/);
  assert.match(snippet, /apple-touch-icon\.png/);
  assert.match(snippet, /site\.webmanifest/);
});

test('the manifest points at both Android icons', () => {
  const manifest = JSON.parse(manifestJson()) as { icons: { sizes: string }[] };
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
});
