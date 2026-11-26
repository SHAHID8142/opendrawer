// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser-side PDF.js text extraction. PDF.js is loaded on demand because it is ~1 MB and only
// this tool needs it.

import { MAX_PAGES, assembleDocument, joinPageText, type ExtractOptions, type TextItem } from './engine';

export type ExtractErrorCode = 'ENCRYPTED' | 'CORRUPT' | 'NO_TEXT' | 'TOO_MANY_PAGES' | 'FAILED';

export type ExtractResult =
  | { ok: true; text: string; pageCount: number; emptyPages: number[] }
  | { ok: false; code: ExtractErrorCode; message: string };

function failure(code: ExtractErrorCode, message: string): ExtractResult {
  return { ok: false, code, message };
}

export async function extractText(
  fileName: string,
  bytes: Uint8Array,
  options: ExtractOptions,
  onProgress: (done: number, total: number) => void,
): Promise<ExtractResult> {
  let pdfjs;
  try {
    pdfjs = await import('pdfjs-dist');
    const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  } catch {
    return failure('FAILED', 'The PDF reader could not be loaded. Reload the page and try again.');
  }

  const loading = pdfjs.getDocument({ data: bytes, useSystemFonts: false });
  let document;
  try {
    document = await loading.promise;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${fileName}" is password protected. Remove the password first, then extract its text.`,
      );
    }
    return failure(
      'CORRUPT',
      `"${fileName}" could not be opened. The file may be damaged or incomplete.`,
    );
  }

  try {
    if (document.numPages > MAX_PAGES) {
      return failure(
        'TOO_MANY_PAGES',
        `That is ${document.numPages} pages. This tool stops at ${MAX_PAGES} pages at once. Split the document first.`,
      );
    }

    const pages: string[] = [];
    const emptyPages: number[] = [];
    onProgress(0, document.numPages);

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const items: TextItem[] = content.items
          .filter((item): item is typeof item & { str: string } => 'str' in item)
          .map((item) => ({ str: item.str, hasEOL: item.hasEOL }));
        const text = joinPageText(items);
        if (text.trim() === '') emptyPages.push(pageNumber);
        pages.push(text);
      } finally {
        page.cleanup();
      }
      onProgress(pageNumber, document.numPages);
    }

    if (emptyPages.length === document.numPages) {
      return failure(
        'NO_TEXT',
        'There is no selectable text in this PDF. It is probably a scan or photographs of pages; this tool does not read text from images.',
      );
    }

    return {
      ok: true,
      text: assembleDocument(pages, options),
      pageCount: document.numPages,
      emptyPages,
    };
  } catch {
    return failure(
      'FAILED',
      'The text could not be read. Some pages may use fonts or encodings this reader cannot decode.',
    );
  } finally {
    await loading.destroy();
  }
}
