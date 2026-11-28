// SPDX-License-Identifier: AGPL-3.0-or-later
// File list and boilerplate for the favicon package. Pure text, covered by node --test.

export interface PngAsset {
  size: number;
  name: string;
}

/** The PNG sizes most sites and platforms ask for. */
export const FAVICON_PNGS: PngAsset[] = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
];

export function htmlSnippet(): string {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join('\n');
}

export interface ManifestOptions {
  name: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
}

export const DEFAULT_MANIFEST: ManifestOptions = {
  name: 'Site',
  shortName: 'Site',
  themeColor: 'black',
  backgroundColor: 'white',
};

function clean(value: string, fallback: string): string {
  return value.trim() === '' ? fallback : value.trim();
}

export function manifestJson(options: ManifestOptions = DEFAULT_MANIFEST): string {
  return JSON.stringify(
    {
      name: clean(options.name, DEFAULT_MANIFEST.name),
      short_name: clean(options.shortName, clean(options.name, DEFAULT_MANIFEST.shortName)),
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: clean(options.themeColor, DEFAULT_MANIFEST.themeColor),
      background_color: clean(options.backgroundColor, DEFAULT_MANIFEST.backgroundColor),
      display: 'standalone',
    },
    null,
    2,
  );
}
