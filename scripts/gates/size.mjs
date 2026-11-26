#!/usr/bin/env node
// UI-G10 — file size. Large files hide responsibilities and invite regressions.
// Hard ceiling 300 lines for source, style and gate code; warn from 220 so a file
// is split by concern before it becomes a dumping ground.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const extensions = new Set(['.ts', '.tsx', '.astro', '.css', '.mjs']);
const hardLimit = 300;
const warnLimit = 220;

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

const files = [...(await walk(join(root, 'src'))), ...(await walk(join(root, 'scripts')))];
const failures = [];
const warnings = [];

for (const file of files) {
  const path = relative(root, file).split('\\').join('/');
  const lines = (await readFile(file, 'utf8')).split('\n').length;
  if (lines > hardLimit) failures.push(`${path}: ${lines} lines (max ${hardLimit})`);
  else if (lines >= warnLimit) warnings.push(`${path}: ${lines} lines (target < ${warnLimit})`);
}

for (const warning of warnings) console.warn(`  warn ${warning}`);

if (failures.length > 0) {
  console.error(`UI-G10 failed — ${failures.length} oversized file(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error('Split by responsibility; do not raise the limit.');
  process.exit(1);
}

console.log(`UI-G10 pass — ${files.length} files under ${hardLimit} lines.`);
