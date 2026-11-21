#!/usr/bin/env node
// UI-G6 — copy lint. Plain words, no hype, no exclamation marks, no placeholder text.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;

const banned = [
  'seamless',
  'powerful',
  'revolutionary',
  'world-class',
  'cutting-edge',
  'blazing',
  'effortless',
  'unleash',
  'game-changer',
  'best-in-class',
  'supercharge',
  'just works',
  'lorem ipsum',
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.name.endsWith('.astro') || entry.name.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

function proseOnly(source, isAstro) {
  let text = source;
  if (isAstro) text = text.replace(/^---[\s\S]*?---/, '');
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}

const violations = [];
const files = await walk(join(root, 'src'));

for (const file of files) {
  const relativePath = relative(root, file).split('\\').join('/');
  const text = proseOnly(await readFile(file, 'utf8'), file.endsWith('.astro'));
  text.split('\n').forEach((line, index) => {
    const lower = line.toLowerCase();
    for (const word of banned) {
      if (lower.includes(word)) {
        violations.push(`${relativePath}:${index + 1}  banned phrase "${word}"`);
      }
    }
    if (/[A-Za-z]!\s|[A-Za-z]!$/.test(line)) {
      violations.push(`${relativePath}:${index + 1}  exclamation mark in copy`);
    }
  });
}

if (violations.length > 0) {
  console.error(`UI-G6 failed — ${violations.length} copy problem(s):`);
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log(`UI-G6 pass — ${files.length} files checked for hype and placeholders.`);
