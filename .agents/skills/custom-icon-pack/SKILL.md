---
name: custom-icon-pack
description: "Builds and maintains OpenDrawer's crisp ChatGPT-style Lucide (ISC) SVG icon pack (with Google Material Symbols Rounded wght-300 backed up on git tag backup/google-material-icons). MANDATORY whenever creating, modifying, replacing, or auditing any tool, category, status, or navigation icon."
---

# Custom Icon Pack Builder (OpenDrawer)

Use this skill for **every** icon task — new tool cards, new file-system categories, privacy/value cards, or UI affordances. Never hand-draw thick amateur wireframes or cram `<text>` elements inside SVGs.

## 1. Visual Standard — ChatGPT-Style Crisp Monoline (`Lucide v1.81.0`, ISC)

OpenDrawer uses **Lucide (`lucide-static` v1.81.0, ISC)** — identical to ChatGPT, Vercel, and Linear — with an official **Google Material Symbols Rounded (`wght 300`, Apache-2.0)** backup preserved on git tag `backup/google-material-icons`.

1. **Optical Weight & Canvas:**
   - `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.65"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
   - `1.65px` stroke keeps lines surgical, balanced, and refined at `28px–32px` instead of bulky `3px+` strokes.
2. **Sizing & Placement:**
   - `.glyph--sm` (`16px`), `.glyph--md` (`24px`), `.glyph--lg` (`32px`).
   - **Never** wrap icons inside background boxes/squircles inside `.tool-card` or `.value-card` (`glyph--contained` is forbidden inside cards).
   - **Never** load icons from external CDNs or add runtime icon dependencies without updating `docs/04-licensing.md` (vendor exact SVG inner markup locally into `src/lib/glyph-paths.ts`).

## 2. Where Icons Live

| File | Responsibility |
| --- | --- |
| `src/lib/glyph-paths.ts` | Vendored Lucide `24x24` SVG inner elements keyed by `GlyphKind` |
| `src/components/ToolGlyph.astro` | Shared `1.65px` rounded stroke `<svg>` wrapper + automatic category fallback |
| `src/styles/ui/glyph.css` | Optical sizes (`sm`, `md`, `lg`) and service ink tokens |

## 3. Workflow for Adding Icons for a New Tool or Category

1. **Fetch official SVGs locally to `/tmp`** (never modify `package.json` unless asked):
   ```bash
   mkdir -p /tmp/lucide-icons && cd /tmp/lucide-icons && npm pack lucide-static --silent
   tar -xzf lucide-static-*.tgz
   ```
2. **Pick the cleanest semantic match** in `package/icons/<name>.svg`.
3. **Extract its inner `<path>`/`<circle>`/`<rect>` markup** into `src/lib/glyph-paths.ts` and register the key in `GlyphKind`.
4. **Validate mechanically:**
   ```bash
   node .agents/skills/custom-icon-pack/scripts/validate-icons.mjs && npm run gate:tokens && npm run check
   ```
5. **Switching presets (if needed):** Restore the Google Material Symbols Rounded (`wght 300`) pack anytime from `git checkout backup/google-material-icons -- src/lib/glyph-paths.ts src/components/ToolGlyph.astro`.
