export type ToolStatus = 'live' | 'planned';

/** Top-level product category. New categories are a product decision; see docs/10. */
export type ToolCategory = 'Documents' | 'Images' | 'Audio & video' | 'Text & data' | 'Everyday';

export interface ToolEntry {
  id: string;
  name: string;
  category: ToolCategory;
  group: 'Inspect' | 'Create' | 'Organise' | 'Edit' | 'Convert' | 'Optimise & secure';
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
    blurb:
      'See what a PDF really contains before you send it: page sizes, metadata, embedded files, scripts and signatures.',
    status: 'live',
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to image',
    category: 'Documents',
    group: 'Convert',
    blurb:
      'Turn pages into PNG or JPEG images at 72, 150 or 300 DPI, one page or a whole ZIP of them.',
    status: 'live',
  },
];

export const liveTools = tools.filter((tool) => tool.status === 'live');
