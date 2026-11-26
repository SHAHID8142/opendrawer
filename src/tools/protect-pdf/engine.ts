// SPDX-License-Identifier: AGPL-3.0-or-later
// Adds an AES-256 password with qpdf. The password is the only recovery route, which the UI
// states plainly; there is no server, no key escrow and no password hint.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';
import { runQpdf } from '../../lib/qpdf.ts';

export const MIN_PASSWORD = 4;
export const MAX_PASSWORD = 128;

export function passwordProblem(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters.`;
  }
  if (password.length > MAX_PASSWORD) {
    return `Use at most ${MAX_PASSWORD} characters.`;
  }
  if (password !== confirmation) return 'The two passwords do not match.';
  return null;
}

export function protectedName(pdfName: string): string {
  const base = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'document' : base}-protected.pdf`;
}

export interface ProtectInput {
  name: string;
  bytes: Uint8Array;
}

export type ProtectErrorCode =
  | 'NOT_PDF'
  | 'ALREADY_ENCRYPTED'
  | 'CORRUPT'
  | 'INVALID_PASSWORD'
  | 'FAILED';

export type ProtectResult =
  | { ok: true; bytes: Uint8Array; pages: number }
  | { ok: false; code: ProtectErrorCode; message: string };

export async function protectPdf(
  input: ProtectInput,
  password: string,
  confirmation: string,
): Promise<ProtectResult> {
  if (!looksLikePdf(input.bytes)) {
    return { ok: false, code: 'NOT_PDF', message: `"${input.name}" is not a PDF file.` };
  }
  const problem = passwordProblem(password, confirmation);
  if (problem) return { ok: false, code: 'INVALID_PASSWORD', message: problem };

  let pages = 0;
  try {
    const pdf = await PDFDocument.load(input.bytes, { updateMetadata: false });
    pages = pdf.getPageCount();
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return {
        ok: false,
        code: 'ALREADY_ENCRYPTED',
        message: 'This PDF is already password protected. Remove the existing password first.',
      };
    }
    return {
      ok: false,
      code: 'CORRUPT',
      message: `"${input.name}" could not be read. The file may be damaged; try Repair first.`,
    };
  }

  // qpdf wants both user and owner passwords before the key length.
  const outcome = await runQpdf(input.bytes, [
    '--encrypt',
    password,
    password,
    '256',
    '--',
  ]);
  if (!outcome.ok) {
    return {
      ok: false,
      code: 'FAILED',
      message: `qpdf could not add the password: ${outcome.message}`,
    };
  }
  return { ok: true, bytes: outcome.bytes, pages };
}
