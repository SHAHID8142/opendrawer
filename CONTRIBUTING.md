# Contributing to OpenDrawer

Thank you. This project only stays useful if it stays trustworthy, so the bar is partly about
code quality and partly about honesty.

## Before you start

- Read `AGENTS.md` — the hard rules apply to humans too.
- Read `docs/02-tool-catalog.md` to see whether your tool is already planned.
- For anything larger than a bug fix, open an issue first and describe: the user problem, the
  engine you intend to use, its licence, and what the tool **cannot** do.

## Adding a tool (the short version)

1. Pick an ID from `docs/02-tool-catalog.md` (IDs are permanent URLs — never rename one).
2. Create `src/tools/<id>/` with `meta.ts`, `Tool.tsx`, `engine.ts`, and `limits.ts`.
3. If the engine can block the main thread for more than ~50 ms, put it in `worker.ts`.
4. Lazy-load the engine with `await import()` inside the tool, never at module top level.
5. Register it in `src/tools/registry.ts`.
6. Add fixtures under `src/tools/<id>/__fixtures__/` — one normal file, one edge case
   (empty page, rotated page, non-Latin text), one broken file.
7. Write the limits text the user will see. Be specific: "Files over 200 MB may fail on phones
   with 4 GB of RAM" is useful; "large files may not work" is not.
8. Update `docs/02-tool-catalog.md` if reality differs from the plan.

## Pull request checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass.
- [ ] New tool has an entry in the registry and in the tool catalogue doc.
- [ ] No new dependency without a licence entry in `docs/04-licensing.md`.
- [ ] No network request introduced (checked in the browser Network tab while running the tool).
- [ ] Tested at 360 px width and with keyboard only.
- [ ] Output file opens correctly in Chrome's and Firefox's built-in PDF viewers.
- [ ] Failure paths show a human, specific message.
- [ ] New source files carry the `SPDX-License-Identifier: AGPL-3.0-or-later` header.
- [ ] No tracking, no analytics, no third-party fonts or CDNs.

## Reporting a bug

Include: browser and version, device and rough RAM if mobile, the tool, the file's size and page
count, what you expected, what happened. **Do not attach the real document.** Reproduce with a
dummy file, or strip it first — we cannot receive sensitive documents, by design.

If a tool produces a broken or corrupt output, say so loudly: that is treated as a security-
adjacent bug, not a cosmetic one.

## Security

Anything that could make a user's file leak, be silently altered, or be falsely presented as
secure (for example a redaction that leaves text extractable) should be reported privately to
the maintainer rather than in a public issue. Include a minimal reproduction.

## Commit style

Conventional commits, e.g. `feat(compress): target-size mode for upload limits`,
`fix(redact): rasterise page instead of overlaying a rectangle`.
