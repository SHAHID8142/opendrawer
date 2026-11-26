// SPDX-License-Identifier: AGPL-3.0-or-later
// Central category registry, tool catalogue metadata, and service accent mapping.

export type ToolStatus = 'live' | 'planned';

/** Top-level product category. New categories are a product decision; see docs/10. */
export type ToolCategory = 'Documents' | 'Images' | 'Audio & video' | 'Text & data' | 'Everyday';

/** Visual service accent for tool cards and glyphs — maps directly to tokens.css. */
export type ToolAccent =
  | 'inspect'
  | 'convert'
  | 'create'
  | 'merge'
  | 'split'
  | 'rotate'
  | 'delete'
  | 'documents'
  | 'images'
  | 'audio'
  | 'textdata'
  | 'everyday';

export interface CategoryMeta {
  id: ToolCategory;
  slug: string;
  tone: 'documents' | 'images' | 'audio' | 'textdata' | 'everyday';
  summary: string;
}

/** Ordered categories shown in the directory bar and grouped sections. */
export const categories: CategoryMeta[] = [
  {
    id: 'Documents',
    slug: 'documents',
    tone: 'documents',
    summary: 'Inspect, convert, create, combine, split, rotate and trim PDF files locally.',
  },
  {
    id: 'Images',
    slug: 'images',
    tone: 'images',
    summary: 'Convert, resize, crop and compress PNG, JPEG, WebP and SVG photos on your device.',
  },
  {
    id: 'Audio & video',
    slug: 'audio',
    tone: 'audio',
    summary: 'Convert, trim and extract audio or video clips in local browser memory.',
  },
  {
    id: 'Text & data',
    slug: 'textdata',
    tone: 'textdata',
    summary: 'Format JSON and CSV, count words, convert case and compare text without uploads.',
  },
  {
    id: 'Everyday',
    slug: 'everyday',
    tone: 'everyday',
    summary: 'Convert units, check dates and time zones, and generate QR codes offline.',
  },
];

export interface ToolEntry {
  id: string;
  name: string;
  category: ToolCategory;
  group: 'Inspect' | 'Create' | 'Organise' | 'Edit' | 'Convert' | 'Optimise & secure';
  accent: ToolAccent;
  /** Ultra-brief 3-5 word line shown on the card surface; full blurb lives in the "i" tip. */
  short: string;
  /** Full one-sentence explanation shown on "i" hover/tap and used in metadata. */
  blurb: string;
  status: ToolStatus;
}

/**
 * The single list of tools. One line per tool, added in the same commit as the page.
 * IDs become URLs and are permanent: never rename one.
 */
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
];

export const liveTools = tools.filter((tool) => tool.status === 'live');
