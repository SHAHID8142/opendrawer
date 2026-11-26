// SPDX-License-Identifier: AGPL-3.0-or-later
// Reads and fills AcroForm fields (text, checkbox, dropdown, radio, option list), with an
// optional flatten so the result cannot be edited again. XFA forms are refused.

import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  type PDFField,
} from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export type FieldKind = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'optionlist' | 'unsupported';

export interface FormField {
  name: string;
  kind: FieldKind;
  value: string;
  checked: boolean;
  options: string[];
  maxLength: number | null;
}

export interface FormInput {
  name: string;
  bytes: Uint8Array;
}

export type FormErrorCode =
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'NO_FIELDS'
  | 'XFA_UNSUPPORTED'
  | 'INVALID_VALUE'
  | 'TOO_LONG'
  | 'FAILED';

export type InspectResult =
  | { ok: true; fields: FormField[]; pages: number }
  | { ok: false; code: FormErrorCode; message: string };

export type FillResult =
  | { ok: true; bytes: Uint8Array; filled: number; flattened: boolean }
  | { ok: false; code: FormErrorCode; message: string };

function failure<T extends FormErrorCode>(code: T, message: string) {
  return { ok: false as const, code, message };
}

async function open(input: FormInput): Promise<
  | { ok: true; pdf: PDFDocument }
  | { ok: false; code: FormErrorCode; message: string }
> {
  if (!looksLikePdf(input.bytes)) return failure('NOT_PDF', `"${input.name}" is not a PDF file.`);
  try {
    const pdf = await PDFDocument.load(input.bytes, { updateMetadata: false });
    return { ok: true, pdf };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${input.name}" is password protected. Remove the password first, then fill it.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged; try Repair first.`,
    );
  }
}

function readField(field: PDFField): FormField {
  const base = { options: [] as string[], value: '', checked: false, maxLength: null as number | null };
  if (field instanceof PDFTextField) {
    return {
      name: field.getName(),
      kind: 'text',
      ...base,
      value: field.getText() ?? '',
      maxLength: field.getMaxLength() ?? null,
    };
  }
  if (field instanceof PDFCheckBox) {
    return { name: field.getName(), kind: 'checkbox', ...base, checked: field.isChecked() };
  }
  if (field instanceof PDFDropdown) {
    return {
      name: field.getName(),
      kind: 'dropdown',
      ...base,
      value: field.getSelected()[0] ?? '',
      options: field.getOptions(),
    };
  }
  if (field instanceof PDFRadioGroup) {
    return {
      name: field.getName(),
      kind: 'radio',
      ...base,
      value: field.getSelected() ?? '',
      options: field.getOptions(),
    };
  }
  if (field instanceof PDFOptionList) {
    return {
      name: field.getName(),
      kind: 'optionlist',
      ...base,
      value: field.getSelected()[0] ?? '',
      options: field.getOptions(),
    };
  }
  return { name: field.getName(), kind: 'unsupported', ...base };
}

export async function inspectForm(input: FormInput): Promise<InspectResult> {
  const opened = await open(input);
  if (!opened.ok) return opened;
  const { pdf } = opened;
  const form = pdf.getForm();
  if (form.hasXFA()) {
    return failure(
      'XFA_UNSUPPORTED',
      'This is an XFA form. Open it in a desktop PDF reader, print it to a new PDF, then fill that copy.',
    );
  }
  const fields = form.getFields().map((field) => readField(field));
  const fillable = fields.filter((field) => field.kind !== 'unsupported');
  if (fillable.length === 0) {
    return failure('NO_FIELDS', 'There are no fillable form fields in this PDF.');
  }
  return { ok: true, fields: fillable, pages: pdf.getPageCount() };
}

export async function fillForm(
  input: FormInput,
  options: { values: Record<string, string | boolean>; flatten: boolean },
): Promise<FillResult> {
  const opened = await open(input);
  if (!opened.ok) return opened;
  const { pdf } = opened;
  const form = pdf.getForm();
  if (form.hasXFA()) {
    return failure('XFA_UNSUPPORTED', 'This is an XFA form, which this tool cannot fill.');
  }
  const fields = form.getFields();
  if (fields.length === 0) return failure('NO_FIELDS', 'There are no form fields to fill.');

  let filled = 0;
  try {
    for (const field of fields) {
      const name = field.getName();
      if (!(name in options.values)) continue;
      const value = options.values[name];
      if (field instanceof PDFTextField && typeof value === 'string') {
        const max = field.getMaxLength() ?? null;
        if (max !== null && value.length > max) {
          return failure(
            'TOO_LONG',
            `"${name}" allows at most ${max} characters; this entry has ${value.length}.`,
          );
        }
        field.setText(value);
        filled += 1;
      } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
        if (value) field.check();
        else field.uncheck();
        filled += 1;
      } else if (field instanceof PDFDropdown && typeof value === 'string') {
        if (!field.getOptions().includes(value)) {
          return failure('INVALID_VALUE', `"${value}" is not an option for the field "${name}".`);
        }
        field.select(value);
        filled += 1;
      } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
        if (!field.getOptions().includes(value)) {
          return failure('INVALID_VALUE', `"${value}" is not an option for the field "${name}".`);
        }
        field.select(value);
        filled += 1;
      } else if (field instanceof PDFOptionList && typeof value === 'string') {
        if (!field.getOptions().includes(value)) {
          return failure('INVALID_VALUE', `"${value}" is not an option for the field "${name}".`);
        }
        field.select(value);
        filled += 1;
      }
    }

    if (options.flatten) form.flatten();
    return {
      ok: true,
      bytes: await pdf.save(),
      filled,
      flattened: options.flatten,
    };
  } catch {
    return failure(
      'FAILED',
      'The values could not be written. A field may use an appearance this tool cannot regenerate.',
    );
  }
}
