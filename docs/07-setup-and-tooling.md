# 07 — Setup, tooling, MCP and skills

Everything needed to run, verify and extend the site. It is installed and working; this is the
reference, not a wish list.

## 1. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 20+ (22 LTS recommended) | Astro and the PDF libraries use modern ESM |
| npm | 10+ | Ships with Node; this repository uses `package.json` scripts only |
| Git | any recent | Version control |
| A browser | Chrome/Edge + Firefox | PDF.js rendering differs subtly between them |
| Playwright browsers | matching `@playwright/test` | Only for the UI gates: `npx playwright install chromium` |

```bash
node -v   # 20 or newer
npm -v
git --version
```

No global CLI is required, and there is no npm/Vitest setup in this repository.

## 2. Run it locally

```bash
git clone https://github.com/SHAHID8142/opendrawer.git
cd opendrawer
npm install
npm run dev          # http://127.0.0.1:4321
```

To verify the built site instead of the dev server:

```bash
npm run build
npm run preview -- --port 4323
```

Branches are short-lived. Commit messages are imperative (`feat:`, `fix:`, `docs:`, `design:`),
and every commit builds and passes the gates on its own.

## 3. Commands and current state

| Command | What it does |
| --- | --- |
| `npm run dev` | Astro dev server with HMR |
| `npm run build` | Static build to `dist/` |
| `npm run preview` | Serve the build |
| `npm run check` | `astro check` — TypeScript and template diagnostics |
| `npm run gate:tokens` | UI-G1: no raw colour, px font-size, ms duration or inline style |
| `npm run gate:contrast` | UI-G2: token contrast pairs (light theme) |
| `npm run gate:copy` | UI-G6: hype and placeholder copy |
| `npm run gate:size` | UI-G10: source files under 300 lines |
| `npm run test:unit` | `node:test` engine suite, no DOM |
| `npm run gates` | Token, contrast, copy, size, unit tests, build, then the Playwright UI gates |

Current routes: `/`, `/privacy`, `/tools/inspect-pdf`, `/tools/pdf-to-image`,
`/tools/images-to-pdf`, `/tools/merge-pdf`, `/tools/split-pdf`, `/tools/rotate-pdf`, `/tools/delete-pages`, `/tools/reorder-pages`, `/tools/extract-pages`, `/tools/page-numbers`, `/tools/watermark-pdf`, `/tools/crop-pdf`, `/tools/flatten-pdf`, `/tools/extract-text`, `/tools/add-image`, `/tools/ocr-pdf`, `/tools/resize-pdf`, `/tools/compress-pdf`, `/tools/protect-pdf`, `/tools/unlock-pdf`,
`/tools/repair-pdf`, `/tools/fill-forms`, `/tools/extract-images`, `/tools/n-up-pdf`, `/tools/edit-metadata`, `/tools/split-by-bookmarks`, `/tools/redact-pdf`, `/tools/booklet-pdf`, `/tools/writing-check`, `/tools/text-transform`, `/tools/text-statistics`, `/tools/text-diff`, `/tools/image-to-text`, `/tools/compress-image`. Thirty-four tools are live;
`docs/10-scope-and-taxonomy.md` defines the categories, and `AGENTS.md` §3 defines the
`src/tools/<id>/` contract for the next one.

Three rules that matter more than speed:

1. **No network during processing.** The only allowed requests are the app's own static assets.
2. **Limits before the tool runs.** They are part of the page, not a FAQ.
3. **A tool is done when the gates pass and a fresh output opens in Chrome and Firefox** — not
   when it compiles.

## 4. MCP servers (for AI-assisted development)

MCP is how an AI coding agent gets tools beyond file editing: a real browser, GitHub access,
current library documentation. It is **optional** — the project can be built without any of it.
The ready-to-use template is `mcp.example.json` at the repository root.

| Server | What it gives you | Needed? |
| --- | --- | --- |
| `playwright` | Drive a real browser: run tools, screenshot, and **verify the Network tab stays empty** — the single most valuable check in this project | Strongly recommended |
| `chrome-devtools` | Performance and memory profiling for OCR and compression | Recommended at wave 3 |
| `github` | Read issues/PRs, create releases | Useful once the repo is public |
| `context7` | Current documentation for pdf-lib / PDF.js / Tesseract.js, avoiding stale API guesses | Recommended |
| `filesystem` | Direct file read/write | Redundant if your editor already has file tools |
| `git` | History and diffs | Optional |

### Installing it in your client

1. Copy `mcp.example.json` to the filename your client reads:
   - Claude Code → `.mcp.json` in the repo root (the existing name works)
   - Cursor → `.cursor/mcp.json`
   - VS Code → `.vscode/mcp.json` (uses the key `servers` instead of `mcpServers`)
   - Claude Desktop → its own config file in the app's settings folder
2. Restart the client.
3. Approve the servers when prompted.
4. Confirm each package name still exists: `npx -y @playwright/mcp@latest --help`.
5. For GitHub, create a **fine-grained** personal access token (repo contents, issues, PRs only)
   and put it in your shell environment as `GITHUB_PERSONAL_ACCESS_TOKEN`. Never commit it;
   `.gitignore` should exclude `.env*` and any local MCP config that contains secrets.

### What MCP must never be given

Do not point any MCP server, agent, or hosted service at real user documents. The test corpus is
synthetic by design. This is a project rule, not a preference.

## 5. Project skill

`skills/pdf-tools/SKILL.md` is a skill (an instruction file an agent loads on demand). It teaches
the engine-choice table, the coordinate maths, the redaction rule, and the anti-patterns.

Install it where your client looks for skills:

```bash
# Claude Code, project-level
mkdir -p .claude/skills && cp -r skills/pdf-tools .claude/skills/
# personal, available in every project
mkdir -p ~/.claude/skills && cp -r skills/pdf-tools ~/.claude/skills/
```

Other clients: attach the file to the conversation, or paste it into the client's rules/memory
file. Keep `AGENTS.md` at the repository root regardless — most agents read it automatically.

## 6. Local verification checklist (run before every release)

1. `npm run check && npm run gates` — all green, real exit codes (includes `npm run test:unit` and `gate:ui`).
2. `npm run build && npm run preview`, then open each tool with a fixture.
3. Open DevTools → Network → **Clear**, run a tool: no request may leave the origin.
4. Set DevTools network to "Offline" after load, run the tool again: it must still work.
5. Emulate a mid-range phone (360×740, 4× CPU throttle) and repeat the three heaviest tools.
6. Open every produced file in Chrome and Firefox: no repair prompt, correct page count.
7. Redaction: extract text from the output and confirm the redacted string is absent.
8. Keyboard-only pass through the file flow; check focus order and the `aria-live` messages.
9. Lighthouse: accessibility ≥ 95, no third-party requests.
10. Confirm the CSP has no `unsafe-inline` for scripts and `connect-src 'self'`.

## 7. Deployment

Any static host works. For Cloudflare:

- Build command `npm run build`, output `dist/`, no environment variables.
- Add `_headers` with CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- SPA fallback to `index.html` for `/tools/*`.
- Cache hashed assets for a year (`immutable`); never cache `index.html`.
- Serve WASM with `Content-Type: application/wasm` and same-origin only.

Publish a preview first, verify the checklist above on the real URL, then make it public.

## 8. What still needs a human decision

- Final name, domain and GitHub organisation (trademark check required).
- Whether to use Ghostscript (AGPL, strong compression) or stay permissive with qpdf only.
- Whether public hosting is the same repository as the self-host bundle (recommended: yes, one
  codebase, the licence already covers network use).
- Language list for the first translation pass.

## 9. Agent workflow skills

The development workflow is **Addy Osmani's Agent Skills** (MIT), vendored in
`.agents/skills/`. Pi and other Agent Skills clients discover the pack from that directory; the
meta-skill `using-agent-skills` decides which skill a task needs. `AGENTS.md` §0 makes the
lifecycle binding and defines where the product rules override a skill.

Provenance (record it when updating):

| Field | Value |
| --- | --- |
| Upstream | https://github.com/addyosmani/agent-skills |
| Version | commit `e997ac5` (2026-11-23), 26 skills |
| Licence | MIT, text in `.agents/skills/agent-skills-LICENSE.txt` |
| Installed by | copying `skills/*` into `.agents/skills/` |

To update, review the diff first — the workflows change, and a new skill may assume a tool or
service this project forbids:

```bash
git clone --depth 1 https://github.com/addyosmani/agent-skills.git /tmp/agent-skills
# read /tmp/agent-skills/CHANGELOG or git log, then:
rm -rf .agents/skills
mkdir -p .agents/skills
cp -R /tmp/agent-skills/skills/. .agents/skills/
cp /tmp/agent-skills/LICENSE .agents/skills/agent-skills-LICENSE.txt
```

Commit the pack and this table together. Nothing in the app may import or load these files.

### Design craft skills (UI/UX overhaul)

Four design skills are vendored beside the workflow pack. Load them for any UI work; they are
instructions, not runtime code.

| Skill | Upstream | Version / commit | Licence |
| --- | --- | --- | --- |
| `impeccable` | https://github.com/pbakaus/impeccable | 4.11.1 | Apache-2.0 |
| `design-taste-frontend` | https://github.com/Leonxlnx/taste-skill | 2.x | MIT |
| `hallmark` | https://github.com/Nutlope/hallmark | 2.0.0 | MIT |
| `unslop` | https://github.com/heydamir/unslop | current | CC-BY-4.0 (credit kept with the skill) |
| `custom-icon-pack` | local (`.agents/skills/custom-icon-pack/`) | 1.0.0 | AGPL-3.0-or-later |

The photo/theme preview libraries (`assets/`, `references/themes/*.jpg`, `references/refs/`) are
**not** vendored: they are tens of megabytes of images with their own licences, and AGENTS §7
requires a human decision before adding binaries. The skills fetch photographs at build time when
needed; offline runs simply skip them.
