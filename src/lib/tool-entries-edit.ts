// SPDX-License-Identifier: AGPL-3.0-or-later
// Edit and Convert tools. Split from the core catalogue to keep files small.

import type { ToolEntry } from './tools';

export const editTools: ToolEntry[] = [
  {
    id: 'pdf-to-image',
    name: 'PDF to image',
    category: 'Documents',
    group: 'Convert',
    accent: 'convert',
    short: 'Export pages to PNG or JPEG.',
    blurb:
      'Turn pages into PNG or JPEG images at 72, 150 or 300 DPI, one page or a whole ZIP of them.',
    status: 'live',
  },
  {
    id: 'page-numbers',
    name: 'Page numbers',
    category: 'Documents',
    group: 'Edit',
    accent: 'convert',
    short: 'Add numbered headers or footers.',
    blurb:
      'Stamp page numbers at the top or bottom, as a plain number or "Page 1 of 10", with an optional cover page.',
    status: 'live',
  },
  {
    id: 'watermark-pdf',
    name: 'Watermark PDF',
    category: 'Documents',
    group: 'Edit',
    accent: 'convert',
    short: 'Stamp text across every page.',
    blurb:
      'Stamp draft or confidential text across every page, with a chosen angle, opacity and size.',
    status: 'live',
  },
  {
    id: 'flatten-pdf',
    name: 'Flatten PDF',
    category: 'Documents',
    group: 'Edit',
    accent: 'convert',
    short: 'Lock filled forms.',
    blurb:
      'Turn form fields into fixed page content so a filled form can no longer be edited or refilled.',
    status: 'live',
  },
  {
    id: 'extract-text',
    name: 'Extract text',
    category: 'Documents',
    group: 'Convert',
    accent: 'convert',
    short: 'Copy words out as .txt.',
    blurb:
      'Read selectable PDF text and download it as plain UTF-8 text, with optional page labels.',
    status: 'live',
  },
  {
    id: 'add-image',
    name: 'Add an image',
    category: 'Documents',
    group: 'Edit',
    accent: 'convert',
    short: 'Stamp a logo or picture.',
    blurb:
      'Place a PNG or JPEG in a corner or the centre of chosen pages, with a set width, margin and opacity.',
    status: 'live',
  },
  {
    id: 'ocr-pdf',
    name: 'OCR PDF',
    category: 'Documents',
    group: 'Convert',
    accent: 'convert',
    short: 'Read scans as text.',
    blurb:
      'Read scanned pages with a self-hosted OCR engine and download the recognised text as a .txt file.',
    status: 'live',
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    category: 'Documents',
    group: 'Edit',
    accent: 'convert',
    short: 'Squeeze a PDF without losing quality.',
    blurb:
      'Shrink a PDF losslessly by rebuilding its streams; images are not resampled.',
    status: 'live',
  },
  {
    id: 'protect-pdf',
    name: 'Protect PDF',
    category: 'Documents',
    group: 'Edit',
    accent: 'convert',
    short: 'Encrypt with a password.',
    blurb:
      'Encrypt a PDF with an AES-256 password that never leaves the tab.',
    status: 'live',
  },
  {
    id: 'unlock-pdf',
    name: 'Unlock PDF',
    category: 'Documents',
    group: 'Edit',
    accent: 'convert',
    short: 'Remove a known password.',
    blurb:
      'Remove a password you already know, with no cracking or guessing.',
    status: 'live',
  },
  {
    id: 'repair-pdf',
    name: 'Repair PDF',
    category: 'Documents',
    group: 'Edit',
    accent: 'convert',
    short: 'Rebuild a damaged PDF.',
    blurb:
      'Rebuild the structure of a damaged PDF and recover what qpdf can read.',
    status: 'live',
  },
  {
    id: 'fill-forms',
    name: 'Fill forms',
    category: 'Documents',
    group: 'Edit',
    accent: 'convert',
    short: 'Complete form fields.',
    blurb:
      'Fill AcroForm text fields, checkboxes and option lists, then flatten them so they cannot be changed.',
    status: 'live',
  },
  {
    id: 'extract-images',
    name: 'Extract images',
    category: 'Documents',
    group: 'Convert',
    accent: 'convert',
    short: 'Pull pictures out of a PDF.',
    blurb:
      'Pull the raster pictures out of every page as PNG files, with a size filter and a ZIP download.',
    status: 'live',
  },
  {
    id: 'edit-metadata',
    name: 'Edit details',
    category: 'Documents',
    group: 'Edit',
    accent: 'convert',
    short: 'Change title and author.',
    blurb:
      'Read and rewrite the title, author, subject and keywords viewers show in Document properties.',
    status: 'live',
  },
  {
    id: 'redact-pdf',
    name: 'Redact PDF',
    category: 'Documents',
    group: 'Edit',
    accent: 'delete',
    short: 'Remove content, not cover it.',
    blurb:
      'Draw boxes over sensitive areas and rasterise those pages so the text underneath is destroyed.',
    status: 'live',
  },
  {
    id: 'booklet-pdf',
    name: 'Booklet PDF',
    category: 'Documents',
    group: 'Organise',
    accent: 'convert',
    short: 'Fold-ready page spreads.',
    blurb:
      'Reorder pages into A4 landscape spreads for double-sided printing and folding.',
    status: 'live',
  },
  {
    id: 'writing-check',
    name: 'Writing check',
    category: 'Text & data',
    group: 'Edit',
    accent: 'textdata',
    short: 'Spelling and copy rules, offline.',
    blurb:
      'Check spelling against a local Hunspell dictionary and catch repetition, spacing and common confusions.',
    status: 'live',
  },
  {
    id: 'text-transform',
    name: 'Text transform',
    category: 'Text & data',
    group: 'Edit',
    accent: 'textdata',
    short: 'Case, lines and find-and-replace.',
    blurb: 'Change case, tidy, sort, dedupe and replace text locally, with one-step undo.',
    status: 'live',
  },
];
