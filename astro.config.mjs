import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Static output only: the site is HTML files plus hashed assets on a CDN.
// `site` is what canonical URLs and the sitemap are built from, so it is read from the
// environment at build time and has a single documented default.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://opendrawer.app',
  output: 'static',
  integrations: [react()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // Keep worker and WASM handling straightforward for the engine chunks.
      target: 'es2022',
    },
  },
});
