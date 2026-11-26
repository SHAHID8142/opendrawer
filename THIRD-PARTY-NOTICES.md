# Third-party notices

OpenDrawer is distributed under the GNU Affero General Public License v3.0 or later
(`AGPL-3.0-or-later`). It bundles or loads the following third-party components at runtime.
Each remains under its own licence; the AGPL applies to OpenDrawer's own code.

This file must be updated in the same commit that adds or upgrades a dependency.

## Runtime libraries

| Component | Version | Licence | Upstream | Used for |
| --- | --- | --- | --- | --- |
| React / React DOM | 19.x | MIT | https://react.dev | UI |
| pdf-lib | 1.17.1 | MIT | https://github.com/Hopding/pdf-lib | PDF structure edits, forms, creation |
| PDF.js (`pdfjs-dist`) | 6.x | Apache-2.0 | https://github.com/mozilla/pdf.js | Rendering, text extraction |
| jsPDF | 3.x | MIT | https://github.com/parallax/jsPDF | Text/Markdown → PDF |
| qpdf (WebAssembly build) | 12.2.0 | Apache-2.0 | https://github.com/qpdf/qpdf | Encryption, decryption, repair, lossless optimisation |
| `@neslinesli93/qpdf-wasm` | 0.3.1 | ISC wrapper | https://github.com/neslinesli93/qpdf-wasm | Loading the qpdf WASM build |
| Ghostscript (WebAssembly build) | pinned | **AGPL-3.0** | https://ghostscript.com | Strong compression, image downsampling |
| Tesseract.js | 7.0.0 | Apache-2.0 | https://github.com/naptha/tesseract.js | OCR worker API |
| tesseract.js-core | 6.1.2 | Apache-2.0 | https://github.com/naptha/tesseract.js-core | OCR WebAssembly cores, self-hosted under `/ocr/core/` |
| Tesseract `tessdata` language packs | 4.0.0_best_int (eng) | Apache-2.0 | https://github.com/tesseract-ocr/tessdata_best | English OCR model, self-hosted under `/ocr/lang/` |
| `docx` | 9.x | MIT | https://github.com/dolanmiu/docx | PDF → Word reconstruction |
| Noto Sans family (incl. Devanagari, Arabic) | pinned | SIL OFL 1.1 | https://fonts.google.com/noto | Embedded fonts for non-Latin text |
| i18next | 25.x | MIT | https://www.i18next.com | Translations (phase 3) |
| Workbox / `vite-plugin-pwa` | pinned | MIT | https://developer.chrome.com/docs/workbox | Offline shell |

## Bundled data files (dictionaries)

Served from this origin and fetched only when a language pack is first used. The licence text
for each pack ships beside it in `public/dictionaries/<locale>/LICENSE.txt`.

| Data | Version / date | Licence | Upstream | Used for |
| --- | --- | --- | --- | --- |
| SCOWL / Ispell Hunspell dictionaries (`en-US`, `en-GB`, `en-CA`, `en-AU`) | 2020.12.07 | SCOWL/Ispell permissive terms | http://wordlist.sourceforge.net | English spellchecking |
| `bn_BD` Hunspell dictionary | 2018, Jacob Thomas / Bengal Creative Media LTD | GPL-2.0-or-later | bn_BD Hunspell dictionary (copy shipped with this repository) | Bengali spellchecking |

## Build and test tooling (not shipped to users)

Vite (MIT), TypeScript (Apache-2.0), Vitest (MIT), Playwright (Apache-2.0), ESLint (MIT),
Prettier (MIT).

| Component | Licence | Upstream | Used for |
| --- | --- | --- | --- |
| Agent Skills (Addy Osmani) | MIT | https://github.com/addyosmani/agent-skills | Development workflow only; vendored in `.agents/skills/`, never shipped or imported by the app |
| Impeccable | Apache-2.0 | https://github.com/pbakaus/impeccable | Design craft skill (dev only) |
| Taste Skill (`design-taste-frontend`) | MIT | https://github.com/Leonxlnx/taste-skill | Anti-slop frontend skill (dev only) |
| Hallmark | MIT | https://github.com/Nutlope/hallmark | Anti-slop design skill (dev only) |
| Unslop | CC-BY-4.0 | https://github.com/heydamir/unslop | UI audit/repair skill (dev only); attribution kept in its `SKILL.md` |

## Licence texts to include with a release

1. **AGPL-3.0** — `LICENSE` in this repository (applies to OpenDrawer's own code).
2. **Apache-2.0** — PDF.js; include its `NOTICE` file as published by the project.
3. **AGPL-3.0 for Ghostscript** — the deployed site must offer the corresponding source. Because
   Ghostscript's build is unmodified, linking to this repository satisfies that obligation; the
   version and build flags are recorded below.
4. **SIL OFL 1.1** — Noto fonts; keep the licence text alongside the font files and do not rename
   the fonts.
5. **Apache-2.0 for tessdata** — keep the licence file with the language packs.

## Vendored WASM build record

Fill this in when a binary is actually vendored. Until then, the entries are pending.

| Binary | Upstream tag | Build command / flags | Built by | Date |
| --- | --- | --- | --- | --- |
| `qpdf.wasm` | _pending_ | _pending_ | _pending_ | _pending_ |
| `gs.wasm` | _pending_ | _pending_ | _pending_ | _pending_ |

## Notes on Copyleft

Ghostscript is AGPL-3.0. It may be distributed as part of this AGPL project. It must **not** be
combined with any permissive-only fork: a fork that removes the AGPL engines must remove them
entirely from the code and the build, not merely exclude them at deploy time.
