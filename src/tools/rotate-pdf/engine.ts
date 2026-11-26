// SPDX-License-Identifier: AGPL-3.0-or-later
// Rotates PDF pages. Rotation is a page attribute, so this stays lossless and keeps text.

import { degrees, PDFDocument } from 'pdf-lib';

export type RotationAngle = 90 | 180 | 270;

export interface RotateInput {
  name: string;
  bytes: Uint8Array;
}

export type RotateErrorCode =
  | 'EMPTY'
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'INVALID_ANGLE'
  | 'PAGE_OUT_OF_RANGE'
  | 'FAILED';

export type RotateResult =
  | { ok: true; bytes: Uint8Array; pageCount: number }
  | { ok: false; code: RotateErrorCode; message: string };

export const ANGLES: RotationAngle[] = [90, 180, 270];

function failure(code: RotateErrorCode, message: string): RotateResult {
  return { ok: false, code, message };
}

function isPdf(bytes: Uint8Array): boolean {
  const window = bytes.subarray(0, 1024);
  for (let index = 0; index <= window.length - 5; index += 1) {
    if (
      window[index] === 0x25 &&
      window[index + 1] === 0x50 &&
      window[index + 2] === 0x44 &&
      window[index + 3] === 0x46 &&
      window[index + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

export async function rotatePdf(
  input: RotateInput,
  angle: RotationAngle,
  pages: number[],
): Promise<RotateResult> {
  if (!ANGLES.includes(angle)) {
    return failure('INVALID_ANGLE', 'Choose a rotation of 90, 180 or 270 degrees.');
  }
  if (pages.length === 0) {
    return failure('EMPTY', 'Select at least one page to rotate.');
  }
  if (!isPdf(input.bytes)) {
    return failure('NOT_PDF', `"${input.name}" is not a PDF file.`);
  }

  let pdf;
  try {
    pdf = await PDFDocument.load(input.bytes, { updateMetadata: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${input.name}" is password protected. Remove the password first, then rotate it.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  const pageCount = pdf.getPageCount();
  const unique = [...new Set(pages)];
  for (const pageNumber of unique) {
    if (pageNumber < 1 || pageNumber > pageCount) {
      return failure(
        'PAGE_OUT_OF_RANGE',
        `Page ${pageNumber} does not exist: this document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`,
      );
    }
  }

  try {
    for (const pageNumber of unique) {
      const page = pdf.getPage(pageNumber - 1);
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + angle) % 360));
    }
    return { ok: true, bytes: await pdf.save(), pageCount: unique.length };
  } catch {
    return failure('FAILED', 'The pages could not be rotated. Try a smaller selection.');
  }
}
