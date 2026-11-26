// SPDX-License-Identifier: AGPL-3.0-or-later
// Flattens AcroForm fields into page content so a filled form can no longer be edited.
// It does not render appearance streams that are missing, so a form that relies on the viewer
// to draw its values may flatten to blank fields; the UI states this.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export interface FlattenInput {
  name: string;
  bytes: Uint8Array;
}

export type FlattenErrorCode =
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'NO_FIELDS'
  | 'XFA_UNSUPPORTED'
  | 'FAILED';

export type FlattenResult =
  | { ok: true; bytes: Uint8Array; flattened: number }
  | { ok: false; code: FlattenErrorCode; message: string };

function failure(code: FlattenErrorCode, message: string): FlattenResult {
  return { ok: false, code, message };
}

export async function flattenPdf(input: FlattenInput): Promise<FlattenResult> {
  if (!looksLikePdf(input.bytes)) {
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
        `"${input.name}" is password protected. Remove the password first, then flatten it.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  const form = pdf.getForm();
  if (form.hasXFA()) {
    return failure(
      'XFA_UNSUPPORTED',
      'This is an XFA form. Open it in a desktop PDF reader, print it to a new PDF, then flatten that copy.',
    );
  }

  const fields = form.getFields().length;
  if (fields === 0) {
    return failure('NO_FIELDS', 'There are no form fields in this PDF, so there is nothing to flatten.');
  }

  try {
    form.flatten();
    return { ok: true, bytes: await pdf.save(), flattened: fields };
  } catch {
    return failure(
      'FAILED',
      'The form could not be flattened. Some fields may use an unsupported type; try printing the form to PDF instead.',
    );
  }
}
