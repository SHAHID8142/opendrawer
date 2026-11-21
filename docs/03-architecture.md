# 03 — Architecture

## Shape of the system

```
Static site (Astro + React islands)  ──►  CDN / static host  ──►  browser tab
                                                              │
                                            ┌─────────────────┴─────────────────┐
                                            │  main thread: UI, routing, state   │
                                            └─────────────────┬─────────────────┘
                                                              │ postMessage
                                            ┌─────────────────┴─────────────────┐
                                            │  Web Worker(s): engines, canvases  │
                                            └───────────────────────────────────┘
```

There is no server, no API, no database, no queue. The "backend" is the visitor's CPU.

## Stack

| Concern | Choice | Note |
| --- | --- | --- |
| Framework | **Astro 7** (content + routing) with **React 19 islands** for tool UI, TypeScript strict | Pages are HTML; React runs only inside the tool that needs it |
| Build | Vite (via Astro) | Same fast build, static HTML per route |
| Routing | File-based routes, one **statically generated page** per tool (`/tools/<id>`) | No SPA fallback, no soft 404s |
| Styling | Plain CSS + design tokens (`src/styles/tokens.css`, rules in `09-ui-ux-design-system.md`) | No CSS-in-JS runtime, no UI kit bloat |
| State | Local component state + URL params | No global store |
| i18n | `i18next` with JSON catalogues, lazy-loaded | Added in phase 3; keep strings out of components from day one |
| PWA | `vite-plugin-pwa` via the Astro integration (phase 2) | Precache the shell; engines cached on first use |
| Tests | Vitest (unit, engine fixtures) + Playwright with `@axe-core/playwright` (UI gates, network assertions) | Optional E2E, mandatory unit |
| Hosting | Cloudflare Workers static assets (or Pages, Netlify, GitHub Pages) | Pure static; any host works |

## Rendering model and SEO

This is the reason the framework is Astro rather than a Vite SPA, so it is a constraint, not a
preference.

- Every route is **rendered to HTML at build time**. A crawler, a link preview, an AI crawler or a
  reader with JavaScript disabled receives the title, description, `h1`, the tool's explanation,
  its limits and its FAQ as text — before a single byte of JavaScript runs.
- React hydrates **only the tool island** on the page it belongs to (`client:visible`), so a
  content page ships no React at all. Engines load from inside that island, on first use.
- The home page, `/tools/<id>`, `/docs/*` and `/about` are all static files. There is no SPA
  fallback, so an unknown path is a real 404 rather than a 200 with an empty shell.
- Each tool page carries its own `<title>`, meta description, canonical URL, Open Graph tags and
  `SoftwareApplication` / `FAQPage` structured data, generated from the tool's `meta.ts`.
- `sitemap.xml` and `robots.txt` are generated at build time, so a new tool is discoverable the
  moment it deploys.
- Gate **UI-G9** enforces it: the built page is fetched with JavaScript disabled and the heading,
  description and limits text must be present. If a tool stops being crawlable, the build fails.

Tool logic itself lives in framework-agnostic modules under `src/tools/<id>/`; the island is a
thin mount. Swapping the shell later would not require rewriting a tool.

## Module layout

```
src/
  pages/          file-based routes: index, tools/<id>.astro, docs/*, sitemap.xml.ts
  layouts/        Base.astro — head, meta, canonical, theme, skip link
  components/     shared .astro chrome (header, footer, limits note) and React UI pieces
  tools/
    <tool-id>/    meta.ts, Tool.tsx (the island), logic.ts, limits.ts, __fixtures__/
  lib/            units, coordinates, file-type sniffing, zip, download, formatting, tool list
  styles/         tokens.css (the only place literals live), global.css
  engines/        thin, shared wrappers only: pdfLib.ts, pdfJs.ts, qpdf.ts, gs.ts, ocr.ts
  i18n/           catalogues
  wasm/           vendored binaries + build notes (see licensing doc)
```

Rule: a tool may import from `engines/`, `lib/` and `components/`, never from another tool.

## Engine loading and bundle budgets

Nothing heavy loads on the home page.

| Asset | Approx. size | When loaded |
| --- | --- | --- |
| App shell (HTML+CSS+JS, gzip) | target ≤ 150 KB | immediately |
| pdf-lib | a few hundred KB | first structure tool |
| PDF.js + worker | ~1 MB | first render/extract tool |
| qpdf WASM | ~2.1 MB | protect/unlock/repair/optimise |
| Ghostscript WASM | ~18 MB | strong compression only, with a progress explanation |
| Tesseract core + language | ~3 MB + 10–15 MB per language | OCR only, language chosen by the user |

Techniques: route-level `import()`, `<link rel="preload">` only for the shell, `Cache-Control:
immutable` on hashed assets, WASM served from the same origin (never a CDN), and a visible
"preparing the engine…" state on slow connections rather than a frozen button.

## Threading and memory rules

- Anything over ~5 MB, or over ~50 ms of CPU, runs in a Worker.
- Use `OffscreenCanvas` inside workers for rasterisation; fall back to main-thread canvas when
  unavailable, and say so in the tool's caveat list.
- Process **one page at a time**, writing output chunks into a growing `Blob`. Never hold the
  source, the decoded bitmaps and the output simultaneously if avoidable.
- Set explicit budgets: max pages for rasterising tools, max pixels per canvas, max input size
  per tool. On breach: stop, keep the original, explain.
- Terminate and recreate a worker after a trap or a timeout; a hostile PDF must not be able to
  hang the tab.
- Single-threaded builds by default. Multithreaded FFmpeg (later phase) requires
  `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`,
  which can break third-party embeds — decide per tool, not globally.

## Security posture

- **CSP:** `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'
  blob:; img-src 'self' blob: data:; style-src 'self'; connect-src 'self'; frame-ancestors 'none';
  base-uri 'none'; form-action 'none'`.
  `connect-src 'self'` is the technical guarantee behind "nothing is uploaded" — it blocks a
  future accidental `fetch` to anywhere else.
- No `eval`, no dynamic script injection, no third-party scripts, no remote fonts.
- Never execute JavaScript embedded in a PDF; never auto-follow PDF links; never render remote
  resources referenced by a PDF.
- Files stay in memory. No `localStorage`/IndexedDB persistence of user content, ever.
- Downloads use `URL.createObjectURL` and are revoked after use.
- Signed PDFs: detect and warn before modification.
- Treat every input as hostile: fuzz the fixture corpus with truncated and oversized files.

## Routing and URLs

`/` home · `/tools/<id>` a tool · `/docs/privacy`, `/docs/limits`, `/docs/licence`, `/about`.
Tool URLs are permanent. Every page must work on first load without JavaScript errors when the
heavy engines fail to download (degrade to a clear message plus a retry). Because the routes are
static files, the home page and every tool page also work with JavaScript disabled — the tool
degrades to its explanation and a "JavaScript is required to process the file" notice.

## Offline behaviour

Service worker precaches the shell and the home page. Engines are cached after first use, so a
user who has opened "Compress PDF" once can use it offline on the same device afterwards. The UI
states this plainly: "This tool is now available offline."

## Deployment

Static output only. A `_headers` file sets CSP, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer`, `Permissions-Policy`, and long-lived caching for hashed assets.
No environment variables are needed at runtime — which is also why there is nothing to leak.

## Accessibility baseline

Semantic landmarks, one `h1` per page, visible focus rings, 44 px touch targets, no colour-only
meaning, progress announced via `aria-live`, drag-and-drop always paired with a "choose files"
button, and keyboard-only operability of the whole file flow.

## Testing strategy

- **Unit:** engine functions against fixtures (normal, rotated, non-Latin, encrypted, truncated,
  1-page, 500-page).
- **Property:** redaction output must not contain the redacted string; merge output page count
  equals the sum of inputs.
- **UI gates (Playwright + `@axe-core/playwright`):** axe on every route, viewport matrix,
  target sizes, reduced motion, no off-origin request, and **UI-G9 content-in-HTML** (JavaScript
  disabled). Defined in `09-ui-ux-design-system.md`.
- **Smoke (Playwright):** open each tool, run one fixture, assert a download appears and that
  no request left the origin.
- **Manual, per release:** one real phone, one low-end laptop, Wi-Fi switched off.
