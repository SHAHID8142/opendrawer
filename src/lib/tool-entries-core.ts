// SPDX-License-Identifier: AGPL-3.0-or-later
// Inspect, Create and Organise tools. Split from the editing catalogue to keep files small.

import type { ToolEntry } from './tools';

export const coreTools: ToolEntry[] = [
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
    id: 'n-up-pdf',
    name: 'N-up PDF',
    category: 'Documents',
    group: 'Organise',
    accent: 'convert',
    short: 'Several pages per sheet.',
    blurb:
      'Put 2, 4, 6 or 9 pages on each A4 sheet, scaled and centred for printing handouts.',
    status: 'live',
  },
  {
    id: 'split-by-bookmarks',
    name: 'Split by bookmarks',
    category: 'Documents',
    group: 'Organise',
    accent: 'convert',
    short: 'One file per chapter.',
    blurb:
      'Turn each top-level bookmark into its own PDF and download the sections as a ZIP.',
    status: 'live',
  },
];
