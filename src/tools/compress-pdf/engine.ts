// SPDX-License-Identifier: AGPL-3.0-or-later
// Lossless optimisation with qpdf: object streams, recompressed streams and max flate level.
// It never downsamples images, so a photo-heavy scan will barely shrink — the UI says so.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';
import { runQpdf } from '../../lib/qpdf.ts';

export interface CompressInput {
  name: string;
  bytes: Uint8Array;
}

export type CompressErrorCode = 'NOT_PDF' | 'ENCRYPTED' | 'CORRUPT' | 'FAILED';

export type CompressResult =
  | { ok: true; bytes: Uint8Array; before: number; after: number; keptOriginal: boolean }
  | { ok: false; code: CompressErrorCode; message: string };

export const OPTIMISE_ARGS = [
  '--object-streams=generate',
  '--recompress-flate',
  '--compression-level=9',
  '--stream-data=compress',
];

export function savings(before: number, after: number): number {
  if (before <= 0 || after >= before) return 0;
  return Math.round(((before - after) / before) * 100);
}

export function shouldKeepOriginal(before: number, after: number): boolean {
  return after >= before;
}

export function compressedName(pdfName: string): string {
  const base = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'document' : base}-compressed.pdf`;
}

export async function compressPdf(input: CompressInput): Promise<CompressResult> {
  if (!looksLikePdf(input.bytes)) {
    return { ok: false, code: 'NOT_PDF', message: `"${input.name}" is not a PDF file.` };
  }

  let pdf;
  try {
    pdf = await PDFDocument.load(input.bytes, { updateMetadata: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return {
        ok: false,
        code: 'ENCRYPTED',
        message: `"${input.name}" is password protected. Remove the password first, then optimise it.`,
      };
    }
    return {
      ok: false,
      code: 'CORRUPT',
      message: `"${input.name}" could not be read. The file may be damaged; try Repair first.`,
    };
  }
  if (pdf.getPageCount() === 0) {
    return { ok: false, code: 'CORRUPT', message: 'This PDF has no pages to optimise.' };
  }

  const outcome = await runQpdf(input.bytes, OPTIMISE_ARGS);
  if (!outcome.ok) {
    return {
      ok: false,
      code: 'FAILED',
      message: `qpdf could not optimise this file: ${outcome.message}`,
    };
  }

  if (shouldKeepOriginal(input.bytes.length, outcome.bytes.length)) {
    return {
      ok: true,
      bytes: input.bytes,
      before: input.bytes.length,
      after: input.bytes.length,
      keptOriginal: true,
    };
  }
  return {
    ok: true,
    bytes: outcome.bytes,
    before: input.bytes.length,
    after: outcome.bytes.length,
    keptOriginal: false,
  };
}
