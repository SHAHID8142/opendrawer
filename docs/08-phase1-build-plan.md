# 08 — Phase 1 build plan

The actionable version of `06-roadmap.md`: what to create, in what order, and how each step is
proved done. Written so a developer — or an AI agent with `AGENTS.md` loaded — can start without
asking questions.

**Current state (November 2026):** steps 0–2 are done — the Astro shell, the design system and
`inspect-pdf` are live, `pdf-to-image` followed as the first Wave 1 tool, and `images-to-pdf`
now covers the pdf-lib creation path, and `merge-pdf` starts the Organise group, followed by `split-pdf`, `rotate-pdf`, `delete-pages`, `reorder-pages`, `extract-pages`, `page-numbers`, `watermark-pdf`, `crop-pdf`, `flatten-pdf`, `extract-text`, `add-image`, `ocr-pdf`, `resize-pdf`, `compress-pdf`, `protect-pdf`, `unlock-pdf`, `repair-pdf`, `fill-forms`, `extract-images`, `n-up-pdf`, `edit-metadata` and `split-by-bookmarks`. The remaining wave-1
tools are the open work. This document stays the ordering; update it when a step lands.

**Guardrails for the whole phase:** `AGENTS.md` rules; AGPL headers; no network requests during
processing; every tool declares its limits in the UI.

---

## Step 0 — Repository hygiene (already done)

- [x] Documentation set committed
- [x] `LICENSE` (full AGPL-3.0 text)
- [x] `.gitignore`, `THIRD-PARTY-NOTICES.md`, `mcp.example.json`, `skills/pdf-tools/SKILL.md`
- [ ] Branch protection on `main` (human action, optional)
- [ ] GitHub repository description + topics (human action, optional)

## Step 1 — Scaffold (target: one short session)

**Astro, not a Vite SPA** — see "Rendering model and SEO" in `03-architecture.md`. Forty tool
pages whose whole job is to be found in search must exist as HTML; social and AI crawlers do not
run JavaScript at all.

```bash
npm create astro@latest . -- --template minimal --typescript strict --no-install
npm add astro @astrojs/react react react-dom pdf-lib pdfjs-dist
npm add -D @astrojs/check typescript vitest @vitest/coverage-v8 @playwright/test \
  @axe-core/playwright stylelint prettier
```

Deliverables:

| File | Purpose |
| --- | --- |
| `astro.config.mjs` | React integration, `site` URL for canonical/sitemap, static output |
| `tsconfig.json` | `astro/tsconfigs/strict` + `react-jsx` |
| `public/_headers` | CSP, nosniff, referrer policy, cache policy |
| `src/layouts/Base.astro` | head, per-page meta, canonical, OG, skip link, theme |
| `src/pages/index.astro`, `src/pages/tools/<id>.astro` | static pages, one per route |
| `src/styles/tokens.css` | design tokens: type scale, spacing, colours, focus ring (rules in `09`) |
| `src/styles/base.css`, `layout.css`, `patterns.css` | element rules, shell and page patterns, tokens only |
| `src/lib/tools.ts` | the single tool list (id, group, name, blurb, status) |
| `src/components/FileDrop.tsx` | drop zone + "choose files" button (keyboard path) |
| `src/components/FileList.tsx` | names, sizes, remove |
| `src/components/Progress.tsx` | determinate where possible, `aria-live` |
| `src/components/ResultPanel.tsx` | before/after size, download, warnings |
| `src/components/LimitsNote.astro` | "what this cannot do" disclosure, rendered as static HTML |
| `src/lib/download.ts` | object-URL download + revoke |
| `src/lib/format.ts` | byte formatting, file-type sniffing |
| `src/lib/coords.ts` | PDF ↔ CSS coordinate transform **with unit tests** |
| `src/engines/pdfLib.ts` | lazy pdf-lib loader + shared helpers |
| `scripts/gates/*.mjs` | UI-G1 token lint, UI-G2 contrast, UI-G6 copy lint |
| `tests/gates.spec.ts` | UI-G3–G9: axe, viewports, target size, reduced motion, no off-origin, content-in-HTML |

**Done when:** `npm run dev` serves the home page; `npm run gates` passes (token, contrast,
copy, build, Playwright); the shell is ≤ 150 KB gzip; no third-party request appears in the
Network tab; and the built tool page contains its heading and limits text with JavaScript
disabled (UI-G9).

## Step 2 — First real tool: `inspect-pdf`

Read-only, no writes, smallest possible surface. It proves the whole pipeline (static page →
hydrate the island → load the engine → report → render results) without risk of corrupting a file.
It lives at `src/pages/tools/inspect-pdf.astro` wrapping `src/tools/inspect-pdf/Tool.tsx`, with
all parsing in `src/tools/inspect-pdf/inspect.ts` (no React import, so it is unit-testable).

Shows: page count, page sizes and rotation, encryption state, signature presence, fonts, image
count, metadata, and a plain-language privacy verdict ("this file contains an author name").
**Done when:** a fixture PDF with metadata and encryption is correctly described, and an
encrypted file does not crash the tab.

## Step 3 — Wave 1 tools, in this order

Each item is one folder under `src/tools/<id>/` and one line in `registry.ts`.

1. `pdf-to-image` — renders pages; the simplest way to validate PDF.js + canvas + worker plumbing.
2. `images-to-pdf` — pdf-lib creation path.
3. `merge-pdf` — first multi-file, drag-order tool.
4. `split-pdf` + `split-each-page` + `extract-pages` — one engine, three UIs.
5. `rotate-pdf`, `reorder-pages`, `delete-pages`, `duplicate-pages` — share a page-thumbnail grid.
6. `page-numbers`, `watermark-pdf`, `crop-pdf`.
7. `protect-pdf` + `unlock-pdf` — first qpdf WASM tool; test encrypted fixtures both ways.
8. `metadata-editor`, `flatten-pdf`.
9. `compress-pdf` — start with lossless re-save + image recompression; add Ghostscript last.
10. `sanitise-pdf`, `repair-pdf`.

**Done when:** the wave-1 exit criteria in `06-roadmap.md` hold on a real phone.

## Step 4 — Waves 2 and 3

Per `06-roadmap.md`. Wave 2 begins with `edit-text`, which needs the coordinate transform from
Step 1 and a text-layer overlay; wave 3 adds Tesseract and the conversion tools.

**Queued for next phase (tool pages `/tools/<slug>`):**
- [ ] **Uploaded file previews:** Add lightweight local previews (on-demand PDF page thumbnails via PDF.js and image thumbnails via `FileList`) across tool pages, freeing canvas buffers explicitly after render.

---

## Testing that must exist from day one

| Test | Guards against |
| --- | --- |
| `coords.test.ts` | annotations misplaced on rotated or scaled pages |
| merge page-count property | silent page loss |
| redaction text-absence test (wave 2) | the worst possible failure: a fake redaction |
| "no off-origin request" Playwright check | a dependency phoning home |
| UI-G9 content-in-HTML check | a tool page that only exists after hydration, so it cannot be found or shared |
| encrypted fixture round-trip | pdf-lib's `ignoreEncryption` trap |
| truncated-file fixture | an unhandled crash instead of a clear message |

## Fixtures to generate (script, not committed binaries over ~100 KB)

Synthetic files only: 1-page text, 20-page scan-like, rotated page, A4 + Letter mixed,
non-Latin text (Devanagari + Arabic), password-protected, owner-password-only, signed, truncated,
zero-page, 500-page. Never commit a real person's document.

## Definition of done for phase 1

- Wave 1 tools all ship with limits stated, fixtures, and passing tests.
- A mid-range Android phone can compress a 20 MB scan to under 2 MB without crashing.
- Zero network requests during processing, proved in the Network tab and by CSP.
- Every produced file opens in Chrome and Firefox without a repair prompt.
- Lighthouse accessibility ≥ 95 on home and tool pages.
- `LICENSE` and `THIRD-PARTY-NOTICES.md` are accurate for everything actually shipped.

## Open decisions before coding starts

1. **Ghostscript or not.** Including it (AGPL) gives real compression on scans; excluding it
   keeps a permissive-only subset possible. Recommendation: include it.
2. **Language of the UI.** English only at first, with all strings externalised for translation.
3. **Hosting target.** Cloudflare static assets (recommended) or any static host; no server.
