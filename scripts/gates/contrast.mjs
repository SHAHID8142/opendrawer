#!/usr/bin/env node
// UI-G2 — contrast, computed from the token file itself, for both themes.
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url).pathname;

function channel(value) {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((character) => character + character)
          .join('')
      : clean;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function ratio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseBlocks(css) {
  const blocks = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = pattern.exec(css)) !== null) {
    const selector = match[1].trim();
    const declarations = match[2];
    const vars = {};
    for (const declaration of declarations.split(';')) {
      const entry = /--([\w-]+):\s*([^;]+)/.exec(declaration);
      if (entry) vars[entry[1]] = entry[2].trim();
    }
    if (Object.keys(vars).length > 0) blocks.push({ selector, vars });
  }
  return blocks;
}

const tokensCss = await readFile(`${root}src/styles/tokens.css`, 'utf8');
// Strip comments first: the selector of the first block otherwise inherits the file header.
const blocks = parseBlocks(tokensCss.replace(/\/\*[\s\S]*?\*\//g, ''));

const light = blocks.find((block) => block.selector === ':root')?.vars;
const dark = blocks.find((block) => block.selector.includes("[data-theme='dark']"))?.vars;
const mediaDark = blocks.find((block) => block.selector.includes('prefers-color-scheme: dark'))?.vars;

const failures = [];

if (!light || !dark) {
  console.error('UI-G2 failed — could not find both :root and the dark theme block in tokens.css.');
  process.exit(1);
}

if (mediaDark) {
  for (const [name, value] of Object.entries(dark)) {
    if (mediaDark[name] && mediaDark[name] !== value) {
      failures.push(`theme drift: --${name} is ${value} in [data-theme='dark'] but ${mediaDark[name]} in the media query`);
    }
  }
}

const pairs = [
  ['text', 'bg', 7],
  ['text', 'surface', 7],
  ['text-muted', 'bg', 4.5],
  ['text-muted', 'surface', 4.5],
  ['border', 'bg', 3],
  ['border', 'surface', 3],
  ['accent', 'bg', 4.5],
  ['accent', 'surface', 4.5],
  ['on-accent', 'accent', 4.5],
  ['focus', 'bg', 3],
  ['danger', 'bg', 4.5],
  ['warning', 'bg', 4.5],
  ['success', 'bg', 4.5],
];

for (const [themeName, theme] of [
  ['light', light],
  ['dark', dark],
]) {
  for (const [foreground, background, minimum] of pairs) {
    const fg = theme[`color-${foreground}`];
    const bg = theme[`color-${background}`];
    if (!fg || !bg) {
      failures.push(`${themeName}: missing token --color-${fg ? background : foreground}`);
      continue;
    }
    const value = ratio(fg, bg);
    const rounded = Math.round(value * 100) / 100;
    if (value < minimum) {
      failures.push(`${themeName}: ${foreground} on ${background} is ${rounded}:1, needs ${minimum}:1`);
    } else {
      console.log(`  ${themeName} ${foreground} on ${background}: ${rounded}:1 (min ${minimum})`);
    }
  }
}

// The <meta theme-color> literals must match the background tokens.
const themeColors = await readFile(`${root}src/lib/theme-colors.ts`, 'utf8');
const lightMeta = /THEME_COLOR_LIGHT = '([^']+)'/.exec(themeColors)?.[1];
const darkMeta = /THEME_COLOR_DARK = '([^']+)'/.exec(themeColors)?.[1];
if (lightMeta?.toLowerCase() !== light['color-bg']?.toLowerCase()) {
  failures.push(`theme-colors.ts light value ${lightMeta} does not match --color-bg ${light['color-bg']}`);
}
if (darkMeta?.toLowerCase() !== dark['color-bg']?.toLowerCase()) {
  failures.push(`theme-colors.ts dark value ${darkMeta} does not match --color-bg ${dark['color-bg']}`);
}

if (failures.length > 0) {
  console.error(`UI-G2 failed — ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log('UI-G2 pass — every declared pair meets its threshold in both themes.');
