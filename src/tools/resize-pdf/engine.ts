// SPDX-License-Identifier: AGPL-3.0-or-later
// Puts every page on a chosen paper size by embedding the original page and scaling it to fit.
// Links, annotations and form fields do not survive the rebuild, so the UI says so.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export type PaperSize = 'a4' | 'letter' | 'a5';

export interface Paper {
  label: string;
  width: number;
  height: number;
}

/** Millimetre sizes converted to PDF points (1 pt = 1/72 inch). */
export const PAPERS: Record<PaperSize, Paper> = {
  a4: { label: 'A4 (210 × 297 mm)', width: 595.28, height: 841.89 },
  letter: { label: 'US Letter (8.5 × 11 in)', width: 612, height: 792 },
  a5: { label: 'A5 (148 × 210 mm)', width: 419.53, height: 595.28 },
};

export interface ResizeInput {
  name: string;
  bytes: Uint8Array;
}

export type ResizeErrorCode = 'NOT_PDF' | 'ENCRYPTED' | 'CORRUPT' | 'FAILED';

export type ResizeResult =
  | { ok: true; bytes: Uint8Array; pages: number }
  | { ok: false; code: ResizeErrorCode; message: string };

function failure(code: ResizeErrorCode, message: string): ResizeResult {
  return { ok: false, code, message };
}

export async function resizePdf(input: ResizeInput, target: PaperSize): Promise<ResizeResult> {
  if (!looksLikePdf(input.bytes)) {
    return failure('NOT_PDF', `"${input.name}" is not a PDF file.`);
  }

  let source;
  try {
    source = await PDFDocument.load(input.bytes, { updateMetadata: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${input.name}" is password protected. Remove the password first, then resize it.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  const paper = PAPERS[target];
  try {
    const output = await PDFDocument.create();
    for (const sourcePage of source.getPages()) {
      const embedded = await output.embedPage(sourcePage);
      const size = sourcePage.getSize();
      const scale = Math.min(paper.width / size.width, paper.height / size.height);
      const width = size.width * scale;
      const height = size.height * scale;
      const page = output.addPage([paper.width, paper.height]);
      page.drawPage(embedded, {
        x: (paper.width - width) / 2,
        y: (paper.height - height) / 2,
        xScale: scale,
        yScale: scale,
      });
    }
    return { ok: true, bytes: await output.save(), pages: source.getPageCount() };
  } catch {
    return failure('FAILED', 'The pages could not be placed on the new paper size.');
  }
}
