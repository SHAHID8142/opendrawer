# 02 — Tool catalogue

Every planned phase-1 tool, with its engine, its real limits, and its licence position.
IDs are permanent: they become URLs and must never be renamed.

**Live today:** `inspect-pdf`, `pdf-to-image`, `images-to-pdf`, `merge-pdf`, `split-pdf`,
`rotate-pdf`, `delete-pages`, `reorder-pages`, `extract-pages`, `page-numbers`, `watermark-pdf`, `crop-pdf`, `flatten-pdf`, `extract-text`, `add-image`, `ocr-pdf`, `resize-pdf`, `compress-pdf`, `protect-pdf`, `unlock-pdf`, `repair-pdf`, `fill-forms`, `extract-images`, `n-up-pdf`, `edit-metadata`, `split-by-bookmarks`, `redact-pdf`, `booklet-pdf`, `writing-check`. The rest are planned.

Legend for **Reliability**: ●●● exact and predictable · ●● good, with disclosed caveats ·
● best-effort, always warn the user.

## A. Create

| ID | Tool | Engine | Reliability | Limits to state in the UI |
| --- | --- | --- | --- | --- |
| `create-pdf` | Blank page builder — page size, margins, text, images, shapes, multiple pages | pdf-lib + jsPDF | ●●● | Text layout is manual (positions, not flow). No automatic pagination of long text. |
| `images-to-pdf` | Photos/images → one PDF | pdf-lib | ●●● | Images are re-encoded; very large photos are downscaled with a notice. |
| `text-to-pdf` | Text or Markdown → PDF | jsPDF / pdfmake | ●● | Basic Markdown only (headings, lists, bold/italic, code, simple tables). No CSS. |
| `scan-to-pdf` | Camera/photo pages → clean PDF | pdf.js canvas + pdf-lib | ●● | Grayscale/contrast/rotate only; **not** perspective correction or true deskew. |
| `html-to-pdf` | Print a local HTML file to PDF | browser print | ● | Uses the browser's print dialog; headers/footers depend on the browser. |
| `form-builder` | Create a fillable AcroForm | pdf-lib | ●● | Text fields, checkboxes, radios, dropdowns only; no calculations, no XFA. |

## B. Organise (structure edits — lossless, the most reliable group)

| ID | Tool | Engine | Reliability | Limits |
| --- | --- | --- | --- | --- |
| `merge-pdf` | Combine files, drag to order | pdf-lib | ●●● | Signed files lose their signature. Encrypted inputs need a password. |
| `split-pdf` | Split by ranges (e.g. 1-3, 7, 10-12) | pdf-lib | ●●● | Output is a ZIP when more than one file results. |
| `split-each-page` | One PDF per page | pdf-lib | ●●● | Large documents produce large ZIPs; warn above ~500 pages. |
| `extract-pages` | Keep only chosen pages | pdf-lib | ●●● | — |
| `delete-pages` | Remove chosen pages | pdf-lib | ●●● | Cannot delete every page (a PDF must have at least one). |
| `reorder-pages` | Drag to reorder / reverse | pdf-lib | ●●● | Thumbnails render lazily; 1000+ page files are slow to preview. |
| `duplicate-pages` | Copy pages within the document | pdf-lib | ●●● | — |
| `rotate-pdf` | Rotate all or selected pages | pdf-lib | ●●● | Rotation is metadata; some scanners bake rotation into the image. |
| `insert-blank` | Insert blank pages at positions | pdf-lib | ●●● | Page size must be chosen. |
| `crop-pdf` | Trim margins | pdf-lib | ●●● | Cropping hides, it does not delete content outside the box — say so. |
| `resize-pdf` | Scale pages to A4/Letter/etc. | pdf-lib | ●●● | Scale-to-fit or scale-to-fill (fill may clip edges). |
| `n-up-pdf` | 2-up / 4-up / booklet imposition | pdf-lib | ●● | Booklet order assumes the page count; odd counts get a blank page. |

## C. Edit

| ID | Tool | Engine | Reliability | Limits |
| --- | --- | --- | --- | --- |
| `edit-text` | Click a line and retype it | pdf.js + pdf-lib (+ content-stream rewrite) | ●● | Font matching is approximate for unusual fonts; no reflow — longer text shrinks to fit or overflows; scanned pages have no text to edit (use OCR first). |
| `add-text` | Place new text anywhere | pdf-lib | ●●● | Non-Latin scripts need an embedded font (loaded on demand). |
| `add-image` | Place an image or logo | pdf-lib | ●●● | PNG/JPEG; other formats are converted first and may lose transparency. |
| `annotate` | Highlight, underline, strikethrough, shapes, freehand, sticky notes | pdf.js overlay + pdf-lib | ●●● | Annotations can be flattened into the page or kept as editable annotations. |
| `whiteout` | Cover an area with the page colour | pdf-lib | ●● | Cosmetic only — **not** redaction (content remains extractable). Labelled as such. |
| `sign-pdf` | Draw, type or upload a signature | pdf-lib | ●● | A picture signature, not a certified e-signature. No identity proof, no tamper evidence. |
| `fill-form` | Fill AcroForm fields, then flatten | pdf-lib | ●● | XFA forms (some government PDFs) are unsupported and detected explicitly. |
| `date-stamp` | Add a date/time stamp | pdf-lib | ●●● | Local device time; no trusted timestamp. |

## D. Convert

| ID | Tool | Engine | Reliability | Limits |
| --- | --- | --- | --- | --- |
| `pdf-to-image` | Pages → JPG/PNG at chosen DPI, zipped | pdf.js | ●●● | A 300 DPI A4 page is ~8 MP; memory grows with DPI × pages. |
| `pdf-to-text` | Extract text, page by page | pdf.js | ●● | Scanned pages have no text layer — offer OCR instead. |
| `pdf-to-markdown` | Text + headings → Markdown | pdf.js heuristics | ●● | Headings, lists and tables are guessed from layout. |
| `pdf-to-html` | Text + images → HTML | pdf.js | ●● | Absolute positioning; not responsive. |
| `pdf-to-word` | Reconstruct a .docx | pdf.js + docx | ● | Body text survives; headings, bold/italic runs and tables only partly. Never present this as a faithful conversion. |
| `pdf-to-longimage` | All pages as one tall image | pdf.js | ●● | Huge canvases fail on mobile beyond a few pages. |
| `extract-images` | Pull embedded images out | pdf.js / pdf-lib | ●●● | Images are extracted in their stored encoding; some are raw masks. |
| `office-to-pdf` | **Not offered** | — | — | Needs LibreOffice; the browser build is ~150 MB, slow and unreliable. Explain why instead of shipping it. |

## E. Optimise, secure, repair

| ID | Tool | Engine | Reliability | Limits |
| --- | --- | --- | --- | --- |
| `compress-pdf` | Lossless → image recompression → rasterise fallback | pdf-lib + qpdf + Ghostscript + pdf.js | ●● | Scans often shrink 80%+; text PDFs may not shrink at all and can grow. Always report the delta and keep the original. |
| `compress-to-size` | Hit a target (e.g. 200 KB) | same | ● | Tries progressively harder and stops when it fits; if it cannot, it says so. |
| `protect-pdf` | AES-256 password + permissions | qpdf WASM | ●●● | Passwords are not recoverable. Permissions are advisory — viewers may ignore them. |
| `unlock-pdf` | Remove encryption **with the known password** | qpdf WASM | ●●● | Cannot open a file without its user password. Owner-password-only files can be stripped, and the UI explains that this was never security. |
| `redact-pdf` | Truly remove text/areas | pdf.js + pdf-lib | ● | Rasterises affected pages, so those pages lose selectable text. That is the point. Test asserts the text is gone. |
| `sanitise-pdf` | Strip JavaScript, embedded files, XFA, metadata, attachments | qpdf + pdf-lib | ●●● | Reports exactly what was removed. |
| `repair-pdf` | Recover a damaged file | qpdf WASM | ●● | Cannot recover content that is physically missing. |
| `flatten-pdf` | Bake forms and annotations into the page | pdf-lib | ●●● | The result is no longer fillable. |
| `compare-pdf` | Text-level diff of two PDFs | pdf.js | ●● | Text only; images and layout changes are not compared. |
| `inspect-pdf` | Page count, sizes, fonts, images, encryption, metadata, signatures | pdf.js + own parser | ●●● | Read-only. Useful as a "before you send this" privacy check. |
| `metadata-editor` | Edit or remove title/author/dates | pdf-lib | ●●● | Existing XMP metadata may need a second pass. |
| `watermark-pdf` | Text or image watermark, tiled or single | pdf-lib | ●●● | Added as a new layer; not removable by this app. |
| `page-numbers` | Numbers, headers, footers | pdf-lib | ●●● | Template-based: `Page {n} of {total}`. |
| `stamp-pdf` | "PAID", "RECEIVED", date stamps | pdf-lib | ●●● | — |
| `bates-numbering` | Sequential legal numbering | pdf-lib | ●●● | Prefix configurable; numbering runs across merged files. |
| `ocr-pdf` | Add a searchable text layer to scans | Tesseract.js + pdf-lib | ●● | Accuracy depends on scan quality; first run downloads 10–15 MB per language. Never overwrite the original text layer without asking. |
| `attachments` | Add or extract embedded files | pdf-lib | ●●● | — |

## F. Writing

| ID | Tool | Engine | Reliability | Limits to state in the UI |
| --- | --- | --- | --- | --- |
| `writing-check` | Spelling and copy checks | Hunspell dictionaries + local rules | ●● | No language model, no rewrite or tone advice. Rule list is short (repetition, spacing, sentence case, a few confusions, long sentences). Names and jargon are often flagged. Text only; not a PDF reader. |

## G. Cross-cutting UI, not tools

- Home page with search, groups, and "most used" ordering driven by real popularity (compress,
  merge, split, PDF↔images first).
- A shared drop zone, file list, progress with real percentages, and a result panel that always
  shows before/after size.
- A per-tool "How this works / What it cannot do" disclosure.
- A privacy proof panel: "You can verify this. Open your browser's Network tab while this runs."

## Count

6 create + 12 organise + 8 edit + 7 convert + 17 optimise/secure + 1 writing ≈ **51 tools**, of which
about 40 are independent user-facing operations (some share an engine and UI shell).
