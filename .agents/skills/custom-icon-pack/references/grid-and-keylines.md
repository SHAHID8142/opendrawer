# Grid, Keylines & SVG Recipes (`24x24` ViewBox)

All OpenDrawer icons share `viewBox="0 0 24 24"`, `stroke-width="1.85"`, `stroke-linecap="round"`,
and `stroke-linejoin="round"`.

## Optical Bounds

- **Safe area:** `x: 2..22`, `y: 2..22` (2px optical breathing margin around all edges).
- **Large circle:** `cx="12" cy="12" r="8.5"` to `r="9"`.
- **Square / squircle:** `16x16` to `18x18` with `rx="2.5"` to `rx="3"`.
- **Portrait document:** `width="14"`–`15"`, `height="18"`–`19"`, dog-ear fold `4px`–`4.5px`.
- **Landscape media card:** `width="13"`–`18"`, `height="11"`–`15"`, `rx="2.5"`.

## Reusable Geometry Primitives

### 1. Standard Folded Document Shell (Centered)

```svg
<path d="M7 2.5h7l5.5 5.5v11.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.16" />
<path d="M14 2.5V6a2 2 0 0 0 2 2h3.5" />
```

### 2. Document Shell Offset Left (Leaves Room for Bottom-Right Badge)

```svg
<path d="M5.5 2.5h7L17 7v11.5a2 2 0 0 1-2 2h-9.5a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.15" />
<path d="M12.5 2.5V6a1 1 0 0 0 1 1H17" />
```

### 3. SF-Style Circular Action Badge at `(16.8, 16.8)`

Outer `var(--color-surface)` halo prevents document lines bleeding behind the badge:

```svg
<circle cx="16.8" cy="16.8" r="5.2" fill="var(--color-surface)" stroke="none" />
<circle cx="16.8" cy="16.8" r="4.2" fill="currentColor" stroke="none" />
<!-- Inner mark in var(--color-surface) -->
<path d="m15.3 15.3 3 3m0-3-3 3" stroke="var(--color-surface)" stroke-width="1.8" />
```

### 4. Landscape Photo Frame

```svg
<rect x="8.5" y="9.5" width="13" height="11.5" rx="2.5" fill="var(--color-surface)" stroke="none" />
<rect x="8.5" y="9.5" width="13" height="11.5" rx="2.5" fill="currentColor" fill-opacity="0.16" />
<circle cx="12.2" cy="13.2" r="1.2" fill="currentColor" stroke="none" />
<path d="m9.4 19.6 3.1-3.1a.9.9 0 0 1 1.3 0l1.5 1.5 1.8-1.9a.9.9 0 0 1 1.3 0l2.2 2.4" />
```
