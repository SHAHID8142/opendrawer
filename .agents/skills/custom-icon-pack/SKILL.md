---
name: custom-icon-pack
description: "Builds and maintains OpenDrawer's bespoke Hierarchical Duotone SVG icon pack (Apple SF Symbols / Google Material / Gemini craft). MANDATORY whenever creating, modifying, replacing, or auditing any tool, category, status, or navigation icon in the codebase."
---

# Custom Icon Pack Builder (OpenDrawer)

Use this skill for **every** icon task — new tool cards, new file-system categories, privacy/value cards, or UI affordances. Never ship improvised single-stroke wireframes or `<text>` labels crammed inside 24x24 SVGs.

## 1. Visual Standard — Hierarchical Duotone Pack

OpenDrawer's icons synthesize **Apple SF Symbols** (hierarchical opacity depth + pill/circle badge knockouts), **Google Material Symbols** (24x24 optical keylines + rounded geometry), and **ChatGPT / Gemini** sculptural clarity:

1. **Strict `24x24` grid with `2px` optical margin** (`20x20` active drawing zone).
   - Circles: `r <= 9.5` (20px visual diameter).
   - Rounded rectangles/cards: `2px–2.5px` corner radius (`rx="2.5"`).
   - Portrait document shell: `x=4..18`, `y=2.5..21.5`, smooth `2px` bottom/left corners and clean dog-ear fold (`3.5–4.5px` bevel).
2. **Two-Layer Hierarchical Duotone Depth (always `currentColor`)**:
   - **Layer 1 (Depth body):** `fill="currentColor" fill-opacity="0.16"` (or `0.12`–`0.22`) on the primary subject shape (document sheet, photo frame, shield, monitor, heart) so the icon carries physical weight without wrapping it in a card box.
   - **Layer 2 (Crisp outline & focal solids):** `stroke="currentColor" stroke-width="1.85"`, `stroke-linecap="round"`, `stroke-linejoin="round"` on structural contours; solid `fill="currentColor" stroke="none"` for small focal markers (badge circles, sun dots, active indicator tiles).
3. **SF Symbols Badge Cutouts (`var(--color-surface)`)**:
   - When an overlapping lens, foreground card, or action badge sits over a document, place a `fill="var(--color-surface)" stroke="none"` halo/backing (`~1px` wider than the foreground object) underneath it so lines never bleed through.
   - Inside solid circular action badges (e.g. `delete-pages`), draw the inner mark with `stroke="var(--color-surface)"`.
4. **Hard Bans**:
   - **NO `<text>` tags** inside `24x24` icons (font rendering varies across OSes and blurs at 16–32px). Express PDF/image/code identity with pure geometric shapes.
   - **NO outer container boxes inside cards** (icons inside `.tool-card` and `.value-card` must stay bare).
   - **NO raw color literals, pixel font sizes, or external CDN icon URLs** (`UI-G1` & `AGENTS.md` §1). Use `currentColor` and `var(--color-surface)` only.

## 2. Where Icons Live

| File | Responsibility |
| --- | --- |
| `src/lib/glyph-paths.ts` | Pure SVG inner path strings keyed by `GlyphKind` |
| `src/components/ToolGlyph.astro` | Shared `<svg viewBox="0 0 24 24">` wrapper + automatic category fallback |
| `src/styles/ui/glyph.css` | Optical sizes (`sm`, `md`, `lg`) and service ink tokens |

See [references/grid-and-keylines.md](references/grid-and-keylines.md) for reusable SVG geometry recipes before drawing a new icon.

## 3. Workflow for Adding or Updating Icons

1. **Read the spec:** Load [references/grid-and-keylines.md](references/grid-and-keylines.md) and check the tool/category metadata in `src/lib/tools.ts`.
2. **Pick an unmistakable metaphor (Jakob's Law):** Choose the universally expected silhouette (folded page + magnifier for inspect, page -> photo for export, twin stacked pages + plus for merge, separated duotone halves for split, page + clockwise arc for rotate, page + solid circle `x` badge for delete).
3. **Author into `src/lib/glyph-paths.ts`:** Add or update the `GlyphKind` entry using the two-layer duotone rules and keyline coordinates. Keep lines concise and well-formatted.
4. **Validate mechanically:** Run the bundled validator and project gates:
   ```bash
   node .agents/skills/custom-icon-pack/scripts/validate-icons.mjs && npm run gate:tokens && npm run check
   ```
5. **Visual inspection:** Render on both `1280px` desktop and `360px` mobile and inspect the actual screenshots for stroke balance, alignment, and contrast.
