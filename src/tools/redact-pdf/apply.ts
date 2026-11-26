// SPDX-License-Identifier: AGPL-3.0-or-later
// The security-critical step: pages with boxes are re-rendered as images with black areas burned
// in, and the original page content is not copied. A redacted page therefore has no text layer,
// no hidden operators and no recoverable content behind the boxes.

import { PDFDocument } from 'pdf-lib';
import { REDACT_FILL } from '../../lib/pdf-ink.ts';
import { MAX_PIXELS, rectToPixels, totalAreas, type NormalizedRect } from './engine';

export type ApplyErrorCode = 'NO_AREAS' | 'ENCRYPTED' | 'CORRUPT' | 'FAILED';

export type ApplyResult =
  | { ok: true; bytes: Uint8Array; pages: number; redactedPages: number; areas: number }
  | { ok: false; code: ApplyErrorCode; message: string };

export interface ApplyProgress {
  page: number;
  total: number;
}

function failure(code: ApplyErrorCode, message: string): ApplyResult {
  return { ok: false, code, message };
}

function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The browser could not encode this page.'));
        return;
      }
      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch(() => reject(new Error('The redacted page could not be read back.')));
    }, 'image/png');
  });
}

export async function applyRedactions(
  fileName: string,
  bytes: Uint8Array,
  byPage: Record<number, NormalizedRect[]>,
  onProgress: (progress: ApplyProgress) => void,
): Promise<ApplyResult> {
  const areas = totalAreas(byPage);
  if (areas === 0) return failure('NO_AREAS', 'Draw at least one black box first.');

  let source;
  try {
    source = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return failure(
        'ENCRYPTED',
        `"${fileName}" is password protected. Remove the password first, then redact it.`,
      );
    }
    return failure('CORRUPT', `"${fileName}" could not be read. The file may be damaged.`);
  }

  const pdfjs = await import('pdfjs-dist');
  const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const loading = pdfjs.getDocument({ data: bytes, useSystemFonts: false });
  let view: Awaited<typeof loading.promise>;
  try {
    view = await loading.promise;
  } catch {
    return failure('CORRUPT', 'The pages could not be rendered for redaction.');
  }

  try {
    const output = await PDFDocument.create();
    const pageCount = source.getPageCount();
    let redactedPages = 0;
    onProgress({ page: 0, total: pageCount });

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const rects = byPage[pageNumber] ?? [];
      if (rects.length === 0) {
        const [copied] = await output.copyPages(source, [pageNumber - 1]);
        if (copied) output.addPage(copied);
        onProgress({ page: pageNumber, total: pageCount });
        continue;
      }

      const page = await view.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const tentative = Math.min(2, Math.sqrt(MAX_PIXELS / (base.width * base.height)));
      const viewport = page.getViewport({ scale: tentative });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) return failure('FAILED', 'This browser did not provide a drawing surface.');

      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      for (const rect of rects) {
        const pixels = rectToPixels(rect, canvas.width, canvas.height);
        context.fillStyle = REDACT_FILL;
        context.fillRect(pixels.x, pixels.y, pixels.width, pixels.height);
      }
      const png = await canvasPng(canvas);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();

      const image = await output.embedPng(png);
      const sheet = output.addPage([base.width, base.height]);
      sheet.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
      redactedPages += 1;
      onProgress({ page: pageNumber, total: pageCount });
    }

    return {
      ok: true,
      bytes: await output.save(),
      pages: pageCount,
      redactedPages,
      areas,
    };
  } catch {
    return failure('FAILED', 'The redacted document could not be written.');
  } finally {
    await loading.destroy();
  }
}
