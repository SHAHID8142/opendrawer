// SPDX-License-Identifier: AGPL-3.0-or-later
// OpenDrawer Hierarchical Duotone Icon Pack (24x24 keyline grid, pure vector geometry).

export type GlyphKind =
  | 'inspect-pdf'
  | 'pdf-to-image'
  | 'images-to-pdf'
  | 'merge-pdf'
  | 'split-pdf'
  | 'rotate-pdf'
  | 'delete-pages'
  | 'documents'
  | 'images'
  | 'audio'
  | 'textdata'
  | 'everyday'
  | 'device'
  | 'shield'
  | 'heart'
  | 'network'
  | 'tool'
  | 'wifi-off';

export const GLYPH_PATHS: Record<GlyphKind, string> = {
  'inspect-pdf': [
    '<path d="M5.5 2.5h6.5L16.5 7v11.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.15" />',
    '<path d="M12 2.5V6a1 1 0 0 0 1 1h3.5" />',
    '<path d="M7 10.5h5" />',
    '<path d="M7 14h3" />',
    '<circle cx="15.8" cy="15.8" r="5" fill="var(--color-surface)" stroke="none" />',
    '<circle cx="15.8" cy="15.8" r="4.1" fill="currentColor" fill-opacity="0.18" />',
    '<path d="m18.8 18.8 2.8 2.8" stroke-width="2.1" />',
  ].join(''),

  'pdf-to-image': [
    '<path d="M5 2.5h5.5L14 6v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.12" />',
    '<path d="M10.5 2.5V5a1 1 0 0 0 1 1H14" />',
    '<rect x="8.5" y="9.5" width="13" height="11.5" rx="2.5" fill="var(--color-surface)" stroke="none" />',
    '<rect x="8.5" y="9.5" width="13" height="11.5" rx="2.5" fill="currentColor" fill-opacity="0.16" />',
    '<circle cx="12.2" cy="13.2" r="1.2" fill="currentColor" stroke="none" />',
    '<path d="m9.4 19.6 3.1-3.1a.9.9 0 0 1 1.3 0l1.5 1.5 1.8-1.9a.9.9 0 0 1 1.3 0l2.2 2.4" />',
  ].join(''),

  'images-to-pdf': [
    '<rect x="2.5" y="3" width="12" height="11" rx="2.5" fill="currentColor" fill-opacity="0.12" />',
    '<circle cx="6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />',
    '<path d="m3.5 12.6 2.8-2.8a.9.9 0 0 1 1.3 0l1.4 1.4 1.5-1.5a.9.9 0 0 1 1.3 0l2 2" />',
    '<path d="M12 7.5h5.5l4 4v8a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" fill="var(--color-surface)" stroke="none" />',
    '<path d="M12 7.5h5.5l4 4v8a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.18" />',
    '<path d="M17.5 7.5v3a1 1 0 0 0 1 1h3" />',
    '<path d="M13 15h5.5" />',
    '<path d="M13 18h3.5" />',
  ].join(''),

  'merge-pdf': [
    '<path d="M5.5 2.5H12l2.5 2.5v9.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.10" />',
    '<path d="M10.5 6.5h6l4 4v9a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" fill="var(--color-surface)" stroke="none" />',
    '<path d="M10.5 6.5h6l4 4v9a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.18" />',
    '<path d="M16.5 6.5v3a1 1 0 0 0 1 1h3" />',
    '<path d="M14.5 13.5v4.5" stroke-width="2" />',
    '<path d="M12.25 15.75h4.5" stroke-width="2" />',
  ].join(''),

  'split-pdf': [
    '<path d="M5 4h5v16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.16" />',
    '<path d="M14 4h3.5L21 7.5V18a2 2 0 0 1-2 2h-5V4Z" fill="currentColor" fill-opacity="0.16" />',
    '<path d="M17.5 4v2.5a1 1 0 0 0 1 1H21" />',
    '<path d="M12 2.5v2.5" stroke-width="2" />',
    '<path d="M12 8.2v7.6" stroke-width="2" />',
    '<path d="M12 19v2.5" stroke-width="2" />',
  ].join(''),

  'rotate-pdf': [
    '<path d="M6.5 6.5h5l3 3v9a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.16" />',
    '<path d="M11.5 6.5v2a1 1 0 0 0 1 1h2" />',
    '<path d="M13.5 3.2A6.8 6.8 0 0 1 20 10v1.4" stroke-width="2" />',
    '<path d="m17.6 9.4 2.4 2.5 2.4-2.5" stroke-width="2" />',
  ].join(''),

  'delete-pages': [
    '<path d="M6 2.5h6.5L17 7v11.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.15" />',
    '<path d="M12.5 2.5V6a1 1 0 0 0 1 1H17" />',
    '<path d="M7.5 11h5" />',
    '<path d="M7.5 14.5h3" />',
    '<circle cx="16.8" cy="16.8" r="5.2" fill="var(--color-surface)" stroke="none" />',
    '<circle cx="16.8" cy="16.8" r="4.2" fill="currentColor" stroke="none" />',
    '<path d="m15.3 15.3 3 3m0-3-3 3" stroke="var(--color-surface)" stroke-width="1.8" />',
  ].join(''),

  documents: [
    '<path d="M7 2.5h7l5.5 5.5v11.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.16" />',
    '<path d="M14 2.5V6a2 2 0 0 0 2 2h3.5Z" fill="currentColor" fill-opacity="0.22" stroke="none" />',
    '<path d="M14 2.5V6a2 2 0 0 0 2 2h3.5" />',
    '<path d="M8.5 12h7" />',
    '<path d="M8.5 15.8h4.5" />',
  ].join(''),

  images: [
    '<rect x="3" y="4" width="18" height="16" rx="3" fill="currentColor" fill-opacity="0.16" />',
    '<circle cx="8.5" cy="9.2" r="1.5" fill="currentColor" stroke="none" />',
    '<path d="m4 17.5 4.2-4.2a1 1 0 0 1 1.4 0l2.6 2.6 2.2-2.2a1 1 0 0 1 1.4 0l4.2 4.2" />',
  ].join(''),

  audio: [
    '<path d="M4 9.5v5" stroke-width="2.1" />',
    '<path d="M8 6.5v11" stroke-width="2.1" />',
    '<path d="M12 4v16" stroke-width="2.1" />',
    '<path d="M16 7v10" stroke-width="2.1" />',
    '<path d="M20 10v4" stroke-width="2.1" />',
  ].join(''),

  textdata: [
    '<path d="M8.5 4.5c-1.8 0-3 1.1-3 2.8v2.3c0 1.1-.7 2-1.8 2.4 1.1.4 1.8 1.3 1.8 2.4v2.3c0 1.7 1.2 2.8 3 2.8" stroke-width="2" />',
    '<path d="M15.5 4.5c1.8 0 3 1.1 3 2.8v2.3c0 1.1.7 2 1.8 2.4-1.1.4-1.8 1.3-1.8 2.4v2.3c0 1.7-1.2 2.8-3 2.8" stroke-width="2" />',
    '<circle cx="10" cy="12" r="1.2" fill="currentColor" stroke="none" />',
    '<circle cx="14" cy="12" r="1.2" fill="currentColor" stroke="none" />',
  ].join(''),

  everyday: [
    '<rect x="3.5" y="3.5" width="7" height="7" rx="2" fill="currentColor" fill-opacity="0.24" />',
    '<rect x="13.5" y="3.5" width="7" height="7" rx="2" fill="currentColor" fill-opacity="0.10" />',
    '<rect x="3.5" y="13.5" width="7" height="7" rx="2" fill="currentColor" fill-opacity="0.10" />',
    '<rect x="13.5" y="13.5" width="7" height="7" rx="2" fill="currentColor" fill-opacity="0.24" />',
  ].join(''),

  device: [
    '<rect x="3" y="4" width="18" height="12" rx="2.5" fill="currentColor" fill-opacity="0.16" />',
    '<path d="M8.5 20h7" />',
    '<path d="M12 16v4" />',
  ].join(''),

  shield: [
    '<path d="M12 2.8 4.5 6v5.8c0 4.8 3.2 8.7 7.5 9.7 4.3-1 7.5-4.9 7.5-9.7V6L12 2.8Z" fill="currentColor" fill-opacity="0.16" />',
    '<path d="m9 12.2 2.1 2.1 4.2-4.4" stroke-width="2" />',
  ].join(''),

  heart:
    '<path d="M12 20.4s-7.5-4.6-7.5-10.2A4.4 4.4 0 0 1 12 6.8a4.4 4.4 0 0 1 7.5 3.4c0 5.6-7.5 10.2-7.5 10.2Z" fill="currentColor" fill-opacity="0.18" />',

  network: [
    '<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.14" />',
    '<path d="M3.2 12h17.6" />',
    '<path d="M12 3a13 13 0 0 1 0 18 13 13 0 0 1 0-18Z" />',
  ].join(''),

  tool: [
    '<path d="M4 7h16" />',
    '<path d="M4 12h16" />',
    '<path d="M4 17h16" />',
    '<circle cx="8.5" cy="7" r="2.2" fill="var(--color-surface)" />',
    '<circle cx="8.5" cy="7" r="2.2" fill="currentColor" fill-opacity="0.22" />',
    '<circle cx="15.5" cy="12" r="2.2" fill="var(--color-surface)" />',
    '<circle cx="15.5" cy="12" r="2.2" fill="currentColor" fill-opacity="0.22" />',
    '<circle cx="10" cy="17" r="2.2" fill="var(--color-surface)" />',
    '<circle cx="10" cy="17" r="2.2" fill="currentColor" fill-opacity="0.22" />',
  ].join(''),

  'wifi-off': [
    '<path d="M8.5 16.5a5 5 0 0 1 7 0" />',
    '<path d="M5 12.8a9.8 9.8 0 0 1 14 0" />',
    '<path d="M2.2 9.2a14 14 0 0 1 19.6 0" />',
    '<circle cx="12" cy="19.5" r="1.2" fill="currentColor" stroke="none" />',
    '<path d="M3 3l18 18" stroke="var(--color-surface)" stroke-width="3.6" />',
    '<path d="M3 3l18 18" stroke-width="1.9" />',
  ].join(''),
};
