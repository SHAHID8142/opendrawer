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
import { tools } from './tool-entries';

export { tools };


export const liveTools = tools.filter((tool) => tool.status === 'live');
