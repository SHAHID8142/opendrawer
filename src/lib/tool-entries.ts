// SPDX-License-Identifier: AGPL-3.0-or-later
// The tool catalogue itself, split from the types and categories to keep each file focused.

import type { ToolEntry } from './tools';

export const tools: ToolEntry[] = [
  {
    id: 'inspect-pdf',
    name: 'Inspect PDF',
    category: 'Documents',
    group: 'Inspect',
    accent: 'inspect',
    short: 'Pages, metadata and scripts.',
    blurb:
      'See what a PDF really contains before you send it: page sizes, metadata, embedded files, scripts and signatures.',
    status: 'live',
  },
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
    id: 'images-to-pdf',
    name: 'Images to PDF',
    category: 'Documents',
    group: 'Create',
    accent: 'create',
    short: 'Turn photos into one PDF.',
    blurb:
      'Put PNG and JPEG photos or scans into one PDF, one page per image, with the page size you choose.',
    status: 'live',
  },
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    category: 'Documents',
    group: 'Organise',
    accent: 'merge',
    short: 'Combine PDFs in your order.',
    blurb:
      'Combine several PDFs into one file, in the order you set, without re-rendering a single page.',
    status: 'live',
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    category: 'Documents',
    group: 'Organise',
    accent: 'split',
    short: 'Extract ranges or single pages.',
    blurb:
      'Split a PDF by page ranges or into one file per page, with pages copied rather than re-rendered.',
    status: 'live',
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    category: 'Documents',
    group: 'Organise',
    accent: 'rotate',
    short: 'Turn pages 90°, 180° or 270°.',
    blurb:
      'Turn selected pages or the whole document by 90, 180 or 270 degrees without re-rendering anything.',
    status: 'live',
  },
  {
    id: 'delete-pages',
    name: 'Delete pages',
    category: 'Documents',
    group: 'Organise',
    accent: 'delete',
    short: 'Remove chosen pages locally.',
    blurb:
      'Remove the pages you do not need and keep the rest exactly as they were, without re-rendering.',
    status: 'live',
  },
  {
    id: 'reorder-pages',
    name: 'Reorder pages',
    category: 'Documents',
    group: 'Organise',
    accent: 'inspect',
    short: 'Move or reverse page order.',
    blurb:
      'Move pages into a new order or reverse the document, then download it without re-rendering a page.',
    status: 'live',
  },
  {
    id: 'extract-pages',
    name: 'Extract pages',
    category: 'Documents',
    group: 'Organise',
    accent: 'convert',
    short: 'Keep chosen pages in custom order.',
    blurb:
      'Keep only the pages you need, in the order you type them, and download them as a new PDF.',
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
    id: 'crop-pdf',
    name: 'Crop PDF',
    category: 'Documents',
    group: 'Organise',
    accent: 'convert',
    short: 'Trim margins from chosen pages.',
    blurb:
      'Trim a uniform margin from chosen pages, with a plain warning that cropping hides rather than deletes.',
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
    id: 'resize-pdf',
    name: 'Resize pages',
    category: 'Documents',
    group: 'Organise',
    accent: 'convert',
    short: 'Fit pages to A4 or Letter.',
    blurb:
      'Scale every page onto A4, US Letter or A5, keeping its shape and centring it with margins.',
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
];
