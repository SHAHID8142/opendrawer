---
name: pdf-tools
description: Implement or modify an OpenDrawer PDF tool following the project's engine/worker/limits pattern, with the correct library for each operation and the honest-limits rules. Use whenever adding a tool, changing a PDF operation, or debugging a corrupt output file.
---

# OpenDrawer PDF tool skill

## Purpose

Use this skill when you add or change a tool in `src/tools/`. It encodes the decisions already
made in `docs/02-tool-catalog.md` and `docs/03-architecture.md` so you do not re-litigate them.

## Choose the engine by operation type

| Operation | Engine | Why |
| --- | --- | --- |
| Merge, split, extract, delete, reorder, rotate, crop, resize, N-up, page numbers, watermark, stamp, metadata, attachments, flatten, fill AcroForm, add text/image/shape | **pdf-lib** | Operates on the document model; exact and lossless; no rendering needed |
| Render page to pixels, text extraction with positions, thumbnails, page preview, PDF→image, true redaction, "compare" | **PDF.js** | It is a renderer; it cannot write files |
| Encryption (AES-256), decryption with a known password, repair, linearize, lossless optimisation | **qpdf via WASM** (`qpdf-run` or `@lipoe/browser-qpdf`) | pdf-lib cannot encrypt; qpdf is the battle-tested engine, ~2.1 MB WASM |
| Strong compression with image downsampling | **Ghostscript WASM** (~18 MB, AGPL) | Only engine that meaningfully shrinks image-heavy PDFs |
| OCR / searchable scans | **Tesseract.js** | Apache-2.0; load language data on demand (~10–15 MB per language) |
| New documents with real text layout (Markdown→PDF, reports) | **jsPDF** or **pdfmake** | pdf-lib has no text layout or line-breaking |

## Non-negotiable correctness rules

1. **Never rasterise when a structure edit will do.** Merge/split/rotate must preserve text,
   links and bookmarks. Rasterising is a deliberate, disclosed last resort.
2. **Text editing is overlay + operator rewrite, not reflow.** Render with PDF.js, place an
   editable box over each text line, then either remove the original show operators from the
   content stream (compensating the pen position by the removed glyph widths) or cover with the
   sampled background, and draw the replacement with a matched font. Say in the UI that font
   matching is approximate and long text shrinks rather than reflows.
3. **Coordinates:** PDF origin is bottom-left, in points (1/72 inch); the browser is top-left in
   CSS pixels. Always convert: `pdfX = cssX / scale`, `pdfY = pageHeight - cssY / scale - h`.
   Getting this wrong shifts every annotation — write a unit test for the transform.
4. **Redaction destroys content.** Clear the area, remove the text objects, then rasterise the
   page if the encoding is unclear. Verify the output by extracting text and asserting the
   redacted string is absent — this test is mandatory.
5. **Encrypted files:** `PDFDocument.load(..., { ignoreEncryption: true })` does *not* decrypt;
   it produces a broken file. Detect `/Encrypt` and route to qpdf with a password prompt.
6. **Fonts:** pdf-lib's standard fonts are Latin-1 only. Any user text that may contain other
   scripts needs an embedded font (Noto Sans subset) or it will throw. Subset large fonts.
7. **Signed PDFs:** detect a signature dictionary and warn before any save.
8. **Memory:** one page at a time; `OffscreenCanvas` in a worker; release buffers; stream the
   output into a Blob rather than holding the whole document twice.

## Standard shape of a tool

```ts
// meta.ts — no imports of engines
export const meta = {
  id: 'compress-pdf',
  title: 'Compress PDF',
  group: 'optimise',
  engine: ['pdf-lib', 'pdf.js', 'ghostscript'],
  limits: ['Text-only PDFs may not shrink', 'Phones: keep under ~100 MB'],
} as const;

// engine.ts — pure, no DOM, testable in Node
export async function run(input: Uint8Array, opts: Options): Promise<Result> { /* ... */ }

// Tool.tsx — UI only
const { run } = await import('./engine');   // lazy: keeps the page small
```

## Output validation checklist

- Output opens in Chrome and Firefox built-in viewers without a repair prompt.
- Page count, page sizes and rotation match expectations.
- For text-preserving operations: extract text before and after and diff it.
- For rasterising operations: check DPI and that no page is blank.
- File size is reported before and after, with the delta shown even when it is negative.

## Anti-patterns

- Loading pdf.js or Tesseract at module scope "for convenience".
- A catch-all `catch (e) { toast('Failed') }` — surface the real reason.
- Claiming "100% secure" or "military-grade encryption".
- Adding a spinner with no progress for operations that take more than two seconds — use the
  engine's own progress events (pdf.js page counts, Tesseract's `logger`, Ghostscript output).
- Writing to `localStorage` anything derived from a user's file, including filenames.
