# 03 — Architecture

## Shape of the system

```
Static site (React + TS + Vite)  ──►  CDN / static host  ──►  browser tab
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
| Framework | React 19 + TypeScript (strict) | Boring, widely known, good ecosystem for PDF wrappers |
| Build | Vite | Fast, simple, static output |
| Routing | Client-side routes, one route per tool (`/tools/<id>`) | Static hosting needs a SPA fallback |
| Styling | Plain CSS modules + design tokens | No CSS-in-JS runtime, no UI kit bloat |
| State | Local component state + URL params | No global store |
| i18n | `i18next` with JSON catalogues, lazy-loaded | Added in phase 3; keep strings out of components from day one |
| PWA | `vite-plugin-pwa` (Workbox) | Precache the shell; engines cached on first use |
| Tests | Vitest (unit, engine fixtures) + Playwright (smoke, network assertions) | Optional E2E, mandatory unit |
| Hosting | Cloudflare Workers static assets (or Pages, Netlify, GitHub Pages) | Pure static; any host works |

## Module layout

```
src/
  app/            shell: router, layout, theme, error boundary
  components/     drop zone, file list, progress, result panel, warnings, a11y primitives
  tools/
    registry.ts   the single list of tools (id, group, meta, lazy component)
    <tool-id>/    meta.ts, Tool.tsx, engine.ts, worker.ts, limits.ts, __fixtures__/
  engines/        thin, shared wrappers only: pdfLib.ts, pdfJs.ts, qpdf.ts, gs.ts, ocr.ts
  lib/            units, coordinates, file-type sniffing, zip, download, formatting
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
heavy engines fail to download (degrade to a clear message plus a retry).

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
- **Smoke (Playwright):** open each tool, run one fixture, assert a download appears and that
  no request left the origin.
- **Manual, per release:** one real phone, one low-end laptop, Wi-Fi switched off.
