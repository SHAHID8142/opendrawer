// SPDX-License-Identifier: AGPL-3.0-or-later
// Copies the self-hosted OCR worker, WASM cores and English language data into public/ocr so the
// browser never downloads them from a CDN. Regenerated on every dev/build run; not committed.
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'public', 'ocr');
const coreOut = join(out, 'core');
const langOut = join(out, 'lang');

// LSTM builds only, in three tiers: relaxed SIMD (Apple), SIMD (most phones) and plain (old
// devices). Tesseract picks one at runtime; a missing variant is a hard worker failure.
const CORE = [
  'tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-lstm.wasm',
];

async function main() {
  const worker = join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js');
  const coreDir = join(root, 'node_modules', 'tesseract.js-core');
  const lang = join(
    root,
    'node_modules',
    '@tesseract.js-data',
    'eng',
    '4.0.0_best_int',
    'eng.traineddata.gz',
  );
  if (!existsSync(worker) || !existsSync(lang)) {
    console.warn('OCR assets: packages are not installed, skipping the copy.');
    return;
  }
  await mkdir(coreOut, { recursive: true });
  await mkdir(langOut, { recursive: true });
  await copyFile(worker, join(out, 'worker.min.js'));
  for (const name of CORE) await copyFile(join(coreDir, name), join(coreOut, name));
  await copyFile(lang, join(langOut, 'eng.traineddata.gz'));
}

await main();
