# 10 — Scope and taxonomy

## What OpenDrawer is

One open drawer for the small file and data jobs of daily life: a PDF that must be smaller, a
photo that must be a JPEG, a form that must be signed, a receipt that must be searchable, a unit
that must be converted. Every tool runs in the browser, on the device, with no account and no
upload.

Documents are the first category because that is where the need and the harm are greatest. They
are not the limit of the product. Categories are added one at a time, each with the same
constraints and the same proof.

## Categories

| Category | Examples | Status |
| --- | --- | --- |
| Documents | PDF inspect, PDF → image, merge, split, compress, sign, OCR | In progress (2 live) |
| Images | convert, compress, resize, crop, HEIC → JPG, SVG | Planned (phase 2) |
| Audio and video | convert, trim, extract audio, video → GIF | Planned (phase 2) |
| Text and data | case, counts, CSV/JSON, cleanup, diff | Planned |
| Everyday | units, dates, time zones, loan/EMI, BMI, tip split, QR codes, random strings | Planned |

Deliberately excluded, in every category: anything that needs an account, a server, a database,
telemetry, a payment path, or a third-party request. Features whose main purpose is defeating
someone else's protection (DRM, watermark removal, signature removal) are out.

## Adding a category or tool

A new capability is accepted only when all of these are true:

1. **It serves a daily task** a real person has, not a demo or a "nice to have".
2. **It runs locally.** Pure functions in `engine.ts`, no network, no storage of user content.
3. **It states its limits** in the UI before running, in plain language.
4. **It fits a category** in this table, or the table is amended in the same change.
5. **It has a fixture test**, including one malformed input, and passes the gates.
6. **It is documented** in `docs/02-tool-catalog.md`, with engine, licence and limits.

Adding a category is a product decision (AGENTS §7). Adding a tool inside an existing category
is routine work and follows §3 of `AGENTS.md`.

## Sequencing

One tool at a time, finished and verified: engine, UI, limits, tests, docs. A category is
"live" when at least one tool in it works end to end on a 360 px phone. No category ships as a
grid of "coming soon" placeholders.
