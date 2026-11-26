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
    } else {
      const rel = relative(root, full).split('\\').join('/');
      const isToolTs =
        rel.startsWith('src/tools/') && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts');
      if (entry.name.endsWith('.astro') || entry.name.endsWith('.tsx') || isToolTs) {
        files.push(full);
      }
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

const REGEX_PREV_CHAR = new Set(['=', '(', '[', ',', ':', ';', '!', '&', '|', '?', '{', '}', '\n']);
const REGEX_PREV_WORDS = new Set(['return', 'throw', 'case', 'typeof', 'void', 'delete', 'in', 'of', 'new']);

function canStartRegex(source, slashIndex) {
  let i = slashIndex - 1;
  while (i >= 0 && (source[i] === ' ' || source[i] === '\t')) i -= 1;
  if (i < 0) return true;
  if (REGEX_PREV_CHAR.has(source[i])) return true;
  const word = /[A-Za-z0-9_$]+$/.exec(source.slice(0, i + 1))?.[0];
  return word ? REGEX_PREV_WORDS.has(word) : false;
}

function extractTsStringSegments(source) {
  const segments = [];
  let line = 1;
  let i = 0;

  function scanQuoted(quote) {
    const startLine = line;
    let buf = '';
    i += 1;
    while (i < source.length) {
      const ch = source[i];
      if (ch === '\\') {
        buf += source.slice(i, i + 2);
        if (source[i + 1] === '\n') line += 1;
        i += 2;
        continue;
      }
      if (ch === quote) {
        i += 1;
        break;
      }
      if (ch === '\n') line += 1;
      buf += ch;
      i += 1;
    }
    if (buf) segments.push({ line: startLine, text: buf });
  }

  function scanTemplate() {
    let startLine = line;
    let buf = '';
    i += 1;
    while (i < source.length) {
      const ch = source[i];
      if (ch === '\\') {
        buf += source.slice(i, i + 2);
        if (source[i + 1] === '\n') line += 1;
        i += 2;
        continue;
      }
      if (ch === '`') {
        if (buf) segments.push({ line: startLine, text: buf });
        i += 1;
        return;
      }
      if (ch === '$' && source[i + 1] === '{') {
        if (buf) segments.push({ line: startLine, text: buf });
        buf = '';
        i += 2;
        scanCodeUntilBrace();
        startLine = line;
        continue;
      }
      if (ch === '\n') line += 1;
      buf += ch;
      i += 1;
    }
  }

  function scanCodeUntilBrace() {
    let depth = 1;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '\n') {
        line += 1;
        i += 1;
      } else if (ch === '/' && source[i + 1] === '/') {
        while (i < source.length && source[i] !== '\n') i += 1;
      } else if (ch === '/' && source[i + 1] === '*') {
        i += 2;
        while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
          if (source[i] === '\n') line += 1;
          i += 1;
        }
        i += 2;
      } else if (ch === "'" || ch === '"') {
        scanQuoted(ch);
      } else if (ch === '`') {
        scanTemplate();
      } else if (ch === '/' && canStartRegex(source, i)) {
        i += 1;
        let inClass = false;
        while (i < source.length && source[i] !== '\n') {
          if (source[i] === '\\') {
            i += 2;
            continue;
          }
          if (source[i] === '[') inClass = true;
          else if (source[i] === ']') inClass = false;
          else if (source[i] === '/' && !inClass) {
            i += 1;
            break;
          }
          i += 1;
        }
      } else {
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        i += 1;
      }
    }
  }

  scanCodeUntilBrace();
  return segments;
}

function checkText(relativePath, lineNumber, text, violations) {
  const lower = text.toLowerCase();
  for (const word of banned) {
    if (lower.includes(word)) {
      violations.push(`${relativePath}:${lineNumber}  banned phrase "${word}"`);
    }
  }
  if (/[A-Za-z]!\s|[A-Za-z]!$/.test(text)) {
    violations.push(`${relativePath}:${lineNumber}  exclamation mark in copy`);
  }
}

const violations = [];
const files = await walk(join(root, 'src'));

for (const file of files) {
  const relativePath = relative(root, file).split('\\').join('/');
  const source = await readFile(file, 'utf8');
  if (file.endsWith('.ts')) {
    for (const segment of extractTsStringSegments(source)) {
      segment.text.split('\n').forEach((lineText, offset) => {
        checkText(relativePath, segment.line + offset, lineText, violations);
      });
    }
    continue;
  }
  const text = proseOnly(source, file.endsWith('.astro'));
  text.split('\n').forEach((lineText, index) => {
    checkText(relativePath, index + 1, lineText, violations);
  });
}

if (violations.length > 0) {
  console.error(`UI-G6 failed — ${violations.length} copy problem(s):`);
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log(`UI-G6 pass — ${files.length} files checked for hype and placeholders.`);
