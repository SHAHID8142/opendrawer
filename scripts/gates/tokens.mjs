#!/usr/bin/env node
// UI-G1 — token lint. Fails on a colour literal, a pixel font size, a millisecond duration
// or an inline style outside the allowed token files.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const allowed = new Set([
  'src/styles/tokens.css',
  'src/lib/theme-colors.ts',
  // PDF drawing colours cannot read CSS variables; one recorded literal instead.
  'src/lib/pdf-ink.ts',
]);
const extensions = new Set(['.css', '.astro', '.tsx', '.ts']);

const rules = [
  {
    id: 'colour-literal',
    test: (line) => /#[0-9a-fA-F]{3,8}\b/.test(line) || /\b(?:rgba?|hsla?)\(/.test(line),
    message: 'colour literal — use a var(--color-*) token',
  },
  {
    id: 'pixel-font-size',
    test: (line) => /font-size:\s*[\d.]+px/.test(line),
    message: 'pixel font size — use a var(--text-*) token in rem',
  },
  {
    id: 'duration-literal',
    test: (line) => /\b(?!0ms)\d+(?:\.\d+)?ms\b/.test(line),
    message: 'millisecond literal — use a var(--duration-*) token',
  },
  {
    id: 'inline-style',
    test: (line) => /style=\{\{/.test(line),
    message: 'inline style object — use a class instead',
  },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      files.push(...(await walk(full)));
    } else if (extensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];
const files = await walk(join(root, 'src'));

for (const file of files) {
  const relativePath = relative(root, file).split('\\').join('/');
  if (allowed.has(relativePath)) continue;
  const lines = (await readFile(file, 'utf8')).split('\n');
  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (rule.test(line)) {
        violations.push(`${relativePath}:${index + 1}  ${rule.id}: ${rule.message}`);
      }
    }
  });
}

if (violations.length > 0) {
  console.error(`UI-G1 failed — ${violations.length} token violation(s):`);
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log(`UI-G1 pass — ${files.length} files checked, no raw design values.`);
