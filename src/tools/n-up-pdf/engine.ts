// SPDX-License-Identifier: AGPL-3.0-or-later
// Places several source pages on one A4 sheet. Content is scaled to fit each cell and centred;
// annotations, forms and links do not survive because every page is embedded anew.

import { PDFDocument } from 'pdf-lib';
import { looksLikePdf } from '../../lib/pdf.ts';

export type PerSheet = 2 | 4 | 6 | 9;

export interface Grid {
  cols: number;
  rows: number;
}

export const GRIDS: Record<PerSheet, Grid> = {
  2: { cols: 1, rows: 2 },
  4: { cols: 2, rows: 2 },
  6: { cols: 2, rows: 3 },
  9: { cols: 3, rows: 3 },
};

export const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 12;
const CELL_PADDING = 6;

export interface Cell {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NUpInput {
  name: string;
  bytes: Uint8Array;
}

export type NUpErrorCode = 'NOT_PDF' | 'ENCRYPTED' | 'CORRUPT' | 'INVALID_GRID' | 'FAILED';

export type NUpResult =
  | { ok: true; bytes: Uint8Array; sheets: number; placed: number }
  | { ok: false; code: NUpErrorCode; message: string };

export function sheetCount(pageCount: number, perSheet: PerSheet): number {
  return Math.ceil(pageCount / perSheet);
}

/** Cells in reading order: left to right, top row first, in PDF's bottom-left coordinates. */
export function cellsFor(perSheet: PerSheet, width: number, height: number, margin: number): Cell[] {
  const { cols, rows } = GRIDS[perSheet];
  const cellWidth = (width - margin * 2) / cols;
  const cellHeight = (height - margin * 2) / rows;
  const cells: Cell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push({
        x: margin + col * cellWidth,
        y: margin + (rows - 1 - row) * cellHeight,
        width: cellWidth,
        height: cellHeight,
      });
    }
  }
  return cells;
}

export async function nUpPdf(input: NUpInput, perSheet: PerSheet): Promise<NUpResult> {
  if (!looksLikePdf(input.bytes)) {
    return { ok: false, code: 'NOT_PDF', message: `"${input.name}" is not a PDF file.` };
  }
  if (!(perSheet in GRIDS)) {
    return { ok: false, code: 'INVALID_GRID', message: 'Choose 2, 4, 6 or 9 pages per sheet.' };
  }

  let source;
  try {
    source = await PDFDocument.load(input.bytes, { updateMetadata: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/encrypt|password/i.test(message)) {
      return {
        ok: false,
        code: 'ENCRYPTED',
        message: `"${input.name}" is password protected. Remove the password first.`,
      };
    }
    return {
      ok: false,
      code: 'CORRUPT',
      message: `"${input.name}" could not be read. The file may be damaged; try Repair first.`,
    };
  }
  if (source.getPageCount() === 0) {
    return { ok: false, code: 'CORRUPT', message: 'This PDF has no pages to lay out.' };
  }

  try {
    const output = await PDFDocument.create();
    const cells = cellsFor(perSheet, A4.width, A4.height, MARGIN);
    const pageCount = source.getPageCount();
    const sheets = sheetCount(pageCount, perSheet);
    let placed = 0;

    for (let sheet = 0; sheet < sheets; sheet += 1) {
      const target = output.addPage([A4.width, A4.height]);
      for (let slot = 0; slot < cells.length; slot += 1) {
        const index = sheet * perSheet + slot;
        if (index >= pageCount) break;
        const cell = cells[slot]!;
        const embedded = await output.embedPage(source.getPage(index));
        const size = source.getPage(index).getSize();
        const availableWidth = cell.width - CELL_PADDING * 2;
        const availableHeight = cell.height - CELL_PADDING * 2;
        const scale = Math.min(availableWidth / size.width, availableHeight / size.height);
        const width = size.width * scale;
        const height = size.height * scale;
        target.drawPage(embedded, {
          x: cell.x + (cell.width - width) / 2,
          y: cell.y + (cell.height - height) / 2,
          xScale: scale,
          yScale: scale,
        });
        placed += 1;
      }
    }
    return { ok: true, bytes: await output.save(), sheets, placed };
  } catch {
    return {
      ok: false,
      code: 'FAILED',
      message: 'The pages could not be laid out. Try a smaller document or fewer pages per sheet.',
    };
  }
}
