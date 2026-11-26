# 04 — Licensing and dependencies

## Project licence

`AGPL-3.0-or-later`. See `LICENSE-NOTICE.md` for the reasoning and the obligations to satisfy
before release.

## Runtime dependency table

Add a row **in the same commit** as the dependency. "Status" must be one of: approved /
needs-verification / rejected.

| Library / binary | Used for | Licence | Status | Notes |
| --- | --- | --- | --- | --- |
| React | UI | MIT | approved | — |
| Vite | build | MIT | approved | — |
| pdf-lib | structure edits, forms, creation | MIT | approved | 1.17.1; maintenance has slowed, so wrap it behind `engines/pdfLib.ts` to allow replacement |
| PDF.js (`pdfjs-dist`) | rendering, text extraction | Apache-2.0 | approved | Mozilla; actively maintained; the engine behind Firefox's viewer |
| Tesseract.js | OCR worker API | Apache-2.0 | approved | 7.0.0; worker, cores and English data are self-hosted from `/ocr/` |
| `@neslinesli93/qpdf-wasm` | qpdf 12.2.0 in WebAssembly | ISC wrapper / Apache-2.0 qpdf | approved | 0.3.1; 1.3 MB WASM loaded on demand by `src/lib/qpdf-worker.ts` |
| tesseract.js-core | OCR WebAssembly | Apache-2.0 | approved | 6.1.2; three LSTM cores copied by `scripts/copy-ocr-assets.mjs` |
| `@tesseract.js-data/eng` | English traineddata | MIT package / Apache-2.0 data | approved | 4.0.0_best_int, 2.8 MB gzip, served from this site; no CDN |
| jsPDF | text/Markdown → PDF | MIT | approved | Generation only; weak layout engine |
| pdfmake | alternative layout engine | MIT | needs-verification | Only if jsPDF proves too limited |
| qpdf (via `qpdf-run` or `@lipoe/browser-qpdf`) | encryption, decryption, repair, lossless optimisation | Apache-2.0 (qpdf); wrapper licences vary (MIT/ISC/Apache-2.0) | approved | ~2.1 MB WASM; verify the wrapper you pick and record its version |
| Ghostscript (WASM build) | strong compression, image downsampling | **AGPL-3.0** | approved | ~18 MB; the reason the project is AGPL. Record exact build and flags |
| Tesseract.js | OCR | Apache-2.0 | approved | Language data (tessdata) is Apache-2.0; self-host it |
| `docx` | PDF → Word reconstruction | MIT | approved | Output quality is the limitation, not the licence |
| Mammoth.js | DOCX → HTML (if a basic reader is added) | BSD-2-Clause | needs-verification | Fidelity is basic |
| Noto Sans / Noto Sans Devanagari etc. | embedded fonts for non-Latin text | SIL OFL 1.1 | approved | Subset aggressively; include the OFL notice |
| i18next | translations (phase 3) | MIT | approved | — |
| `vite-plugin-pwa` / Workbox | offline shell | MIT | approved | — |
| Playwright | smoke tests | Apache-2.0 | approved | Dev dependency only |
| Material Symbols (`@material-symbols/svg-300`) | Google Material Symbols Rounded SVG path data (git tag `backup/google-material-icons`) | Apache-2.0 | approved | Path strings vendored; zero runtime dependency or CDN request |
| Lucide (`lucide-static` v1.81.0) | ChatGPT-style crisp monoline SVG icons in `src/lib/glyph-paths.ts` | ISC | approved | Path/shape markup vendored at author time; zero runtime dependency or CDN request |

## Explicitly rejected

| Option | Why not |
| --- | --- |
| MuPDF / `mupdf.js` | AGPL — allowed in principle, but adds a second heavy engine for capability pdf-lib + qpdf already cover. Revisit only if PDF.js rendering proves insufficient. |
| LibreOffice WASM | ~150 MB, 10–15 s start-up, unstable; would break the "fast on a phone" principle |
| Any commercial PDF SDK (Apryse, Nutrient, PSPDFKit) | Conflicts with free/open-source goals |
| Any "source-available, non-commercial" licence | Incompatible with AGPL distribution |
| Server-side rendering services (HTML→PDF APIs) | Sends user content to a third party |
| Google Analytics, Plausible, Sentry, any telemetry | Violates the promise; also makes the privacy claim unverifiable |
| CDN-hosted scripts/fonts | Extra network requests; CSP is `'self'` only |

## If you want an MIT subset

A permissive fork is possible with pdf-lib (MIT) + PDF.js (Apache-2.0) + qpdf (Apache-2.0) only.
It must **remove** Ghostscript entirely — dropping it from the build is not enough if the code
still references it. The cost: scans compress far less well, and PDF/A and PS/EPS handling
disappear. Document the reduced capability honestly.

## Attribution requirements to honour in the UI

- PDF.js: Apache-2.0 — include its NOTICE text in `THIRD-PARTY-NOTICES.md`.
- Ghostscript: AGPL — the running app must offer its source (the app's own source link satisfies
  this for the unmodified binary; note the Ghostscript version and build flags).
- Noto fonts: OFL — include the licence text; do not rename the fonts.
- Tesseract traineddata: Apache-2.0 — keep the licence file alongside the language packs.

## Contributor terms

`git commit -s` (Developer Certificate of Origin 1.1). No copyright assignment. Contributors
retain their copyright and license their contribution under AGPL-3.0-or-later.
