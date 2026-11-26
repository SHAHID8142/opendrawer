import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Static output only: the site is HTML files plus hashed assets on a CDN.
// `site` is what canonical URLs and the sitemap are built from, so it is read from the
// environment at build time and has a single documented default.
export default defineConfig({
  // SITE_URL wins; on Vercel the production domain is used when the variable is absent,
  // so canonical URLs and the sitemap match the deployed host without extra setup.
  site:
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://opendrawer.app'),
  output: 'static',
  integrations: [react()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // Keep worker and WASM handling straightforward for the engine chunks.
      target: 'es2022',
      // Never inline module scripts into HTML so strict script-src 'self' CSP holds on static hosts.
      assetsInlineLimit: 0,
    },
  },
});
