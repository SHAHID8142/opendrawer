#!/usr/bin/env node
// Validates src/lib/glyph-paths.ts against OpenDrawer Custom Icon Pack standards.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const glyphRaw = await readFile(resolve(root, 'src/lib/glyph-paths.ts'), 'utf8');
const glyphCode = glyphRaw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
const toolsRaw = await readFile(resolve(root, 'src/lib/tools.ts'), 'utf8');

const failures = [];

if (/<text\b/i.test(glyphCode)) {
  failures.push('Found <text> element inside 24x24 icon pack; use pure vector paths only.');
}
if (/#[0-9a-fA-F]{3,8}\b/.test(glyphCode) || /\b(?:rgba?|hsla?)\(/.test(glyphCode)) {
  failures.push('Found raw colour literal in glyph-paths.ts; use currentColor or var(--color-surface).');
}
if (!/fill-opacity="/.test(glyphCode)) {
  failures.push('Expected hierarchical duotone fill-opacity layers in glyph-paths.ts.');
}

const categoriesSection = toolsRaw.split('export const categories')[1]?.split('export const tools')[0] ?? '';
const toolsSection = toolsRaw.split('export const tools')[1] ?? '';

const liveToolMatches = [...toolsSection.matchAll(/id:\s*'([^']+)'[\s\S]*?status:\s*'live'/g)].map((m) => m[1]);
const categoryToneMatches = [...categoriesSection.matchAll(/tone:\s*'([^']+)'/g)].map((m) => m[1]);

for (const id of [...new Set([...liveToolMatches, ...categoryToneMatches])]) {
  const keyPattern = new RegExp(`['"]?${id}['"]?\\s*:`);
  if (!keyPattern.test(glyphCode)) {
    failures.push(`Missing glyph entry in src/lib/glyph-paths.ts for "${id}".`);
  }
}

if (failures.length > 0) {
  console.error(`custom-icon-pack validation failed (${failures.length}):`);
  for (const item of failures) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(
  `custom-icon-pack pass — ${liveToolMatches.length} live tool glyphs and ${categoryToneMatches.length} category glyphs verified.`,
);
