# 06 — Roadmap

Three waves for the PDF suite (phase 1), then the wider toolkit. Each wave ships usable,
tested, documented tools — not partial ones. A tool is either live and honest about its limits,
or it is not in the release.

## Before wave 1 (scaffolding)

- Repository, licence files, `THIRD-PARTY-NOTICES.md`, README, CONTRIBUTING, AGENTS.
- Vite + React + TypeScript app shell, routing, design tokens, i18n plumbing (strings
  externalised even if only English exists).
- Shared UI: drop zone, file list, progress, result panel with before/after size, warning
  component, "what this cannot do" disclosure.
- Tool registry and the `src/tools/<id>/` contract.
- Fixture corpus builder script (normal, rotated, non-Latin, encrypted, truncated, large).
- CI: lint, typecheck, unit tests; a Playwright smoke job that asserts no off-origin requests.
- Deployment to a preview URL.

**Exit criteria:** home page loads, one trivial tool (`inspect-pdf`) works end to end, and the
browser proves zero network requests during processing.

## Wave 1 — the daily core (highest real-world demand)

Order justified by usage data: compression dominates, then merge/split and conversions.

1. `compress-pdf` + `compress-to-size`
2. `merge-pdf`
3. `split-pdf`, `split-each-page`, `extract-pages`
4. `pdf-to-image`, `images-to-pdf`
5. `rotate-pdf`, `reorder-pages`, `delete-pages`, `duplicate-pages`
6. `page-numbers`, `watermark-pdf`, `crop-pdf`
7. `protect-pdf`, `unlock-pdf`
8. `inspect-pdf`, `metadata-editor`, `flatten-pdf`
9. `sanitise-pdf`, `repair-pdf`

**Exit criteria:** a first-time mobile user can compress a 20 MB scan below 2 MB, merge three
files, and rotate a sideways document, without instructions; all outputs open cleanly in Chrome
and Firefox; Lighthouse accessibility ≥ 95.

## Wave 2 — the editor (the hard, differentiating part)

1. `edit-text` (PDF.js text layer + overlay + content-stream rewrite; font matching)
2. `add-text`, `add-image`, `annotate`, `whiteout`, `date-stamp`
3. `sign-pdf`, `fill-form`
4. `redact-pdf` (with the mandatory "text is gone" test)
5. `compare-pdf`, `bates-numbering`, `stamp-pdf`
6. `resize-pdf`, `n-up-pdf`, `insert-blank`
7. `attachments`

**Exit criteria:** editing a text line preserves everything else on the page pixel-for-pixel;
the redaction test proves the removed string is unrecoverable; the coordinate transform has unit
tests and no annotation is ever misplaced on a rotated page.

## Wave 3 — the heavy engines

1. `ocr-pdf` (language download UX, progress, never destroy the existing text layer without
   asking)
2. `pdf-to-text`, `pdf-to-markdown`, `pdf-to-html`, `pdf-to-word`
3. `extract-images`, `pdf-to-longimage`
4. `create-pdf`, `text-to-pdf`, `scan-to-pdf`, `form-builder`, `html-to-pdf`

**Exit criteria:** OCR gives a correct searchable layer on a 20-page English scan; the Word
export is labelled approximate and its own help text lists exactly what survives.

## Phase 2 — beyond documents

Images (convert, resize, compress, crop, HEIC→JPG, SVG), audio/video (convert, trim, extract
audio, video→GIF), and the everyday utilities (units, currency, dates, time zones, loan/EMI,
BMI, tip split, QR, password generator, text toolkit). Research note: image compression is the
single most-used tool on comparable sites, so it should lead this phase.

## Phase 3 — reach and polish

- Translations: Hindi, Bengali, Indonesian, Spanish, Arabic, French; full RTL support.
- PWA install flow and a proper offline page.
- Accessibility audit with a screen reader, not only Lighthouse.
- Self-hosting guide (one-page deploy on any static host).
- Public fixture corpus so contributors can test without sharing real documents.

## Deliberately deferred, possibly forever

PDF/A, PDF/UA remediation, certified e-signatures, Office→PDF, cloud storage, accounts,
sharing, batch server-style processing (thousands of files in one go — a single tab cannot do
this well, and saying so is better than pretending).

## How progress is judged

Not by tool count. By: does a real person finish their task on a phone, and does the browser
stay silent while they do it.
