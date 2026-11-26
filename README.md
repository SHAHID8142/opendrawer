# OpenDrawer

**One open drawer. Every document tool you need. Free forever, nothing uploaded.**

OpenDrawer is a free, open-source web app for the portable-document jobs people face every day:
compress a PDF so a job portal accepts it, merge a bundle of receipts, fix a sideways scan,
sign a form, make a scan searchable, turn photos into one document.

Every tool runs **inside the visitor's browser**. Files are never uploaded, there is no account,
no advertising, no payment, no file-size limit and no daily cap. Turn off the internet after the
page loads and it keeps working.

> Status: **documentation and tooling only.** No application code has been written yet.
> This repository currently contains the product plan, the full tool catalogue, the architecture,
> the licensing decision, the honest limitations page copy, the roadmap, and the developer /
> AI-agent setup pack (MCP config, project skill, AGENTS.md).

---

## Why this exists

The popular "free PDF" sites upload your passport scan, ID card, bank statement or medical
letter to a server you know nothing about, then meter you, watermark the output, or push a
subscription. That is a strange default for what is fundamentally a local file transformation.

Modern browsers can do this work locally. The engines are open source, mature and small enough
to load on demand. So the honest version is possible: **the file never moves.**

Two consequences follow, and both are promised on every page of the site:

1. **Privacy is structural, not a policy.** There is no server to leak from. Anyone can verify
   it by opening the browser's network tab, or by switching off Wi-Fi.
2. **There is nothing to pay for.** Static hosting is free; there is no compute bill, no storage
   bill, no user database, no analytics bill.

---

## The promise, in six lines

| Promise | How it is guaranteed |
| --- | --- |
| Files never leave the device | No upload endpoint exists; CSP blocks outbound requests |
| No account, no sign-in | There is no user model and no database |
| No ads, no tracking, no cookies | No third-party scripts; CSP `default-src 'self'` |
| No file-size limit | No server quota; only the browser's own memory |
| No watermark, no "premium" | There is no payment code path in the repository |
| Open source, self-hostable | AGPL-3.0; anyone can clone and deploy it |

---

## What is in this repository today

```
README.md                       you are here
LICENSE                         full AGPL-3.0 text
LICENSE-NOTICE.md               licence decision, in plain language
AGENTS.md                       hard rules for any AI coding agent working in this repo
CONTRIBUTING.md                 how to add a tool, PR checklist
THIRD-PARTY-NOTICES.md          every dependency, its licence and its obligations
mcp.example.json                MCP server template for AI-assisted development
skills/pdf-tools/SKILL.md       project skill teaching the "one tool = one folder" pattern
.agents/skills/                 Addy Osmani's Agent Skills (MIT), the workflow framework (§0 of AGENTS.md)

docs/01-product-plan.md         vision, users, principles, non-goals, success criteria
docs/02-tool-catalog.md         every planned tool, its engine, licence and known limits
docs/03-architecture.md         stack, module layout, workers, WASM budgets, hosting, security
docs/04-licensing.md            why AGPL-3.0, dependency licence table, obligations
docs/05-limitations.md          the user-facing honesty copy (and why each limit exists)
docs/06-roadmap.md              three delivery waves with acceptance criteria
docs/07-setup-and-tooling.md    developer setup, MCP + skills installation, verification
docs/08-phase1-build-plan.md    ordered build tasks for phase 1, with proof of done
docs/09-ui-ux-design-system.md  principles, laws (corrected), tokens, components, a11y gates
```

Read in this order: `01-product-plan` → `02-tool-catalog` → `03-architecture` →
`04-licensing` → `06-roadmap` → `08-phase1-build-plan` → `07-setup-and-tooling`.

**Building?** Start with `08-phase1-build-plan.md`. It lists the scaffold files in order, the
first tool to build (`inspect-pdf`), and the wave-1 sequence. `AGENTS.md` is binding, and
`09-ui-ux-design-system.md` defines the interface rules (tokens only, WCAG 2.2 AA floor, motion
contract, eight executable UI gates).

---

## The one-minute version of the product

Around forty tools in five groups:

- **Create** — blank-page builder, photos → PDF, text/Markdown → PDF, scan → PDF
- **Organise** — merge, split, extract, delete, reorder, rotate, crop, resize, booklet
- **Edit** — click-to-edit text, add text/image/shape, highlight, draw, whiteout, sign, fill forms
- **Convert** — PDF ↔ images, PDF → text / Markdown / HTML / Word (approximate)
- **Optimise & secure** — compress (with a "must be under X KB" target), protect, unlock (known
  password), true redaction, sanitise, repair, compare, inspect, watermark, page numbers,
  Bates numbering, OCR

Plus, in a later phase: image/audio/video utilities and everyday calculators, so the same site
covers the small non-document jobs too.

---

## Technology, in one paragraph

React + TypeScript + Vite, built to static files, deployed on a CDN with no server component.
pdf-lib handles document structure, PDF.js handles rendering and text extraction, qpdf compiled
to WebAssembly handles encryption, repair and lossless optimisation, Tesseract.js handles OCR,
and Ghostscript (WebAssembly) handles strong compression. Heavy work runs in Web Workers. Each
engine is downloaded only when its tool is first opened.

---

## Licence

**AGPL-3.0-or-later.** Free to use, study, share and modify; if you run a modified version as a
network service you must publish your changes. This keeps the project open for the people who
need it. See `docs/04-licensing.md`.

---

## Contributing

Read `CONTRIBUTING.md`. Adding a tool means adding one folder: it must declare its engine, its
limitations, and a fixture file to test against. The definition of done includes "the browser
makes zero network requests while the tool runs".

---

## Name check

`OpenDrawer` was chosen after a quick availability check (AnyKit, EveryTool, PaperPilot,
Docsmith and openDesk are all taken). **Before the first public release, confirm the GitHub
organisation name, the domain, and run a proper trademark check** in your own jurisdiction.
This document does not constitute legal clearance.
