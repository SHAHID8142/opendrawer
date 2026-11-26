# 11 — Brand assets

The mark is the supplied open-drawer artwork (`Logo.svg`, 4 paths), normalized into a `72 × 72`
viewBox (`translate(3.6 8.3) scale(0.90)`) with the drawer tray shifted `+1.1` units down so the
tray-to-drawer gap stays a crisp `3.35` units from `16 px` to `512 px`.

Both the wordmark and the site use **one single sans-serif font family**
(`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`) — no
serif font pairing.

**No-container rule:** The mark is always freestanding. Never wrap it inside a red or coloured
box, tile, or badge in lockups, headers, or app icons.

Source of truth: `public/brand/master-logo.svg` (normalized 4-path geometry, no fill).

## Files

| File | What it is | Use |
| --- | --- | --- |
| `master-logo.svg` | Normalized 4-path archive source, 72 × 72, no fill | Archive only; never reference from a page |
| `mark-color.svg` | Primary freestanding 3-tone mark (`#16140f` ink, `#fffdf8` sheet, `#b83510` rules) | Header, cards, and light surfaces |
| `mark-ink.svg` | Single-ink cutout in `#16140f` (no sheet `<rect>`) | Monochrome light grounds |
| `mark-red.svg` | Single-ink cutout in `#b83510` (no sheet `<rect>`) | Monochrome vermilion accent use |
| `mark-paper.svg` | Single-ink cutout in `#fffdf8` (no sheet `<rect>`) | Dark ink or vermilion grounds |
| `lockup-color.svg` | Freestanding 3-tone mark + `#16140f` sans-serif wordmark (`372 × 72`) | Primary horizontal lockup |
| `lockup-ink.svg` | Monochrome `#16140f` mark + wordmark (`372 × 72`) | Monochrome documents, signatures |
| `lockup-red.svg` | Monochrome `#b83510` mark + wordmark (`372 × 72`) | Accent lockups |
| `lockup-paper.svg` | Monochrome `#fffdf8` mark + wordmark (`372 × 72`) | Dark ink or vermilion grounds |
| `favicon.svg` | `mark-color.svg` with dark-mode `@media` CSS (`.od-ink` -> `#f4f0e8`, `.od-rule` -> `#e05a33`) | Browser tabs in light and dark OS chrome |
| `apple-touch-icon.png` | `180 × 180` sunlit `#fcfaf6` clay ground, freestanding `mark-color.svg` at ~68% | iOS home screen |
| `icon-512.png` | `512 × 512` sunlit `#fcfaf6` clay ground, freestanding `mark-color.svg` at ~68% | App icon and social avatar |
| `og.png` | `1200 × 630` sculpted light-clay card on `#f4f0e8` ground with `#b83510` top rule | Open Graph and social previews |

## Which colour on which ground

| Ground | Mark / lockup | Contrast |
| --- | --- | --- |
| Warm clay `#f4f0e8` | `mark-color.svg` / `lockup-color.svg` / ink `#16140f` | 16.0:1 |
| Elevated clay surface `#fcfaf6` | `mark-color.svg` / `lockup-color.svg` / ink `#16140f` | 17.5:1 |
| Crisp sheet `#fffdf8` | Proofing vermilion `#b83510` rules | 5.7:1 (passes text & graphic) |
| Warm clay `#f4f0e8` | Proofing vermilion `#b83510` | 5.1:1 |
| Ink `#16140f` | Paper `#fffdf8` | 17.9:1 |
| Photography or a busy colour | `lockup-paper.svg` over a 40% ink scrim, or do not place it | verify >= 3:1 |

Never place the vermilion mark on warning, success, or category tints; those combinations fall
below 3:1 contrast.

## Clear space and minimum sizes

- **Clear space:** one drawer-handle height on every side — `18` units of the `72`-unit box
  (`0.25 ×` the mark height). Nothing enters it: no type, rules, buttons, or image edges.
- **Minimum mark:** `16 px` (`favicon.svg`), `24 px–36 px` freestanding in the interface header.
- **Minimum lockup:** `140 px` wide; below that use the mark alone.
- **Lockup spacing is fixed:** the sans-serif `OpenDrawer` wordmark starts at `x=92` (`20` units
  after the `72`-unit mark in `viewBox="0 0 372 72"`). Do not tighten or loosen it.

## Do not

- Wrap the mark in a coloured box, tile, or container in headers, lockups, or app icons.
- Rotate, skew, stretch, or outline the mark.
- Recolour it outside `#16140f`, `#fffdf8`, `#f4f0e8`, and `#b83510` (plus `#e05a33` in dark-chrome
  `favicon.svg`).
- Add a drop shadow, neon glow, or serif font pairing.
- Reference `master-logo.svg` from a page — it has no fill and renders flat black.

## In the site

- Header: freestanding `mark-color.svg` beside the `OpenDrawer` wordmark directly on the surface
  (no box container around the mark).
- `Base.astro`: `favicon.svg`, `apple-touch-icon.png`, and `og.png` are linked for every route.

## Regenerating the PNGs

Run `node scripts/build-brand.mjs` whenever `mark-color.svg`, the palette, or the OG copy changes.
The script uses Playwright Chromium (`@playwright/test`) to render `apple-touch-icon.png` (`180 × 180`),
`icon-512.png` (`512 × 512`), and `og.png` (`1200 × 630`) directly from `public/brand/mark-color.svg`.
Commit the regenerated PNGs alongside the script and SVG changes; do not edit the PNGs by hand.
