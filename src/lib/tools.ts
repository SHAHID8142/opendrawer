// SPDX-License-Identifier: AGPL-3.0-or-later
// Central tool catalogue metadata and service accent mapping.
export type ToolStatus = 'live' | 'planned';

/** Top-level product category. New categories are a product decision; see docs/10. */
export type ToolCategory = 'Documents' | 'Images' | 'Audio & video' | 'Text & data' | 'Everyday';

/** Visual service accent for tool tiles and cards — one distinct color per tool. */
export type ToolAccent = 'inspect' | 'convert' | 'create' | 'merge' | 'split' | 'rotate';

export interface ToolEntry {
  id: string;
  name: string;
  category: ToolCategory;
  group: 'Inspect' | 'Create' | 'Organise' | 'Edit' | 'Convert' | 'Optimise & secure';
  accent: ToolAccent;
  /** One sentence, plain language. Used as the card blurb and the meta description fallback. */
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
    blurb:
      'Turn selected pages or the whole document by 90, 180 or 270 degrees without re-rendering anything.',
    status: 'live',
  },
];

export const liveTools = tools.filter((tool) => tool.status === 'live');
