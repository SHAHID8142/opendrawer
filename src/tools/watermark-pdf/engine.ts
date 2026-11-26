// SPDX-License-Identifier: AGPL-3.0-or-later
// Stamps a text watermark on every page. Adds a text layer; the page content is untouched.

import { degrees, PDFDocument, StandardFonts } from 'pdf-lib';
import { PDF_WATERMARK_INK } from '../../lib/pdf-ink.ts';
import { looksLikePdf } from '../../lib/pdf.ts';

export interface WatermarkOptions {
  text: string;
  /** 0.05–1; low values keep the page readable. */
  opacity: number;
  /** Font size in points, 12–96. */
  size: number;
  /** 45° across the page, or horizontal. */
  diagonal: boolean;
}

export interface WatermarkInput {
  name: string;
  bytes: Uint8Array;
}

export type WatermarkErrorCode =
  | 'NOT_PDF'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'INVALID_OPTIONS'
  | 'FAILED';

export type WatermarkResult =
  | { ok: true; bytes: Uint8Array; watermarked: number }
  | { ok: false; code: WatermarkErrorCode; message: string };

export const MAX_TEXT_LENGTH = 80;

function failure(code: WatermarkErrorCode, message: string): WatermarkResult {
  return { ok: false, code, message };
}

export async function watermarkPdf(
  input: WatermarkInput,
  options: WatermarkOptions,
): Promise<WatermarkResult> {
  const text = options.text.trim();
  if (text.length === 0) {
    return failure('INVALID_OPTIONS', 'Type the watermark text first.');
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return failure('INVALID_OPTIONS', `Keep the watermark under ${MAX_TEXT_LENGTH} characters.`);
  }
  if (!(options.opacity >= 0.05 && options.opacity <= 1)) {
    return failure('INVALID_OPTIONS', 'Choose an opacity between 5% and 100%.');
  }
  if (!(options.size >= 12 && options.size <= 96)) {
    return failure('INVALID_OPTIONS', 'Choose a font size between 12 and 96 points.');
  }
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
        `"${input.name}" is password protected. Remove the password first, then watermark it.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${input.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  try {
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pages = pdf.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, options.size);
      if (options.diagonal) {
        const angle = Math.PI / 4;
        const boxWidth = textWidth * Math.cos(angle) + options.size * Math.sin(angle);
        const boxHeight = textWidth * Math.sin(angle) + options.size * Math.cos(angle);
        page.drawText(text, {
          x: (width - boxWidth) / 2,
          y: (height - boxHeight) / 2 + options.size * 0.25,
          size: options.size,
          font,
          color: PDF_WATERMARK_INK,
          opacity: options.opacity,
          rotate: degrees(45),
        });
      } else {
        page.drawText(text, {
          x: (width - textWidth) / 2,
          y: height / 2,
          size: options.size,
          font,
          color: PDF_WATERMARK_INK,
          opacity: options.opacity,
        });
      }
    }
    return { ok: true, bytes: await pdf.save(), watermarked: pages.length };
  } catch {
    return failure('FAILED', 'The watermark could not be written. Try again with less text.');
  }
}
