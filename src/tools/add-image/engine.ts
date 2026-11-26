// SPDX-License-Identifier: AGPL-3.0-or-later
// Stamps a PNG or JPEG onto chosen pages. The image is a new layer: it covers what is under it
// and can be removed again, so the UI never calls this redaction.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';
import { placeImage, type Placement } from './placement.ts';

export interface FileInput {
  name: string;
  bytes: Uint8Array;
}

export interface ImageOptions {
  placement: Placement;
  widthMm: number;
  marginMm: number;
  opacity: number;
  pages: number[];
}

export type ImageErrorCode =
  | 'NOT_PDF'
  | 'UNSUPPORTED_IMAGE'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'EMPTY'
  | 'PAGE_OUT_OF_RANGE'
  | 'INVALID_OPTIONS'
  | 'FAILED';

export type ImageResult =
  | { ok: true; bytes: Uint8Array; placed: number; scaled: boolean }
  | { ok: false; code: ImageErrorCode; message: string };

/** 1 mm in PDF points; PDF pages are measured in 1/72 inch. */
export const MM_TO_PT = 72 / 25.4;
export const MIN_WIDTH_MM = 10;
export const MAX_WIDTH_MM = 150;
export const MAX_MARGIN_MM = 30;

function failure(code: ImageErrorCode, message: string): ImageResult {
  return { ok: false, code, message };
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export async function addImageToPdf(
  pdfInput: FileInput,
  imageInput: FileInput,
  options: ImageOptions,
): Promise<ImageResult> {
  if (!looksLikePdf(pdfInput.bytes)) {
    return failure('NOT_PDF', `"${pdfInput.name}" is not a PDF file.`);
  }
  if (!isPng(imageInput.bytes) && !isJpeg(imageInput.bytes)) {
    return failure(
      'UNSUPPORTED_IMAGE',
      `"${imageInput.name}" is not a PNG or JPEG image. Export it as PNG or JPEG and try again.`,
    );
  }
  if (options.pages.length === 0) {
    return failure('EMPTY', 'Select at least one page to place the image on.');
  }
  if (
    !Number.isFinite(options.widthMm) ||
    options.widthMm < MIN_WIDTH_MM ||
    options.widthMm > MAX_WIDTH_MM ||
    !Number.isFinite(options.marginMm) ||
    options.marginMm < 0 ||
    options.marginMm > MAX_MARGIN_MM ||
    !Number.isFinite(options.opacity) ||
    options.opacity < 0.1 ||
    options.opacity > 1
  ) {
    return failure(
      'INVALID_OPTIONS',
      `Use an image width between ${MIN_WIDTH_MM} and ${MAX_WIDTH_MM} mm, a margin up to ${MAX_MARGIN_MM} mm and an opacity of at least 10%.`,
    );
  }

  let pdf;
  try {
    pdf = await PDFDocument.load(pdfInput.bytes, { updateMetadata: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${pdfInput.name}" is password protected. Remove the password first, then add the image.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${pdfInput.name}" could not be read. The file may be damaged or incomplete.`,
    );
  }

  const pageCount = pdf.getPageCount();
  const unique = [...new Set(options.pages)];
  for (const pageNumber of unique) {
    if (pageNumber < 1 || pageNumber > pageCount) {
      return failure(
        'PAGE_OUT_OF_RANGE',
        `Page ${pageNumber} does not exist: this document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`,
      );
    }
  }

  let image;
  try {
    image = isPng(imageInput.bytes)
      ? await pdf.embedPng(imageInput.bytes)
      : await pdf.embedJpg(imageInput.bytes);
  } catch {
    return failure(
      'UNSUPPORTED_IMAGE',
      `"${imageInput.name}" could not be decoded. Re-export it as a standard PNG or JPEG.`,
    );
  }

  const aspect = image.width / image.height;
  if (!Number.isFinite(aspect) || aspect <= 0) {
    return failure('UNSUPPORTED_IMAGE', 'The image has no usable width and height.');
  }

  let scaled = false;
  try {
    for (const pageNumber of unique) {
      const page = pdf.getPage(pageNumber - 1);
      const box = page.getCropBox();
      const placed = placeImage(
        box,
        aspect,
        options.widthMm * MM_TO_PT,
        options.marginMm * MM_TO_PT,
        options.placement,
      );
      scaled = scaled || placed.scaled;
      page.drawImage(image, {
        x: placed.x,
        y: placed.y,
        width: placed.width,
        height: placed.height,
        opacity: options.opacity,
      });
    }
    return { ok: true, bytes: await pdf.save(), placed: unique.length, scaled };
  } catch {
    return failure('FAILED', 'The image could not be written onto the pages. Try a smaller image.');
  }
}
