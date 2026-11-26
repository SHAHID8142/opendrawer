// SPDX-License-Identifier: AGPL-3.0-or-later
// Turns JPEG/PNG images into one PDF. Pure pdf-lib work, no DOM, so it also runs in Node tests.

import { PDFDocument } from 'pdf-lib';

export type PageSizeOption = 'a4' | 'letter' | 'image';
export type ImageType = 'png' | 'jpeg';

export interface SourceImage {
  name: string;
  bytes: Uint8Array;
  /** Declared type; the engine still sniffs the bytes and refuses a mismatch. */
  type: ImageType;
}

export interface BuildOptions {
  pageSize: PageSizeOption;
  /** Uniform margin in points, 0–72. Defaults to none. */
  marginPt?: number;
}

export type BuildErrorCode =
  | 'EMPTY'
  | 'TOO_MANY_IMAGES'
  | 'TOO_LARGE'
  | 'UNSUPPORTED_TYPE'
  | 'CORRUPT_IMAGE'
  | 'FAILED';

export type BuildResult =
  | { ok: true; bytes: Uint8Array; pageCount: number }
  | { ok: false; code: BuildErrorCode; message: string };

/** Limits are part of the UI copy; change both together. */
export const MAX_IMAGES = 50;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

const PAGE_POINTS = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const;

const MARGIN_MAX_PT = 72;

function sniff(bytes: Uint8Array): ImageType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  return null;
}

function failure(code: BuildErrorCode, message: string): BuildResult {
  return { ok: false, code, message };
}

export async function buildPdfFromImages(
  images: SourceImage[],
  options: BuildOptions,
): Promise<BuildResult> {
  if (images.length === 0) {
    return failure('EMPTY', 'Choose at least one PNG or JPEG image first.');
  }
  if (images.length > MAX_IMAGES) {
    return failure(
      'TOO_MANY_IMAGES',
      `That is ${images.length} images. This tool stops at ${MAX_IMAGES} so the tab keeps working.`,
    );
  }

  const margin = Math.min(Math.max(options.marginPt ?? 0, 0), MARGIN_MAX_PT);
  const pdf = await PDFDocument.create();

  for (const image of images) {
    if (image.bytes.length > MAX_IMAGE_BYTES) {
      return failure(
        'TOO_LARGE',
        `"${image.name}" is larger than ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB. Resize it first.`,
      );
    }
    const actual = sniff(image.bytes);
    if (actual === null) {
      return failure('UNSUPPORTED_TYPE', `"${image.name}" is not a PNG or JPEG image.`);
    }
    if (actual !== image.type) {
      return failure(
        'UNSUPPORTED_TYPE',
        `"${image.name}" is a ${actual.toUpperCase()} file, not ${image.type.toUpperCase()}.`,
      );
    }

    let embedded;
    try {
      embedded = actual === 'png' ? await pdf.embedPng(image.bytes) : await pdf.embedJpg(image.bytes);
    } catch {
      return failure(
        'CORRUPT_IMAGE',
        `"${image.name}" could not be read. The file may be truncated or not a real image.`,
      );
    }

    const imageWidth = embedded.width;
    const imageHeight = embedded.height;

    let pageWidth: number;
    let pageHeight: number;
    if (options.pageSize === 'image') {
      // At 72 points per inch this is the image at one pixel per point.
      pageWidth = imageWidth + margin * 2;
      pageHeight = imageHeight + margin * 2;
    } else {
      const [baseWidth, baseHeight] = PAGE_POINTS[options.pageSize];
      // Landscape images get a landscape sheet; nobody wants a postage stamp on A4.
      const landscape = imageWidth > imageHeight;
      pageWidth = landscape ? baseHeight : baseWidth;
      pageHeight = landscape ? baseWidth : baseHeight;
    }

    const page = pdf.addPage([pageWidth, pageHeight]);
    const availableWidth = Math.max(pageWidth - margin * 2, 1);
    const availableHeight = Math.max(pageHeight - margin * 2, 1);
    const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;

    page.drawImage(embedded, {
      x: (pageWidth - drawWidth) / 2,
      y: (pageHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  try {
    const bytes = await pdf.save();
    return { ok: true, bytes, pageCount: images.length };
  } catch {
    return failure('FAILED', 'The PDF could not be written. Try fewer or smaller images.');
  }
}
