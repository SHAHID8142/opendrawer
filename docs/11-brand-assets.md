# 11 — Brand assets

The mark is the supplied drawer/document logo (Adobe Illustrator export, 72 × 72). It is the
product's one symbol: an open drawer seen from the front. The wordmark is set in the system serif
already used for display type, so the site and the exported lockups share one voice.

Source of truth: `public/brand/master-logo.svg` (the original export, unchanged).

## Files

| File | What it is | Use |
| --- | --- | --- |
| `master-logo.svg` | Original export, 72 × 72 paths, no fill | Archive only; never reference it from a page |
| `mark-ink.svg` | Mark in ink `#17150F` | Default mark on paper or white |
| `mark-red.svg` | Mark in proofing red `#BF3A14` | Accent moment, favicon, app icon |
| `mark-paper.svg` | Mark in paper `#FFFDF8` | On ink or red grounds |
| `lockup-ink.svg` | Mark + wordmark, ink | Header, documents, signatures |
| `lockup-red.svg` | Mark + wordmark, red | Accent lockups, social cards |
| `lockup-paper.svg` | Mark + wordmark, paper | On ink or red grounds |
| `favicon.svg` | Red mark on transparent, 72 × 72 | Browser tab |
| `apple-touch-icon.png` | 180 × 180, paper ground | iOS home screen |
| `icon-512.png` | 512 × 512, red ground | App icon / social avatar |
| `og.png` | 1200 × 630 social card | Open Graph and Twitter/X |

## Which colour on which ground

| Ground | Mark / lockup | Contrast |
| --- | --- | --- |
| Paper `#F3EFE6` | ink | 15.9:1 |
| Surface `#FBF8F2` | ink | 17.2:1 |
| Paper `#F3EFE6` | red | 4.8:1 (graphic, passes 3:1) |
| Proofing red `#BF3A14` | paper | 5.5:1 |
| Ink `#17150F` | paper | 15.9:1 |
| Photography or a busy colour | paper lockup over a 40 % ink scrim, or do not place it | verify 3:1 |

Never place the red mark on the warning tint, the success tint or a category tint: the mark is a
logo, not body text, and those combinations fall below 3:1.

## Clear space and minimum sizes

- **Clear space:** one drawer-handle height on every side — 18 units of the 72-unit box
  (0.25 × the mark height). Nothing enters it: no type, rules, buttons or image edges.
- **Minimum mark:** 16 px (favicon), 24 px in interface.
- **Minimum lockup:** 140 px wide; below that use the mark alone.
- **Lockup spacing is fixed:** wordmark starts 20 units after the mark (92 of 372). Do not tighten
  or loosen it.

## Do not

- Rotate, skew, stretch or outline the mark.
- Recolour it outside ink, paper and proofing red.
- Add a shadow, gradient, glow or stroke.
- Put it on a photograph without a scrim.
- Rebuild the wordmark in another typeface for the site; the serif is part of the identity.
- Reference `master-logo.svg` from a page — it has no fill and renders black.

## In the site

- Header: `mark-paper.svg` inside a proofing-red tile, then the wordmark as live text
  (`--font-display`). This stays crisp and accessible at any zoom.
- `Base.astro`: favicon, Apple touch icon and Open Graph image are linked for every route.
- Social preview text is the page title and description; the card is `og.png`.

## Regenerating the PNGs

The PNGs are rendered from HTML with the site's own colours and type, at 1× for icons and
1200 × 630 for the social card. Re-run the export whenever the mark, the palette or the tagline
changes, and commit the new PNGs with the SVGs. Do not edit the PNGs by hand.
