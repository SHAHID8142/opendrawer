// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FAVICON_PNGS,
  htmlSnippet,
  manifestJson,
  type ManifestOptions,
} from '../../src/tools/favicon-generator/engine.ts';

const CUSTOM: ManifestOptions = {
  name: 'My Site',
  shortName: 'MS',
  themeColor: 'navy',
  backgroundColor: 'white',
  maskable: true,
};

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

test('the manifest lists standard and maskable Android icons', () => {
  const manifest = JSON.parse(manifestJson(CUSTOM)) as { icons: { sizes: string; purpose?: string }[] };
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512', '192x192', '512x512']);
  assert.equal(manifest.icons.filter((icon) => icon.purpose === 'maskable').length, 2);
});

test('maskable icons can be turned off', () => {
  const manifest = JSON.parse(manifestJson({ ...CUSTOM, maskable: false })) as {
    icons: { purpose?: string }[];
  };
  assert.equal(manifest.icons.length, 2);
  assert.equal(manifest.icons.some((icon) => icon.purpose === 'maskable'), false);
});

test('the manifest uses custom names and colours, with fallbacks for blanks', () => {
  const manifest = JSON.parse(manifestJson(CUSTOM)) as {
    name: string;
    short_name: string;
    theme_color: string;
  };
  assert.equal(manifest.name, 'My Site');
  assert.equal(manifest.short_name, 'MS');
  assert.equal(manifest.theme_color, 'navy');

  const fallback = JSON.parse(manifestJson({ ...CUSTOM, name: ' ', shortName: '' })) as {
    name: string;
    short_name: string;
  };
  assert.equal(fallback.name, 'Site');
  assert.equal(fallback.short_name, 'Site');
});
