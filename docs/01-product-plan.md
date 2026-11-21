# 01 — Product plan

## One sentence

A free, ad-free, account-free website where anyone can do the document jobs of daily life —
compress, merge, split, convert, edit, sign, scan, redact — with the file never leaving their
own device.

## Who it is for

The research is unambiguous about who actually uses free file tools:

- **Mobile-first users.** ~47% of sessions on such sites are phones. A mid-range Android phone
  on metered data is the primary device, not a laptop.
- **Users in South and South-East Asia** dominate traffic (India, Indonesia, the Philippines).
  Low bandwidth, older devices, and documents that matter: job applications, government forms,
  university admissions, visa paperwork, rent agreements, medical records.
- **People with no money for software** and no trust in the sites that ask for an upload.

They do not want a "platform". They want the task finished in twenty seconds, on the phone,
without a sign-up.

## Principles

1. **The file never moves.** Not "we delete it after an hour" — it never arrives.
2. **Free means free.** No ads, no upsell, no watermark, no limit, no "3 files per day".
3. **Honest about limits.** Every tool says what it cannot do, before the user tries.
4. **Fast on a bad connection.** The home page must be usable before the heavy engines load.
5. **Boring, predictable, accessible.** Large touch targets, clear language, no dark patterns.
6. **Open source and self-hostable.** Anyone can copy it, translate it, or run it for a village,
   a school, or a country.
7. **Nothing to maintain.** No server means no downtime, no breach, no bill, no moderation.

## Scope — phase 1

The complete portable-document suite: about 40 tools across create, organise, edit, convert,
optimise and secure. Details and IDs in `02-tool-catalog.md`.

## Scope — later phases

- Image tools (convert, resize, compress, HEIC→JPG, crop, SVG), audio/video (trim, extract
  audio, convert, GIF), OCR-based utilities.
- Everyday-life utilities: unit and currency conversion, date/age, time zones, loan/EMI, BMI,
  tip split, QR generator/scanner, password generator, text toolkit.
- Translations (start with English, Hindi, Bengali, Indonesian, Spanish, Arabic, French),
  right-to-left layout.
- Installable app (PWA) with a proper offline experience.

## Explicit non-goals

- Word/Excel/PowerPoint → PDF with real fidelity (needs a full office suite server-side).
- Certified digital signatures (PAdES) with certificate authorities.
- PDF/A archival conversion and PDF/UA accessibility remediation — both need heavy validators
  and produce invalid files if rushed.
- Cloud storage, syncing, accounts, sharing links, collaboration.
- Anything that defeats another person's protection: watermark removal, DRM removal,
  password cracking.

## Success criteria

The product is working when all of these are true:

- The browser makes **zero** network requests after page load while any tool processes a file.
- Turning off Wi-Fi after loading a tool does not break it.
- The home page is interactive in under 2.5 s on a simulated mid-range Android over 3G.
- A 20 MB scanned PDF compresses below 2 MB on a phone without the tab crashing.
- Every tool produces a file that opens without a repair prompt in Chrome and Firefox.
- A first-time user completes "compress to under 200 KB" without reading any instructions.
- Lighthouse accessibility ≥ 95 on the home page and every tool page.

## Risks, and the honest mitigations

| Risk | Mitigation |
| --- | --- |
| Mobile memory kills big-file jobs | Per-tool size warnings, worker isolation, page-at-a-time processing, graceful failure with the original file intact |
| "Editing" disappoints users expecting Word-like reflow | Name it precisely, show inline help, and say that long edits shrink rather than reflow |
| A tool silently corrupts a file | Fixture corpus + output validation in tests; never replace the user's file, always download a new one |
| Licence drift when adding dependencies | Licence table is part of the PR checklist |
| Project gets abandoned | Everything is static; the site keeps working for years with no maintenance |
| Someone forks it and adds ads | Nothing can prevent that; the licence at least requires them to publish their source |

## Voice

Plain language, no marketing superlatives, no exclamation marks. Say "this file cannot get
smaller" when that is the truth. The trust is the product.
