# 07 — Setup, tooling, MCP and skills

Everything needed to take this from documentation to a running site. Nothing here has been
installed yet — this is the checklist.

## 1. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 22 LTS or newer | Vite and the PDF libraries require modern ESM |
| pnpm | 9+ | Fast, strict installs; commit `pnpm-lock.yaml` |
| Git | any recent | Version control |
| A browser | Chrome/Edge + Firefox | PDF.js differs subtly between them; test both |
| Optional: `emsdk` | latest | Only if you rebuild a WASM binary yourself |

Install on a normal machine:

```bash
# macOS
brew install node@22 pnpm git
# Ubuntu/Debian
sudo apt install nodejs npm git && sudo npm i -g pnpm
# Windows (PowerShell)
winget install OpenJS.NodeJS.LTS && winget install pnpm.pnpm && winget install Git.Git
```

Verify: `node -v` (≥22), `pnpm -v` (≥9), `git --version`.

## 2. Create the repository

```bash
# after creating an empty repo on GitHub (suggested name: opendrawer)
git init
git add .
git commit -s -m "docs: product plan, tool catalogue, architecture, licence, roadmap"
git branch -M main
git remote add origin git@github.com:<you>/opendrawer.git
git push -u origin main
```

Use `git commit -s` from the first commit: the DCO sign-off is part of the contribution policy.

**Before publishing:** confirm the GitHub organisation/user name and the domain are free, and
run a trademark search for "OpenDrawer" in your jurisdiction. `AnyKit` is already a registered
US trademark, which is why it was rejected.

## 3. Scaffold the app (wave 0)

Planned commands, once you are ready to write code:

```bash
pnpm create vite opendrawer --template react-ts
cd opendrawer
pnpm add pdf-lib pdfjs-dist qpdf-run jsPDF
pnpm add -D vitest @vitest/coverage-v8 playwright @playwright/test eslint prettier
pnpm exec playwright install chromium firefox
pnpm dev
```

Then add, in this order: router, design tokens, `src/tools/registry.ts`, the shared file-flow
components, `inspect-pdf` (the simplest real tool), and the CSP `_headers` file. Do not add the
Ghostscript or Tesseract engines until their wave.

Scripts to define in `package.json`: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`,
`test:e2e`, `fixtures`.

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

1. `pnpm lint && pnpm typecheck && pnpm test` — all green, real exit codes.
2. `pnpm build && pnpm preview`, then open each tool with a fixture.
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

- Build command `pnpm build`, output `dist/`, no environment variables.
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
