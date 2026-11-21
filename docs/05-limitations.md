# 05 — Limitations and the honesty page

This is the copy the site will actually show. It is written to be usable as-is. The rule behind
it: **if a tool cannot do something, the site says so before the user tries**, not in a footnote.

## The short version (home page footer block)

> **Everything runs on your device.**
> Your file is never uploaded, because there is nowhere to upload it. There is no account, no
> ad, no payment, no limit and no watermark.
>
> **We are honest about what a browser can do.** A few things need a desktop program, and a few
> things are approximate. They are listed below rather than hidden.

---

## Full page: "What this site can and cannot do"

### Compression

Compression works by shrinking the images inside a PDF. So:

- **Scanned documents and photo-heavy PDFs** often get 80–98% smaller.
- **Text-only PDFs** sometimes cannot shrink at all, and a few get slightly larger. When that
  happens the site tells you and offers to keep your original file unchanged.
- Aggressive settings reduce image clarity. Always check the result before sending it anywhere.

### Editing text in an existing PDF

You can click a line of text and retype it, and new text is placed at the same position, size and
colour. But:

- A PDF stores letters at coordinates, not paragraphs. **There is no reflow.** If you type a lot
  more text than was there, it shrinks to fit or overflows the line.
- **Fonts are matched approximately.** If the original used an unusual or embedded font, the new
  text may look slightly different.
- **Scanned pages have no text to edit.** They are pictures. Run OCR first, or place new text on
  top.

### Redaction

The redaction tool **destroys** the content and leaves a black area. That means the affected
pages become images: their text is no longer selectable or searchable. This is deliberate — it
is the only safe way. Sites that draw a black box over text leave the text underneath, and it
copies straight out. Never trust a redaction tool that keeps the text.

### Passwords

- A PDF password is real encryption, and this site cannot open a file without it. **There is no
  password recovery.**
- Some PDFs have only an "owner password", which restricts printing or editing but is not
  encryption. Those can be opened without a password; that restriction was always advisory.
- Permissions ("do not print", "do not copy") are requests that viewers may ignore. They are not
  security.

### Signatures

- The signature tool draws or places your signature image or typed name. It looks professional
  and is fine for everyday paperwork.
- It is **not** a certified electronic signature. It proves nothing about identity, and it does
  not detect later changes.
- If a PDF already has a digital (certificate) signature, **editing it will invalidate that
  signature.** The site warns you before saving.

### Word, Excel and PowerPoint

- **Word/Excel/PowerPoint → PDF is not offered.** Doing it properly needs a full office suite
  running on a server, which would mean uploading your document — the one thing this site
  promises never to do.
- **PDF → Word** works on text-based PDFs, but treat it as a starting point: body text survives
  well, headings, bold/italic and tables only partly. It is a reconstruction, not a translation.
- Scanned PDFs need OCR before conversion.

### Images and OCR

- OCR accuracy depends on scan quality, language and layout. Handwriting is poor.
- The first OCR run downloads a language file (10–15 MB). After that it is cached and works
  offline.
- Very large images are downscaled on phones; the site shows the final resolution.

### Big files on phones

Everything happens in your device's memory, so phones have a real ceiling — roughly a few
hundred megabytes. The site warns before starting a job that is likely to exceed it, and always
keeps your original file untouched if a job fails.

### Accessibility and archival formats

- **PDF/A (long-term archive)** and **PDF/UA (accessibility tagging)** are not offered. Both
  need specialised validators to be correct, and a wrong file is worse than no file.
- If you need those, use a desktop tool that validates its output.

### Privacy, precisely

- No file is uploaded. There is no upload endpoint in the code.
- No account, no cookie, no analytics, no error reporting.
- Only your own preferences (theme, last tool) may be stored locally, and never a filename.
- You can verify all of this: open your browser's developer tools, go to the Network tab, and
  process a file. Or switch off your internet after the page loads.
- The source code is public. You do not have to take our word for any of it.

---

## In-tool warning strings (use verbatim)

- Signed file: "This PDF has a digital signature. Saving changes will invalidate it."
- Redaction: "This permanently removes the content and makes these pages images. The removed
  text cannot be recovered or selected afterwards."
- Whiteout: "This only covers the content. The text underneath can still be copied — use
  Redact if it is sensitive."
- Compression: "This file cannot be made smaller without losing quality. Keep the original?"
- OCR: "This is a scanned page. Recognise its text first if you want to edit it."
- Unlock: "You need the password that opens this file. This tool cannot guess it."
- Office: "Converting Word to PDF needs a desktop office suite. This site does not upload
  documents, so it does not offer this."
- Large file on mobile: "This is a large file for a phone. It may run out of memory. Your
  original will not be changed."
