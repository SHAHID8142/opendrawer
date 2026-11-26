// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared PDF checks used by document tools: signature sniffing and page count.

import { PDFDocument } from 'pdf-lib';

/** A PDF has %PDF- within its first 1024 bytes; extensions and MIME types can lie. */
export function looksLikePdf(bytes: Uint8Array): boolean {
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

/** Page count for UI feedback; null when the file cannot be opened. */
export async function countPdfPages(bytes: Uint8Array): Promise<number | null> {
  try {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    return pdf.getPageCount();
  } catch {
    return null;
  }
}
