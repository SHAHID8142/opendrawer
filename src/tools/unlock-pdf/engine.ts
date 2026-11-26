// SPDX-License-Identifier: AGPL-3.0-or-later
// Removes a password the user already knows, using qpdf --decrypt. No cracking, no guessing.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';
import { runQpdf } from '../../lib/qpdf.ts';

export function unlockedName(pdfName: string): string {
  const base = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'document' : base}-unlocked.pdf`;
}

export interface UnlockInput {
  name: string;
  bytes: Uint8Array;
}

export type UnlockErrorCode =
  | 'NOT_PDF'
  | 'NOT_ENCRYPTED'
  | 'CORRUPT'
  | 'NO_PASSWORD'
  | 'WRONG_PASSWORD'
  | 'FAILED';

export type UnlockResult =
  | { ok: true; bytes: Uint8Array; pages: number }
  | { ok: false; code: UnlockErrorCode; message: string };

export async function unlockPdf(input: UnlockInput, password: string): Promise<UnlockResult> {
  if (!looksLikePdf(input.bytes)) {
    return { ok: false, code: 'NOT_PDF', message: `"${input.name}" is not a PDF file.` };
  }
  if (password === '') {
    return { ok: false, code: 'NO_PASSWORD', message: 'Type the password this PDF already uses.' };
  }

  try {
    await PDFDocument.load(input.bytes, { updateMetadata: false });
    return {
      ok: false,
      code: 'NOT_ENCRYPTED',
      message: 'This PDF has no password to remove. You can use it as it is.',
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (!/encrypt|password/i.test(message)) {
      return {
        ok: false,
        code: 'CORRUPT',
        message: `"${input.name}" could not be read. The file may be damaged; try Repair instead.`,
      };
    }
  }

  const outcome = await runQpdf(input.bytes, [`--password=${password}`, '--decrypt']);
  if (!outcome.ok) {
    if (/password|invalid/i.test(outcome.message)) {
      return {
        ok: false,
        code: 'WRONG_PASSWORD',
        message: 'That password did not open the PDF. Check it and try again; nothing was changed.',
      };
    }
    return {
      ok: false,
      code: 'FAILED',
      message: `qpdf could not remove the password: ${outcome.message}`,
    };
  }

  try {
    const pdf = await PDFDocument.load(outcome.bytes, { updateMetadata: false });
    return { ok: true, bytes: outcome.bytes, pages: pdf.getPageCount() };
  } catch {
    return {
      ok: false,
      code: 'FAILED',
      message: 'The password was accepted, but the unlocked file could not be verified.',
    };
  }
}
