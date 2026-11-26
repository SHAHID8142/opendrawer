---
name: custom-icon-pack
description: "Builds and maintains OpenDrawer's Google Material Symbols Rounded SVG icon pack (Apache-2.0 paths vendored locally with zero CDN requests). MANDATORY whenever creating, modifying, replacing, or auditing any tool, category, status, or navigation icon."
---

# Custom Icon Pack Builder (OpenDrawer)

Use this skill for **every** icon task — new tool cards, new file-system categories, privacy/value cards, or UI affordances. Never hand-draw thick amateur wireframes or cram `<text>` elements inside SVGs.

## 1. Visual Standard — Google Material Symbols Rounded (`wght 300`)

OpenDrawer uses **Google Material Symbols Rounded** (`@material-symbols/svg-300`, **Apache-2.0**), identical to Google Workspace, Google Drive, and Gemini:

1. **Optical Weight & Canvas:**
   - Source paths from Material Symbols Rounded **weight `300`** (`viewBox="0 -960 960 960"`, `fill="currentColor"`).
   - Weight `300` keeps lines crisp, light, and refined when rendered at `28px–32px` on cards instead of chunky `40px` bold strokes.
2. **Sizing & Placement:**
   - `.glyph--sm` (`16px`), `.glyph--md` (`24px`), `.glyph--lg` (`32px`).
   - **Never** wrap icons inside background boxes/squircles inside `.tool-card` or `.value-card` (`glyph--contained` is forbidden inside cards).
   - **Never** load icons from Google Fonts CDN or add runtime icon libraries without updating `docs/04-licensing.md` (vendor exact SVG path `d` strings locally into `src/lib/glyph-paths.ts`).
3. **Metaphor Selection (Jakob's Law):**
   - Pick the exact canonical Material Symbol for the user's job (`document_search`, `photo_library`, `picture_as_pdf`, `difference`, `insert_page_break`, `rotate_90_degrees_cw`, `delete_sweep`, `description`, `image`, `graphic_eq`, `data_object`, `grid_view`, `laptop_mac`, `verified_user`, `favorite`, `public`, `tune`, `wifi_off`).

## 2. Where Icons Live

| File | Responsibility |
| --- | --- |
| `src/lib/glyph-paths.ts` | Official Material Symbols Rounded (`wght 300`) `d` path strings keyed by `GlyphKind` |
| `src/components/ToolGlyph.astro` | Shared `<svg viewBox="0 -960 960 960" fill="currentColor">` wrapper + automatic category fallback |
| `src/styles/ui/glyph.css` | Optical sizes (`sm`, `md`, `lg`) and service ink tokens |

## 3. Workflow for Adding Icons for a New Tool or Category

1. **Fetch official SVGs locally to `/tmp`** (never touch `package.json` unless asked):
   ```bash
   mkdir -p /tmp/ms-icons && cd /tmp/ms-icons && npm pack @material-symbols/svg-300 --silent
   tar -xzf material-symbols-svg-300-*.tgz
   ```
2. **Choose the clearest rounded symbol** in `package/rounded/<name>.svg` (non-fill light/regular stroke geometry).
3. **Extract `<path d="...">`** into `src/lib/glyph-paths.ts` and register the key in `GlyphKind`.
4. **Validate mechanically:**
   ```bash
   node .agents/skills/custom-icon-pack/scripts/validate-icons.mjs && npm run gate:tokens && npm run check
   ```
5. **Visual inspection:** Capture `1280px` desktop and `360px` mobile screenshots and inspect rendered clarity.
