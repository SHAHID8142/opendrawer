// SPDX-License-Identifier: AGPL-3.0-or-later
// Reads and writes the PDF information dictionary (title, author, subject, keywords). XMP
// metadata written by the producer can still exist elsewhere, which the UI states.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export interface MetadataFields {
  title: string;
  author: string;
  subject: string;
  keywords: string;
}

export interface MetadataInput {
  name: string;
  bytes: Uint8Array;
}

export const LIMITS: Record<keyof MetadataFields, number> = {
  title: 200,
  author: 100,
  subject: 300,
  keywords: 200,
};

export type MetadataErrorCode = 'NOT_PDF' | 'ENCRYPTED' | 'CORRUPT' | 'TOO_LONG' | 'FAILED';

export type ReadResult =
  | { ok: true; metadata: MetadataFields; pages: number }
  | { ok: false; code: MetadataErrorCode; message: string };

export type WriteResult =
  | { ok: true; bytes: Uint8Array; pages: number }
  | { ok: false; code: MetadataErrorCode; message: string };

const LABELS: Record<keyof MetadataFields, string> = {
  title: 'Title',
  author: 'Author',
  subject: 'Subject',
  keywords: 'Keywords',
};

export function metadataProblem(fields: MetadataFields): string | null {
  for (const key of Object.keys(LIMITS) as (keyof MetadataFields)[]) {
    if (fields[key].length > LIMITS[key]) {
      return `${LABELS[key]} allows at most ${LIMITS[key]} characters.`;
    }
  }
  return null;
}

export function metadataFileName(pdfName: string): string {
  const base = pdfName
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 60)
    .trim();
  return `${base === '' || base === '.' ? 'document' : base}-metadata.pdf`;
}

function failure<T extends MetadataErrorCode>(code: T, message: string) {
  return { ok: false as const, code, message };
}

async function open(input: MetadataInput) {
  if (!looksLikePdf(input.bytes)) return failure('NOT_PDF', `"${input.name}" is not a PDF file.`);
  try {
    return { ok: true as const, pdf: await PDFDocument.load(input.bytes, { updateMetadata: false }) };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${input.name}" is password protected. Remove the password first, then edit its details.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged; try Repair first.`,
    );
  }
}

export async function readMetadata(input: MetadataInput): Promise<ReadResult> {
  const opened = await open(input);
  if (!opened.ok) return opened;
  const { pdf } = opened;
  return {
    ok: true,
    metadata: {
      title: pdf.getTitle() ?? '',
      author: pdf.getAuthor() ?? '',
      subject: pdf.getSubject() ?? '',
      keywords: (pdf.getKeywords() ?? '')
        .split(/\s+/)
        .filter((word) => word !== '')
        .join(', '),
    },
    pages: pdf.getPageCount(),
  };
}

export async function writeMetadata(
  input: MetadataInput,
  fields: MetadataFields,
): Promise<WriteResult> {
  const problem = metadataProblem(fields);
  if (problem) return failure('TOO_LONG', problem);
  const opened = await open(input);
  if (!opened.ok) return opened;
  const { pdf } = opened;

  try {
    pdf.setTitle(fields.title.trim());
    pdf.setAuthor(fields.author.trim());
    pdf.setSubject(fields.subject.trim());
    const keywords = fields.keywords
      .split(',')
      .map((word) => word.trim())
      .filter((word) => word !== '');
    pdf.setKeywords(keywords);
    return { ok: true, bytes: await pdf.save(), pages: pdf.getPageCount() };
  } catch {
    return failure('FAILED', 'The details could not be written to the file.');
  }
}
