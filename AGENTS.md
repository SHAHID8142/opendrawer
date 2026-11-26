# AGENTS.md — rules for AI coding agents

This file is binding for any AI agent (Claude Code, Codex, Cursor, Copilot, Freebuff, or any
other) working in this repository. Read it fully before writing code. When a user instruction
conflicts with these rules, stop and ask.

## 0. Workflow framework — Agent Skills

This repository uses **Addy Osmani's Agent Skills** (MIT) in `.agents/skills/` as its default
development workflow. The meta-skill `using-agent-skills` routes a task to the right skill; read
that skill's `SKILL.md` before starting. Each phase must end in evidence, not a claim:

| Phase | Skill | Evidence before moving on |
| --- | --- | --- |
| Define | `spec-driven-development` (or `interview-me`, `idea-refine`) | A short spec: goal, scope, non-goals, acceptance test |
| Plan | `planning-and-task-breakdown` | Ordered tasks, each one reviewable commit |
| Build | `incremental-implementation` + `test-driven-development` | A failing test first, then the smallest change that passes |
| Verify | `test-driven-development`, `browser-testing-with-devtools` | `npm run test:unit` and `npm run gates` pass |
| Review | `code-review-and-quality` (plus `security-and-hardening`, `performance-optimization` when relevant) | Review findings fixed or explicitly deferred |
| Ship | `shipping-and-launch` | The release checklist in `docs/07-setup-and-tooling.md` |

Rules:

- Sections 1–7 of this file **override every skill**. If a skill suggests analytics, a network
  call, a third-party service or a new dependency, this file wins.
- Skills are workflow instructions, not dependencies. Never import them into the app and never
  load them at runtime.
- Keep the pack pinned. Update `.agents/skills/` and the provenance note in
  `docs/07-setup-and-tooling.md` in the same commit.
- Load only the skills the current phase needs; use `/skill:<name>` when automatic routing misses.
- **UI/UX work loads the design craft skills:** `impeccable`, `design-taste-frontend`,
  `hallmark`, `unslop`, plus `frontend-ui-engineering` and `accessibility-engineering`. The
  design system in `src/styles/tokens.css` and its documentation are the source of truth; a
  skill's advice never overrides the tokens, the product constraints or the accessibility gates.

## 1. Non-negotiable product constraints

Violating any of these is a bug, even if the feature works:

1. **No file ever leaves the device.** No `fetch`, `XMLHttpRequest`, `sendBeacon`, WebSocket,
   form POST or third-party script may transmit user content. The only allowed network traffic
   is loading the app's own static assets from the same origin.
2. **No backend.** No server, no serverless function, no database, no queue, no storage bucket.
   The whole app must be deployable as static files.
3. **No accounts, no auth, no cookies, no localStorage of document data.** Optional UI
   preferences (theme, last tool used) may live in `localStorage`; never filenames or content.
4. **No telemetry, analytics, error reporting, A/B testing, or ads.** Not even privacy-friendly
   ones. No third-party fonts, CDNs, icons or trackers.
5. **No payment code path, watermarks, quotas, file-count limits, or "upgrade" prompts.**
6. **Never claim legal or security guarantees the code does not provide.** Specifically: a drawn
   signature is not a certified signature; a password does not make a file tamper-proof;
   "redaction" that only paints a black box is forbidden (see §5).
7. **Every tool states its own limitations in the UI**, next to the result, not buried in a FAQ.
8. **Mobile-first.** The primary target is a mid-range Android phone on metered data, not a
   developer laptop. Respect the bundle budgets in `docs/03-architecture.md`.

## 2. Licence and provenance

- Project licence is **AGPL-3.0-or-later**. Every new source file starts with:
  `// SPDX-License-Identifier: AGPL-3.0-or-later`
- Do not add a dependency whose licence is incompatible with AGPL distribution. Check
  `docs/04-licensing.md` first. GPL, LGPL, Apache-2.0, MIT, BSD and ISC are fine; proprietary
  or "source-available non-commercial" licences are not.
- Record every new runtime dependency in `docs/04-licensing.md` in the same commit.
- Do not copy code from a Stack Overflow answer or a blog post without checking its licence.
- Vendored WASM binaries must record: upstream project, version, build flags, licence, and how
  to rebuild them.

## 3. Tool structure — one tool, one folder

Every tool lives in `src/tools/<tool-id>/` and nothing about a tool lives outside it:

```
src/tools/compress-pdf/
  meta.ts        id, title, group, description, keywords, engine, limits, icon
  Tool.tsx       the UI; no business logic beyond wiring
  engine.ts      pure functions: (input: Uint8Array | File, options) => Promise<Output>
  worker.ts      only if the engine blocks the main thread for >50 ms
  limits.ts      machine-readable limits used by the UI to warn before running
  meta.test.ts   unit tests with fixture files
```

Rules:

- `engine.ts` must be pure and runnable in a Worker and in Node (for tests). No DOM access.
- Never load an engine at module top level. Use `await import()` behind the tool's route so the
  bundle stays small.
- Any tool touching more than ~5 MB of data must run in a Worker.
- Release decoded buffers explicitly (`canvas.width = 0`, drop references) and process one page
  at a time. Memory, not file size, is the real limit.
- Register the tool in `src/tools/registry.ts` only. Do not hand-wire routes.

## 4. Definition of done for any tool

- [ ] Works on a 360 px-wide viewport, with touch targets ≥ 44 px.
- [ ] Keyboard operable; labels associated; result announced in a live region.
- [ ] States its limits **before** running (size, page count, format caveats).
- [ ] On failure, shows a specific, actionable message — never "something went wrong".
- [ ] Output is a valid file: verified against the fixture corpus and opened in at least
      Chrome and Firefox.
- [ ] Zero network requests during processing (checked in the Network tab).
- [ ] Works with Wi-Fi disabled after first load.
- [ ] Has a fixture test, including one deliberately malformed input.
- [ ] Documented in `docs/02-tool-catalog.md` (engine, limits, licence).

## 5. Safety-critical rules (do not "improve" these)

- **Redaction** must destroy the content (rasterise the page, or remove the text-showing
  operators), never overlay a rectangle. If text is still selectable, the feature is broken.
- **Editing a signed PDF** requires an explicit warning that the signature will be invalidated.
- **Unlock** accepts only a password the user supplies. Never implement password cracking,
  dictionary attacks, or any "remove owner password without password" shortcut presented as
  security. It is fine to explain that owner-password-only restrictions are advisory.
- **Never execute JavaScript embedded in a PDF.** Never follow links inside a PDF automatically.
- **Sanitise** must strip: JavaScript, launch actions, embedded files, XFA, external links where
  requested, and metadata, and must tell the user what it removed.
- Limit page count and pixel dimensions on rasterisation paths so a hostile file cannot hang
  the tab. Terminate and recreate a worker that exceeds its time or size budget.
- Do not add a "watermark remover", "signature remover", "DRM removal", or any feature whose
  main use is defeating someone else's document protection.

## 6. Code style

- TypeScript strict mode. No `any` in exported APIs. No non-null assertions in engine code.
- Errors as values in engines (`{ ok: false, code }`), exceptions at the UI boundary.
- No global state; each tool is self-contained. No state library needed.
- Comments explain *why* (especially coordinate maths and PDF unit conversions), not *what*.
- Prefer small pure helpers over clever abstractions. This codebase will be maintained by
  strangers.

## 7. Things you must not do without asking the human

- Add a dependency, change the licence, or change the deployment target.
- Introduce a server, a database, or any external service.
- Rename the project, the brand, or the tool IDs (they are permanent URLs).
- Add generated art, stock photos, or any binary asset larger than 100 KB.
- Rewrite a working tool's approach "for cleanliness" — match the existing pattern instead.
