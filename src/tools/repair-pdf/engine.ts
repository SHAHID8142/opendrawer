// SPDX-License-Identifier: AGPL-3.0-or-later
// Rebuilds a damaged PDF through qpdf. It recovers structure and streams, not missing pages or
// content that was never saved, and the UI says exactly that.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';
import { runQpdf } from '../../lib/qpdf.ts';

export function repairedName(pdfName: string): string {
  const base = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'document' : base}-repaired.pdf`;
}

export interface RepairInput {
  name: string;
  bytes: Uint8Array;
}

export type RepairErrorCode = 'NOT_PDF' | 'ENCRYPTED' | 'UNRECOVERABLE' | 'FAILED';

export type RepairResult =
  | { ok: true; bytes: Uint8Array; pages: number; before: number; after: number }
  | { ok: false; code: RepairErrorCode; message: string };

export async function repairPdf(input: RepairInput): Promise<RepairResult> {
  if (!looksLikePdf(input.bytes)) {
    return {
      ok: false,
      code: 'NOT_PDF',
      message: `"${input.name}" does not start like a PDF, so there is nothing to repair.`,
    };
  }

  try {
    await PDFDocument.load(input.bytes, { updateMetadata: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return {
        ok: false,
        code: 'ENCRYPTED',
        message: 'This PDF is password protected. Use Unlock first, then repair it if needed.',
      };
    }
    // Other load errors are exactly what repair is for, so continue.
  }

  const outcome = await runQpdf(input.bytes, []);
  if (!outcome.ok) {
    return {
      ok: false,
      code: 'UNRECOVERABLE',
      message: `qpdf could not rebuild this file: ${outcome.message}. The damage may be in the page content itself.`,
    };
  }

  try {
    const pdf = await PDFDocument.load(outcome.bytes, { updateMetadata: false });
    return {
      ok: true,
      bytes: outcome.bytes,
      pages: pdf.getPageCount(),
      before: input.bytes.length,
      after: outcome.bytes.length,
    };
  } catch {
    return {
      ok: false,
      code: 'FAILED',
      message: 'qpdf wrote a file, but it still could not be opened. Keep the original; it may be beyond repair.',
    };
  }
}
