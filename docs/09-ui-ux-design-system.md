# 09 — UI/UX design system and review protocol

The interface rules for OpenDrawer, plus the process that keeps them true. Every rule here is
either **measurable** (a tool can fail it) or **explicitly labelled as judgement** — never dressed
up as a law.

> Status: proposed for phase 1. It is a design contract, not a description of shipped UI.

---

## 1. What this borrows, and from where

Two inputs:

**The SUS skill (`SHAHID8142/shahid-ui-ux-skill`)** — reviewed on 2026-11-21. What transfers well:

- *No templates.* The agent argues a design decision with evidence instead of copying a trend.
- *Tokens are the only styling surface; raw values fail CI.*
- *One section at a time, explicit approval, evidence bundle per change.*
- *Four verdicts only:* `pass` · `fail` · `not-run` · `not-applicable`, and `not-run` is never
  reported as `pass`.
- *Motion is first-class*: trigger → target, duration token, reduced-motion equivalent.
- *Gates must be executable.* A rule with no command and no negative fixture is a wish.

What does **not** transfer: its Live Studio (browser drawing overlay) and its section state
machine are for an agent building arbitrary client sites. OpenDrawer is one product with its own
design language; we take the discipline, not the machinery.

Honest note: the skill is currently **not installable** — `main` contains planning documents only,
no `SKILL.md` (issue #33), no licence (#34), and its gate registry is prose (#35). We therefore
apply its *principles* manually and treat it as an advisory reviewer, not a dependency.

**Standards and research**, cited so they can be checked:

- WCAG 2.2 AA — the accessibility floor. All rules below that touch accessibility come from here,
  not from a "UX law" list.
- Nielsen's 10 usability heuristics (1994, revised 2024) — the expert-review checklist.
- Primary research where it exists: Fitts (1954) for target acquisition; Hick–Hyman (1952) for
  choice reaction time; Miller (1956) with Cowan (2001) for working-memory limits; Gestalt
  grouping literature for perception.
- Card, Moran & Newell (1983) for the keystroke-level model, and Nielsen's response-time limits
  (0.1 s / 1 s / 10 s) for latency budgets.

---

## 2. The ten principles, each with an operational rule

| # | Principle | What it means here | Enforceable as |
| --- | --- | --- | --- |
| 1 | **The file is the hero** | The drop zone is the largest interactive target on every tool page, above the fold, keyboard-focusable, and works with paste and drag. | Layout test at 360 px |
| 2 | **One primary action per screen** | Each tool page has exactly one filled button; everything else is secondary or a link. | Component lint (count of `variant="primary"`) |
| 3 | **State is always visible** | Every tool shows: idle → selected → working → done → failed. No silent waiting, no spinner without progress after 2 s. | Story/route walkthrough |
| 4 | **Honest limits, before the attempt** | The `LimitsNote` renders above the action, not after failure. | Snapshot test per tool |
| 5 | **Privacy you can check** | A persistent "no upload" statement with a "how to verify" disclosure on every tool. | Content test |
| 6 | **Mobile-first, low-bandwidth** | Design at 360 px first; the app must be usable on 3G with images blocked. | Viewport + throttling run |
| 7 | **Plain words** | Grade-8 reading level; no "seamless", "powerful", "revolutionary"; no exclamation marks. | Copy lint (banned-word list) |
| 8 | **Nothing moves without reason** | Motion explains a state change; it never decorates. | Motion review + reduced-motion pass |
| 9 | **Recoverable** | Every destructive action is confirmable and reversible, or it writes a new file instead of replacing one. | Interaction checklist |
| 10 | **Accessible by default** | WCAG 2.2 AA is the floor, keyboard parity is mandatory, and the file flow works with a screen reader. | axe + manual AT pass |

---

## 3. The named "laws": use them, don't worship them

These are widely repeated as laws. Three of them are routinely misapplied, and the
misapplication would actively harm this product. Use the corrected form.

| Principle | Sound version | The version to reject |
| --- | --- | --- |
| **Fitts's Law** | Acquisition time grows with distance and shrinks with target size. Make frequent actions big and close (thumb zone at 360 px). | "Everything must be huge." Density still matters on data-heavy screens. |
| **Hick–Hyman** | Reaction time rises with the *logarithm* of equally likely choices. Group and prioritise options. | "Never show more than 5 options." Familiar, well-labelled choices can be faster than a hidden one. |
| **Miller / working memory** | Working memory holds ~4±1 chunks (Cowan 2001), not "7 menu items". Chunk *information*, don't cap *menus*. | "Max 7 items per menu" — a myth that contradicts Miller's own caveat. |
| **Jakob's Law** | Users expect your site to work like the others they know. Keep the file-drop, the download button and the back navigation conventional. | "Copy every competitor." Deliberate, testable differentiation is allowed. |
| **Gestalt proximity / similarity / common region / continuity** | Group by whitespace and shared containers before adding borders. Alignment creates continuity. | "DOM nesting equals user perception." Proximity in code proves nothing; check the rendered result and the accessibility tree. |
| **Von Restorff (isolation)** | One visually distinct element is remembered. Reserve it for the primary action or a critical warning. | Highlighting three competing CTAs, which cancels the effect. |
| **Serial position** | First and last items in a list are remembered best — put the key action first or last, not in the middle. | Reordering content for no user reason. |
| **Doherty threshold / latency** | 0.1 s feels instant, 1 s keeps flow, 10 s loses attention. Below 1 s, show nothing; above, show determinate progress. | Quoting "400 ms" as a law; it is a guideline, and network conditions dominate here. |
| **Peak–end rule** | The last moment (a clean download + a clear "done, here is your file") shapes the memory of the task. | Applying it as a justification for confetti or celebration screens. |
| **Aesthetic–usability effect** | Attractive interfaces are *perceived* as more usable. | "Beautiful means usable." It is a bias and it hides real defects — never a substitute for testing. |
| **Choice overload** | Too many comparable options can paralyse. | "Fewer is always better." For expert users, more visible options can be faster. |

**House rule:** a design decision may cite a principle, but it must also state what would show the
decision was wrong. If nothing could, it is taste, and it goes in the review notes, not the spec.

---

## 4. Design tokens

One source of truth, `src/app/tokens.css`, emitted as CSS custom properties. Components may **only**
use tokens; a raw hex, px font-size or ms duration in a component fails the lint gate.

**Spacing** — 4 px base: `0, 4, 8, 12, 16, 24, 32, 48, 64` (`--space-1…--space-9`).

**Type** — system font stack (no web fonts: they cost bandwidth and leak requests):

| Token | Size / line-height | Use |
| --- | --- | --- |
| `--text-xs` | 12 / 16 | metadata, file size |
| `--text-sm` | 14 / 20 | labels, secondary |
| `--text-base` | 16 / 24 | body — **never smaller on mobile**, prevents iOS zoom-on-focus |
| `--text-lg` | 18 / 28 | lead paragraph |
| `--text-xl` | 22 / 30 | section heading |
| `--text-2xl` | 28 / 36 | page title |
| `--text-3xl` | 36 / 44 | home hero only |

**Colour** — three layers: neutral surfaces, one accent, semantic states. All pairs verified:

- Body text on background ≥ **7:1** (AAA, cheap to do on a document tool).
- Secondary text ≥ **4.5:1**; large text ≥ **3:1**; UI borders and focus rings ≥ **3:1**.
- Accent is used for the primary action and focus only; it is never the only signal of state.
- Semantic: success, warning, danger — each with an icon and a word, never colour alone.
- Dark mode is a token swap, not a second stylesheet, and both themes are contrast-tested.

**Radius** `4 / 8 / 12 / full`; **elevation** two levels maximum (flat by default — shadows cost
render time on low-end phones); **borders** 1 px, `--border-subtle`.

---

## 5. Layout and the mobile reality

- Design at **360 × 740** first; it must work at 320 px (WCAG 1.4.10 reflow) with no horizontal
  scroll, and at 400 % zoom.
- **44 × 44 px** minimum touch targets (above the WCAG 2.2 AA floor of 24 × 24 in SC 2.5.8).
- Primary actions in the lower third (thumb reach); destructive actions never adjacent to the
  primary one.
- The file list, progress and result panel are single-column below 640 px; two columns only for
  tool cards at ≥ 768 px.
- Never rely on hover. Every hover affordance has a focus and a touch equivalent.
- The app must be usable with images disabled and with JavaScript-heavy engines still loading.

---

## 6. Components and their required states

Each component ships with all states; a component without a `focus-visible` style is incomplete.

| Component | States that must exist |
| --- | --- |
| `FileDrop` | idle, drag-over, focus, selected, disabled, error (wrong type), too-large |
| `ToolCard` | default, hover, focus, visited, unavailable |
| `Button` | primary / secondary / danger × default, hover, focus-visible, active, disabled, loading |
| `Progress` | indeterminate (< 1 s unknown), determinate with percentage, stalled, cancelled |
| `LimitsNote` | info, warning, blocking-with-reason |
| `ResultPanel` | success with before/after size, no-improvement ("cannot get smaller"), failure with cause and retry |
| `Dialog` | confirm destructive action, focus trap, Escape to close, focus returned to trigger |
| `Toast` | polite, assertive, dismissible, auto-expire ≥ 6 s |

Rules: labels are always visible (placeholders are not labels); errors appear next to the field and
in a live region; the download control names the output file and its size.

---

## 7. Motion contract

| Purpose | Duration | Easing |
| --- | --- | --- |
| Micro-feedback (press, check) | 100–120 ms | ease-out |
| Enter/exit of panels | 180–220 ms | ease-out / ease-in |
| Progress and layout transitions | 240–300 ms | standard |

- No parallax, no decorative loops, no animation longer than 300 ms without user control.
- `prefers-reduced-motion: reduce` removes transforms and reduces fades to a 1-frame change.
- Nothing animates on page load except the first paint.
- Every animation has an interruption path (the user can act mid-animation) and never blocks input.

---

## 8. Accessibility floor (WCAG 2.2 AA), mapped to tests

| Criterion | How it is checked |
| --- | --- |
| 1.4.3 / 1.4.11 contrast | Token contrast test in CI + axe |
| 1.4.10 reflow | Playwright at 320 px and 400 % zoom |
| 2.1.1 keyboard | Full file flow with keyboard only, no pointer |
| 2.4.7 / 2.4.11 focus visible, not obscured | Visual review + computed-style assertion |
| 2.5.8 target size (min) | Measured bounding boxes ≥ 44 px |
| 3.3.1 / 3.3.3 error identification | Every failure string names the cause and the next step |
| 4.1.2 / 4.1.3 name, role, value; status messages | axe + `aria-live` assertions on progress and results |
| 1.3.1 info and relationships | Heading order and landmarks per page |

Manual pass per release: one screen reader (NVDA or VoiceOver), one real phone, keyboard only.
Automated tools catch roughly a third of issues; the report must not imply otherwise.

---

## 9. Gates (executable, with negative fixtures)

| Gate | Check | Fails on |
| --- | --- | --- |
| UI-G1 | token lint over `src/**` | a raw hex/px/ms outside `tokens.css` |
| UI-G2 | contrast computation from tokens, both themes | any pair below its threshold |
| UI-G3 | axe on every route | serious or critical violations |
| UI-G4 | viewport matrix 320 / 360 / 768 / 1280 | horizontal scroll or clipped action |
| UI-G5 | target-size measurement | any interactive box under 44 px |
| UI-G6 | copy lint | banned word, exclamation mark, grade level > 9 |
| UI-G7 | reduced-motion pass | a transition surviving `reduce` |
| UI-G8 | "no upload" assertion in Playwright | any request leaving the origin during a tool run |

Each gate needs a deliberately bad fixture proving it can fail — otherwise it is a wish, exactly
as the SUS gate registry argues.

---

## 10. Review loop for every screen

1. Sketch in text: purpose, primary action, states, limits, empty/error copy.
2. Build with tokens and existing components only.
3. Run the gates; fix causes, never suppress.
4. Review at 360 px with throttled network and reduced motion on.
5. Record what changed and what was **not** checked in the evidence line of the PR.
6. Only then build the next screen.

---

## 11. Tooling

Already configured in `mcp.example.json`: **Playwright MCP** (viewport matrix, keyboard walks,
screenshots, the no-network assertion), **Chrome DevTools MCP** (performance and memory on the heavy
tools), **context7** (current docs). Add at scaffold time as dev dependencies, not MCP servers:
`@axe-core/playwright`, `lighthouse`, `stylelint`, `@playwright/test`. Optional, only if you design
in Figma: Figma's Dev Mode MCP (local, `http://127.0.0.1:3845/mcp`) for token and component parity.

**Anti-patterns for this product:** stock-photo hero sections; three competing CTAs; icon-only
toolbars without labels; toasts that auto-dismiss before being read; progress bars that lie;
"premium" upsell modals; cookie banners (there are no cookies); animated gradients; a dark pattern
of any kind — this product's entire differentiation is that it does not manipulate the user.
