# Beacon — UI/UX Design Specification

> Elaborates on `00-product-spec.md` (the source of truth). Uses the canonical
> component names from §12 of that doc verbatim. Where this doc and the product
> spec ever disagree, the product spec wins — fix it there first.

**Status:** approved · **Date:** 2026-07-16
**Scope:** design tokens, liquid-glass recipes, monochrome dataviz, screen
designs, component specs, motion, accessibility.
**Applies skills:** `ui-ux-pro-max` (token layering + login/shell craft),
`dataviz` (monochrome charts), `liquid-glass-design`, `motion-foundations`,
`frontend-a11y`.

**Design thesis.** Beacon is *editorial black-and-white*: true black to white,
one calibrated neutral ramp, **no chromatic accent — ever**. Depth comes from
**luminance, blur, and translucency (liquid glass)**, not color. Series in charts
are told apart by **opacity, stroke style, texture, and direct labels** — never
hue. Dark theme is the default; light is a first-class equal, not an afterthought.

**One reusable primitive.** Every frosted surface (header, tiles, sidebar,
modals, popovers) is the **same `GlassPanel`** with different props — not bespoke
CSS per component. All values below are tokens; components never hardcode a blur,
duration, or hex.

---

## 1. Design tokens

CSS custom properties, dark-first. Ship as `:root` (dark default) + a
`[data-theme="light"]` override that also mirrors the OS `prefers-color-scheme`.
Theme is persisted (localStorage) and stamped on `<html data-theme>` by an inline
head script **before paint** (no flash). Tailwind v4 reads these via `@theme`.

### 1.1 Neutral ramp (primitive — never used directly in components)

True black → white, calibrated. The number *is* the lightness, so a step reads
the same in either theme; only the semantic mapping flips. Core steps are the
~10 bolded; the half-steps exist for glass tints and chart bins.

```css
:root {
  --gray-0:    #000000; /* true black — deepest plane, behind mesh */
  --gray-50:   #0E0E0E; /* ← dark page bg (verified)              */
  --gray-100:  #141414; /*   ← light text-primary                 */
  --gray-150:  #1C1C1C; /*   dark glass effective surface          */
  --gray-200:  #242424; /* raised / lowest map bin                 */
  --gray-300:  #2E2E2E;
  --gray-400:  #3D3D3D; /* dark hairline value                     */
  --gray-500:  #525252; /*   ← light text-secondary / disabled dark */
  --gray-600:  #6E6E6E; /*   ← light text-muted                    */
  --gray-650:  #808080; /* true mid — dark text-muted              */
  --gray-700:  #9A9A9A;
  --gray-750:  #ADADAD; /*   ← dark text-secondary                 */
  --gray-800:  #C4C4C4;
  --gray-850:  #D6D6D6;
  --gray-900:  #E6E6E6; /* light bg-subtle                         */
  --gray-950:  #F2F2F2; /*   ← dark text-primary / light page bg   */
  --gray-1000: #FFFFFF; /* pure white — light glass surface        */
}
```

### 1.2 Semantic tokens — dark theme (default)

```css
:root, :root[data-theme="dark"] {
  color-scheme: dark;

  /* elevation / surface */
  --bg-sunken:   var(--gray-0);          /* #000 behind the animated mesh   */
  --bg:          var(--gray-50);         /* #0E0E0E page plane              */
  --bg-subtle:   var(--gray-100);        /* #141414 raised sections, no-data */
  --surface-1:   var(--gray-150);        /* solid fallback when no backdrop  */
  --surface-2:   var(--gray-200);        /* raised solid (menus w/o blur)    */

  /* ink */
  --text-primary:   var(--gray-950);     /* #F2F2F2  17.2:1 on bg           */
  --text-secondary: var(--gray-750);     /* #ADADAD   8.6:1 on bg           */
  --text-muted:     var(--gray-650);     /* #808080   4.9:1 on bg (≥AA)     */
  --text-disabled:  var(--gray-500);     /* #525252  2.5:1 — exempt state   */

  /* lines & rings */
  --border:         rgba(255,255,255,.10);
  --border-strong:  rgba(255,255,255,.18);
  --hairline:       var(--gray-400);     /* solid chart gridline            */
  --focus-ring:     var(--gray-950);     /* #F2F2F2  17.2:1 — 3px, offset 2 */

  /* glass — see §2 */
  --glass-tint:     rgba(255,255,255,.05);
  --glass-tint-hi:  rgba(255,255,255,.08);
  --glass-border:   rgba(255,255,255,.12);
  --glass-specular: rgba(255,255,255,.14);
  --glass-shadow:   0 8px 32px rgba(0,0,0,.45);
  --glass-scrim:    rgba(0,0,0,.55);     /* modal backdrop                  */
  --glow:           0 0 24px rgba(255,255,255,.06); /* outer bloom          */

  /* dataviz ink (monochrome — see §3) */
  --viz-surface:    var(--gray-150);
  --series-1:       var(--gray-950);     /* #F2F2F2 100%  primary series    */
  --series-2:       var(--gray-800);     /* #C4C4C4 ~72%  secondary         */
  --series-3:       var(--gray-650);     /* #808080 ~50%  tertiary          */
  --viz-grid:       var(--gray-400);
  --viz-axis:       var(--gray-500);
  --viz-fill:       rgba(242,242,242,.10);
}
```

### 1.3 Semantic tokens — light theme

```css
:root[data-theme="light"] {
  color-scheme: light;

  --bg-sunken:   var(--gray-900);        /* #E6E6E6                         */
  --bg:          var(--gray-950);        /* #F2F2F2 page (verified)         */
  --bg-subtle:   var(--gray-900);        /* #E6E6E6                         */
  --surface-1:   var(--gray-1000);       /* #FFFFFF cards                   */
  --surface-2:   var(--gray-950);

  --text-primary:   var(--gray-100);     /* #141414  16.5:1 on bg           */
  --text-secondary: var(--gray-500);     /* #525252   7.0:1 on bg           */
  --text-muted:     var(--gray-600);     /* #6E6E6E   4.6:1 on bg (≥AA)     */
  --text-disabled:  var(--gray-700);

  --border:         rgba(0,0,0,.10);
  --border-strong:  rgba(0,0,0,.16);
  --hairline:       var(--gray-800);
  --focus-ring:     var(--gray-100);     /* #141414  16.5:1                 */

  --glass-tint:     rgba(255,255,255,.55);
  --glass-tint-hi:  rgba(255,255,255,.70);
  --glass-border:   rgba(0,0,0,.08);
  --glass-specular: rgba(255,255,255,.80);
  --glass-shadow:   0 8px 32px rgba(0,0,0,.12);
  --glass-scrim:    rgba(20,20,20,.35);
  --glow:           0 0 24px rgba(0,0,0,.05);

  --viz-surface:    var(--gray-1000);
  --series-1:       var(--gray-100);     /* #141414 darkest — primary       */
  --series-2:       var(--gray-500);     /* #525252                         */
  --series-3:       var(--gray-600);     /* #6E6E6E                         */
  --viz-grid:       var(--gray-800);
  --viz-axis:       var(--gray-700);
  --viz-fill:       rgba(20,20,20,.08);
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) { /* mirror the light block above */ }
}
```

> **Note on series in light theme:** magnitude/primacy runs **dark→light**
> (darkest ink = series-1) — the mirror of dark theme, where it runs light→dark
> (white = series-1). Same *rank order*, inverted luminance, so "most important =
> most contrast against the surface" holds in both.

### 1.4 Typography

Geist (UI) + **Geist Mono** for all figures — a deliberate brand decision (§10 of
the product spec). Dataviz's default is a sans hero number; **we override** to the
mono data-face for KPI values and all data figures because the "instrument
read-out" aesthetic is core to Beacon. Load both as `next/font` (self-hosted, no
layout shift), `font-display: swap`.

```css
:root {
  --font-ui:   "Geist", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", monospace;

  /* type scale (1.25 major-third-ish, rem @ 16px root) */
  --text-hero:    3rem;    /* 48px  KPI value, hero figure — ONE per view    */
  --text-h1:      1.875rem;/* 30px  page title                               */
  --text-h2:      1.5rem;  /* 24px  section / card title                     */
  --text-h3:      1.25rem; /* 20px  sub-section                              */
  --text-body-lg: 1rem;    /* 16px                                           */
  --text-body:    0.875rem;/* 14px  default UI text                          */
  --text-caption: 0.8125rem;/*13px  labels, table meta                       */
  --text-micro:   0.75rem; /* 12px  KPI label, legend, timestamps            */

  --lh-tight: 1.1;  --lh-snug: 1.3;  --lh-normal: 1.5;
  --tracking-tight: -0.02em; /* headings + hero numbers */
  --tracking-wide:  0.04em;  /* micro UPPERCASE labels  */
  --weight-regular: 400; --weight-medium: 500; --weight-semibold: 600;
}
```

- **KPI hero value:** `--font-mono`, `--text-hero`, semibold, `--tracking-tight`.
  Auto-compact (1,284 / 12.9K / 1.2M). Mono is inherently tabular — good for
  count-up alignment.
- **Table cells & axis ticks:** `--font-mono`, `font-variant-numeric: tabular-nums`
  (native to mono), so columns align.
- **Body / labels / nav:** `--font-ui`.
- **Micro labels** (KPI caption, legend, "LIVE"): `--text-micro`, uppercase,
  `--tracking-wide`, `--text-muted`.

### 1.5 Spacing, radii, z-index

```css
:root {
  --space-0:0; --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:20px; --space-6:24px; --space-8:32px; --space-10:40px;
  --space-12:48px; --space-16:64px; --space-20:80px;

  --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:24px;
  --radius-full:9999px;   /* glass panels use --radius-lg; pills/avatars full */

  --z-base:0; --z-raised:10; --z-sticky:100; --z-header:100; --z-drawer:200;
  --z-scrim:300; --z-modal:400; --z-popover:500; --z-toast:600; --z-tooltip:700;
}
```

### 1.6 Motion tokens

Values are the `motion-foundations` set, exposed two ways: CSS vars (for CSS
transitions) and a JS object (for `motion/react` — the current package name of
Framer Motion, per §7 of the product spec). **Never hardcode a duration/easing in
a component.**

```css
:root {
  --dur-instant:80ms; --dur-fast:180ms; --dur-normal:350ms; --dur-slow:600ms;
  --dur-crawl:1000ms;
  --ease-smooth: cubic-bezier(.22,1,.36,1);  /* default enter/exit          */
  --ease-sharp:  cubic-bezier(.4,0,.2,1);    /* UI feedback                 */
  --ease-bounce: cubic-bezier(.34,1.56,.64,1);/* playful (empty states)     */
}
@media (prefers-reduced-motion: reduce) {
  :root { --dur-instant:0ms; --dur-fast:120ms; --dur-normal:150ms;
          --dur-slow:150ms; --dur-crawl:150ms; } /* opacity-only, ≤0.2s */
}
```

```ts
// lib/motion-tokens.ts — consumed by motion/react
export const motionTokens = {
  duration: { instant:.08, fast:.18, normal:.35, slow:.6, crawl:1.0 },
  easing:   { smooth:[.22,1,.36,1], sharp:[.4,0,.2,1], bounce:[.34,1.56,.64,1] },
  distance: { xs:4, sm:8, md:16, lg:24, xl:48 },
  scale:    { subtle:.98, press:.95, pop:1.04 },
}
export const springs = {
  snappy:{type:"spring",stiffness:300,damping:30}, // default UI
  gentle:{type:"spring",stiffness:120,damping:14}, // cards, modals landing
  bouncy:{type:"spring",stiffness:400,damping:10}, // empty states
  instant:{type:"spring",stiffness:600,damping:35},// tooltips, popovers
  release:{type:"spring",stiffness:200,damping:20,restDelta:.001}, // drag
}
```

---

## 2. Liquid-glass recipes

Translated from the Liquid Glass material model (blur the content behind, tint,
thin light border, specular sheen on the top edge, inner + outer shadow, grain)
into web CSS. All surfaces are the **one `GlassPanel`** with an `elevation` prop
selecting a tier. Contrast rule (from the material's own guidance): **text on
glass must clear AA** — every text/glass pair in §7 is verified against the
*lightest* effective surface (`--gray-150` dark / `#FFFFFF` light).

### 2.1 Base recipe (the primitive)

```css
.glass {
  position: relative;
  background: var(--glass-tint);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow:
    inset 0 1px 0 0 var(--glass-specular),   /* specular top-edge sheen  */
    inset 0 0 0 1px rgba(255,255,255,.03),   /* inner hairline           */
    var(--glass-shadow);                      /* outer drop shadow        */
  isolation: isolate;
}
/* specular gradient sweep — top-left light, fades out */
.glass::before {
  content:""; position:absolute; inset:0; border-radius:inherit;
  background: linear-gradient(135deg,
      rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 40%);
  pointer-events:none; z-index:-1;
}
/* grain / noise — kills banding on the blur, adds tactile texture */
.glass::after {
  content:""; position:absolute; inset:0; border-radius:inherit;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity:.035; mix-blend-mode:overlay; pointer-events:none; z-index:-1;
}
/* graceful degradation where backdrop-filter is unsupported */
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .glass { background: var(--surface-1); }
}
```

### 2.2 Per-surface tiers (only the deltas from base)

| Surface | blur | tint | border | radius | shadow / extra |
|---|---|---|---|---|---|
| **Header** (`Header`) | `20px` | `--glass-tint-hi` | bottom hairline only (`border:0; border-bottom:1px`) | 0 | sticky, `z-header`; sheen along top edge |
| **KPI tile / card** (`GlassPanel` default) | `16px` | `--glass-tint` | full `--glass-border` | `--radius-lg` | base recipe; `--glow` on hover |
| **Sidebar** (`Sidebar`) | `24px` | `--glass-tint` | right hairline only | 0 | full-height; slightly stronger tint for text legibility over mesh |
| **Modal / dialog** | `32px` | `--glass-tint-hi` (heavier for legibility) | full `--border-strong` | `--radius-xl` | `--glass-shadow` + scrim behind (`--glass-scrim`, blur 4px) |
| **Popover / menu / tooltip** | `20px` | `--glass-tint-hi` | full | `--radius-md` | `z-popover`; smaller specular |

Concrete example — **Header**, both themes resolve from tokens:

```css
.header {
  position: sticky; top:0; z-index: var(--z-header);
  height: 64px; padding-inline: var(--space-6);
  background: var(--glass-tint-hi);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 0; border-bottom: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 0 var(--glass-specular);
}
```

**Interaction sheen (magnetic hover, glass only):** on pointer-move over a tile,
translate the `::before` specular a few px toward the cursor (CSS custom prop set
in JS, `--mx/--my`), `transition: var(--dur-fast) var(--ease-sharp)`. Disabled
under reduced-motion (§6).

---

## 3. Monochrome dataviz rules

The whole game: **tell series apart without hue.** Priority order of channels —
apply them in this order, stacking as series count grows:

1. **Luminance / opacity tiers** (up to 3 series): `--series-1/2/3`
   = 100% / ~72% / ~50% ink. Each verified ≥ 3:1 against `--viz-surface` (17.0,
   8.2, 4.9 dark), so every line/mark is a legible graphical object on its own.
2. **Stroke style** (adds a 2nd independent channel): series-1 **solid**,
   series-2 **dashed** `stroke-dasharray:6 3`, series-3 **dotted** `2 3`.
   Redundant with luminance so CVD/grayscale/print all survive.
3. **Fill texture / hatching** (fills, and the forced-colors fallback): the
   `dataviz` "Lines" fill at **45° / 135° only** (never H/V — reads as grid).
   SVG `<pattern>` hatch, tone-on-tone. On value scales it is **ordered**
   (denser = larger). On by default only in `forced-colors`; opt-in elsewhere.
4. **Direct labels + legend** (the *primary* identity channel here). In color you
   can eyeball-match a legend swatch; in monochrome you can't, so **a legend is
   always present for ≥2 series** and the ≤4 shown series are **also
   direct-labeled** at their endpoint/segment. Identity never rests on tone alone.
5. **Single-hue sequential ramp** for the map — which in monochrome is simply a
   **neutral luminance ramp** (grays light→dark). Sequential encoding is
   *already* single-hue, so the map is the one chart that needs no special
   trickery.

**Global mark specs** (from `dataviz`, unchanged): bars ≤24px thick, **4px
rounded data-end square at the baseline**; lines **2px** round-join; markers ≥8px
(r≥4) with a **2px surface ring**; area fill **~10%** wash; a **2px surface gap**
between touching marks; gridlines **1px solid** `--viz-grid`, recessive; **text
wears text tokens, never the series tone**; **never a dual-axis chart.**

### 3.1 `VisitsChart` — area / line, range toggle (24h · 7d · 30d)

- **Single series (visits):** 2px `--series-1` line; area = `--viz-fill` wash
  fading to 0 at the baseline via `<linearGradient>`; end-dot marker with surface
  ring; endpoint direct-labeled with the latest value (mono). No legend box (one
  series — the card title names it).
- **Two series (current vs previous period):** current = `--series-1` solid 2px +
  fill; previous = `--series-2` **dashed** 1.5px, **no** fill. Legend present
  (line-keys) + endpoint labels. This is the only overlay we ship.
- **Grid & axis:** hairline `--viz-grid`, x = time, y ticks rounded/comma'd, mono
  tabular. **One y-axis.**
- **Hover:** vertical **crosshair** snaps to nearest point; single tooltip lists
  every series at that x (value leads, series name follows; line-keys not boxes;
  insert names with `textContent`). Same readout on keyboard focus.
- **Draw-in** on mount → §6.

### 3.2 `WorldMap` — density choropleth (`react-simple-maps`)

- **Fill = neutral sequential ramp, 7 bins** by visit count. Dark theme: fewer →
  darker, more → lighter (countries *light up* like beacons; top bin ≈ `--gray-950`).
  Light theme: invert (more → darker ink). Bin edges (dark):
  `#242424 · #3D3D3D · #525252 · #6E6E6E · #9A9A9A · #C4C4C4 · #F2F2F2`
  (verified as a rising luminance ladder 1.2→17.2:1 on `--bg`).
- **No-data countries:** `--bg-subtle`, separated from the lowest data bin by a
  **1px `--border` stroke** so "zero" ≠ "no data".
- **Country borders:** hairline `--border`, 0.5px.
- **Legend:** horizontal gradient key with min/max + a threshold list (bin →
  range). Because bins are ordered luminance, the legend is unambiguous without color.
- **Hover/focus:** country lifts (`--focus-ring` 1.5px outline + `--glow`);
  tooltip = country name · visits · % of total. Keyboard: countries are a
  focusable list ordered by visit count (Tab moves down the ranking).
- **Reduced legibility guard:** the 7 bins span ΔL wide enough that adjacent bins
  differ ≥1.3:1 — but the tooltip + a companion "top countries" bar list (in the
  `/dashboard/map` view) means density is never *only* encoded in fill.

### 3.3 `BreakdownChart` — donut (device) + bars (referrers)

**Donut — device_type (desktop / mobile / tablet, ≤4 slices):**
- Slices = `--series-1/2/3(/…)` opacity tiers, **2px surface gap** between slices
  (no strokes), **texture hatch** as the forced-colors fallback.
- **Every slice direct-labeled** (category + %) with a leader line if thin; legend
  present. Center label = total (hero-ish, mono).
- Hover: slice lifts + tooltip (device · count · %). 

**Bars — top referrers (direct / Google / LinkedIn / GitHub / X):**
- Horizontal bars, one series → **single ink fill** (`--series-1`); magnitude is
  length, not tone. ≤24px thick, 4px rounded tip square at baseline, **2px gap**
  between bars.
- Category label at the left, **value at the tip** (mono). Sorted desc.
- Hover: bar lightens + tooltip.

### 3.4 KPI sparklines (inside `KpiTile`)

- 12-point **line, 1.5px `--text-muted`** (de-emphasis), current point = filled
  dot in `--text-primary` with surface ring. No axis, no gridlines; optional
  `--viz-fill` wash.
- **Delta** is direction-by-**glyph**, not color (monochrome has no
  green-up/red-down): `▲ +12%` / `▼ −4%` / `— 0%`, glyph + sign + mono value,
  `--text-secondary`. An SR-only phrase ("up 12% vs previous period") accompanies it.

**AA for dataviz (verified, §7):** every series mark clears **≥3:1** as a
graphical object; all value/label/axis text uses **text tokens** (never the
series tone); a **table view** exists for every chart (the `ActivityTable` and the
`/dashboard/*` list pages), so no value is gated behind hover or color.

---

## 4. Screen designs

Box-drawing wireframes. Breakpoints (Tailwind v4 defaults): `sm 640 · md 768 ·
lg 1024 · xl 1280 · 2xl 1536`. Content max-width 1440px, gutter 24–32px.

### 4.1 Login / signup — one glass card, two modes

Centered `GlassPanel` (modal tier) floating over the animated grayscale
mesh+grain background. Tabs toggle Sign in / Create account; fields animate
height between modes (reduced-motion → instant swap).

```
┌──────────────────────────── animated mono mesh + grain (bg-sunken) ──────────┐
│                                                                              │
│                      ◆ BEACON                        ← wordmark, mono, tracked │
│                                                                              │
│          ╭───────────────────── GlassPanel (blur 32) ──────────────────╮     │
│          │  ┌────────────┬─────────────────┐                            │     │
│          │  │  Sign in   │  Create account │   ← tabs (role=tablist)    │     │
│          │  └────────────┴─────────────────┘                            │     │
│          │                                                              │     │
│          │   Email                                                      │     │
│          │   ┌────────────────────────────────────────────────────┐    │     │
│          │   │ you@example.com                                     │    │     │
│          │   └────────────────────────────────────────────────────┘    │     │
│          │   Password                                                   │     │
│          │   ┌────────────────────────────────────────────────┐  ◔    │     │
│          │   │ ••••••••                                        │ show   │     │
│          │   └────────────────────────────────────────────────┘        │     │
│          │   (signup only) Confirm password  ┌──────────────────┐      │     │
│          │                                   └──────────────────┘      │     │
│          │                                                              │     │
│          │   ┌──────────────────── Sign in ───────────────────────┐    │     │
│          │   │           (primary, high-contrast solid)           │    │     │
│          │   └────────────────────────────────────────────────────┘    │     │
│          │            ───────────────  or  ───────────────              │     │
│          │   ┌──────────────  Continue with Google  ──────────────┐    │     │
│          │   │        (glass button, G mark, aria-label)          │    │     │
│          │   └────────────────────────────────────────────────────┘    │     │
│          │                                                              │     │
│          │   This visit is recorded (IP · device · location). Learn ↗   │     │
│          ╰──────────────────────────────────────────────────────────────╯     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Primary button = solid `--text-primary` bg / `--bg` text (the one "loud"
  element). Google button = glass. Divider is a hairline with centered "or".
- Field states: rest / focus (`--focus-ring` 3px offset 2) / error (`aria-invalid`,
  `role="alert"` message linked via `aria-describedby`, no color-only signal — an
  `!` glyph + text). Submit → button `loading` (spinner, `aria-busy`).
- The recorded-visit line is the same copy family as `ConsentBanner` (§5).
- **Responsive:** < 480px the card goes edge-to-edge (16px gutter), tabs full-width,
  buttons full-width; mesh persists.

### 4.2 Dashboard Overview (`/dashboard`)

```
┌──────────┬───────────────────────────────────────────────────────────────────┐
│ Sidebar  │  Header (glass, sticky 64px)                                        │
│ (glass   │  ┌ ⌕ search ─────────┐  [ 30d ▾ ]   ● LIVE   ☾/☀   🔔   ( ˚ ▾ )     │
│  260px)  │  └───────────────────┘  date-range  pulse  theme  bell  profile     │
│          ├───────────────────────────────────────────────────────────────────┤
│ ◆ Beacon │  Overview                                          ← h1, page title │
│          │                                                                     │
│ ▸ Overview│ ┌ KpiTile ─┐┌ KpiTile ─┐┌ KpiTile ─┐┌ KpiTile ─┐┌ KpiTile ─┐        │
│ ▸ Activity│ │ TOTAL    ││ UNIQUE   ││ SIGNED-IN││ LIVE NOW ││ TOP      │        │
│ ▸ Users   │ │ VISITS   ││ VISITORS ││ RATIO    ││          ││ COUNTRY  │        │
│ ▸ Map     │ │ 12,908   ││  4,213   ││  38%     ││   17     ││  🇺🇸 US  │        │
│ ▸ Settings│ │ ▲+12% ∿∿ ││ ▲+6% ∿∿  ││ ▼−3% ∿∿  ││ ● ∿∿∿∿   ││ 3,104    │        │
│          │  └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘        │
│          │                                                                     │
│          │ ┌ VisitsChart (area, span 8) ───────────┐┌ BreakdownChart (span 4)┐ │
│          │ │  Visits over time      [24h·7d·30d]    ││  Device                │ │
│          │ │      ╱╲      ╱╲__                       ││    ◕ donut + labels    │ │
│          │ │  ___╱  ╲____╱     ╲___  ▓ area wash     ││  Referrers             │ │
│          │ │  └────────────────────── time ──────┘  ││  ▇▇▇▇▇ direct ····     │ │
│          │ └────────────────────────────────────────┘└────────────────────────┘ │
│          │                                                                     │
│          │ ┌ WorldMap (density choropleth, span 8) ─┐┌ Recent activity (4) ──┐ │
│          │ │        ▓▓░░ shaded countries           ││ 12:04 ● Anon·Berlin   │ │
│          │ │      ░▓▓▓▓░   + hover tooltip          ││ 12:03 ◐ Ada·NYC       │ │
│          │ │   legend ░░▒▒▓▓██ few→many             ││ 12:01 ● Anon·Tokyo    │ │
│          │ └────────────────────────────────────────┘│ 12:00 ◐ Lee·London ▸  │ │
│          │                                            └── View all activity ──┘ │
│ ┌──────┐ │                                                                     │
│ │(˚)Ada │ │                                                                     │
│ │ ▾ menu│ ├───────────────────────────────────────────────────────────────────┤
│ └──────┘ │  ConsentBanner (glass, dismissible) — recording notice · Settings ↗ │
└──────────┴───────────────────────────────────────────────────────────────────┘
```

- **Grid:** 12-col main. Tiles: 5-up (`xl`) → 3-up (`lg`) → 2-up (`md`) → 1-up.
  Charts: 8/4 split (`xl/lg`) → stacked full-width (`md` and below).
- **Responsive shell:** below `lg` the **Sidebar collapses to a drawer** —
  hamburger appears at the header's left, drawer slides from the left over a
  scrim, focus-trapped, `Esc` closes, restores focus to the hamburger. On `xl+`
  the sidebar is a persistent rail (collapsible to 72px icon-only, choice persisted).
- **New-row highlight:** a live-inserted activity row flashes a brief `--glass-tint`
  wash then settles (§6).

---

## 5. Component specs

Each: **anatomy · states · sizing · glass/motion**. States template = rest /
hover / focus-visible / active / loading / empty / error where applicable.

### `AppShell`
- **Anatomy:** CSS grid — `[sidebar | (header / main)]`; owns the fixed mesh+grain
  background layer (`bg-sunken`, `position:fixed`, behind everything), the
  `ThemeToggle` context, the skip-link, and the live-region root.
- **Landmarks:** `<a class="skip-link">` → `<header role=banner>` → `<nav>` →
  `<main id=content>`. One `<h1>` per route.
- **Sizing:** sidebar 260px (72px collapsed) / header 64px / main fluid, max 1440.
- **Motion:** route transitions (§6). No glass itself (it's the frame).

### `Sidebar`
- **Anatomy:** logo/wordmark (top) · nav list (Overview·Activity·Users·Map·Settings,
  icon+label, `aria-current="page"` on active) · footer user chip (avatar, name,
  `▾` opens profile menu / logout).
- **States:** item rest `--text-secondary`; hover `--glass-tint` wash +
  `--text-primary`; **active** left 2px `--text-primary` marker + `--text-primary`
  label; focus-visible ring. Collapsed rail → labels become tooltips.
- **Sizing:** items 44px tall (target size), icon 20px, gap `--space-2`.
- **Glass/motion:** `Sidebar` glass tier (blur 24, right hairline). Drawer variant
  slides in `--dur-normal --ease-smooth`; magnetic hover off in reduced-motion.

### `Header`
- **Anatomy:** (mobile) hamburger · global search (`⌕`, `role=search`, ⌘K) ·
  spacer · date-range selector (preset rows popover) · **live pulse** ("● LIVE",
  a 2s breathing dot; `aria-live=polite` announces connect/disconnect) ·
  `ThemeToggle` · notifications bell (`aria-label`, badge count) · profile menu.
- **States:** search rest/focus (expands on `lg`); each control hover wash +
  focus ring; bell has unread dot; pulse has connected/reconnecting/offline.
- **Sizing:** 64px; controls 44px hit target.
- **Glass/motion:** Header glass tier (blur 20, bottom hairline). Pulse animation §6.

### `ThemeToggle`
- **Anatomy:** single button, sun/moon glyph, `aria-label="Switch to light/dark
  theme"`, reflects current theme.
- **States:** rest/hover/focus/active(press 0.95). On toggle: crossfade glyph +
  `--dur-fast`; writes `data-theme` + localStorage; no page flash (inline head
  script sets it before paint).
- **Reduced motion:** instant glyph swap, no rotate.

### `GlassPanel`
- **Anatomy:** the §2 primitive. Props: `elevation` (card|header|sidebar|modal|
  popover), `as`, `interactive` (enables magnetic sheen + hover glow), padding.
- **States:** rest; `interactive` hover → `--glow` + sheen follows cursor; focus
  ring when it wraps a focusable region.
- **Motion:** enter = fade+rise (`opacity 0→1`, `y 8→0`, `--dur-normal
  --ease-smooth`, `springs.gentle`). Reduced motion → opacity only.

### `KpiTile`
- **Anatomy:** `GlassPanel` containing — uppercase micro `label` · mono `--text-hero`
  **value** (count-up) · `delta` (glyph+sign+%) · 12-pt `sparkline`. `live_now`
  tile carries the breathing dot; `top_country` shows flag + name + count.
- **States:** rest; hover glow + magnetic sheen; **loading** = skeleton shimmer of
  value/sparkline (`aria-busy`); **empty** = "—" + "No data yet" (never blank,
  though seed prevents this); focusable if it links to a drill-down.
- **Sizing:** min-height 140px, padding `--space-6`, radius `--radius-lg`.
- **Motion:** value count-up + sparkline draw-in on enter (§6).

### `VisitsChart` — see §3.1
- **Anatomy:** card title · range toggle (`24h·7d·30d`, segmented, `aria-pressed`) ·
  SVG plot · crosshair+tooltip layer · endpoint labels.
- **States:** rest; **loading** = holds previous render at 40% opacity while
  refetching (no skeleton, no jump); **empty** = flat baseline + "No visits in
  range"; hover/focus crosshair.
- **Sizing:** span-8 desktop, aspect ~16:7, min-height 280px.
- **Motion:** draw-in (path length) + area fade (§6).

### `WorldMap` — see §3.2
- **Anatomy:** projection (equal-area) · country paths (binned fill) · legend
  gradient+thresholds · tooltip · focusable country ranking.
- **States:** rest; hover/focus country lift+glow; **loading** shimmer; **empty**
  = all no-data fill + note.
- **Sizing:** span-8, aspect ~2:1; full-bleed on `/dashboard/map`.
- **Motion:** bins fade/stagger in on mount (§6); no motion on pan/zoom under RM.

### `BreakdownChart` — see §3.3
- **Anatomy:** donut (device) + labels/legend · referrer bars.
- **States:** rest; slice/bar hover lift; loading shimmer; empty "No breakdown yet".
- **Sizing:** span-4; donut ~200px; bars stack below.
- **Motion:** donut sweep (0→angle) + bars grow from baseline, staggered (§6).

### `ActivityTable` (TanStack Table + Virtual)
- **Anatomy:** toolbar (search · filters: signed-in/anon, country, device, event
  type · sort) · header row (`role=columnheader`, `aria-sort`) · virtualized body
  (time-relative · who [avatar+name | "Anonymous"+IP] · location [flag+city] ·
  device · path · referrer) · pagination. Compact "recent" variant on Overview (no
  toolbar, 4–6 rows, "View all →").
- **States:** row rest/hover wash/focus; **new-row insert** highlight then settle;
  **loading** = 8 skeleton rows; **empty** = "No matching activity" + clear-filters;
  sort/filter re-render holds frame at reduced opacity.
- **Sizing:** row 48px, mono tabular for time/counts; sticky header.
- **Glass/motion:** sits on a `GlassPanel` (card tier); row-insert §6.

### `ConsentBanner`
- **Anatomy:** glass bar pinned bottom — recording notice ("This visit is being
  recorded — IP, device, location.") · "Details" link (→ Settings/privacy) ·
  Dismiss (`Got it`). Remembers dismissal.
- **Semantics:** `role="region" aria-label="Privacy notice"`, **not** a modal (it
  doesn't trap or block). Live but non-interrupting: rendered in DOM at load,
  `aria-live` not needed (it's persistent, not injected). Dismiss returns focus to
  the page; keyboard reachable in the natural tab order (last).
- **States:** shown (first visit) / dismissed (hidden, persisted) / hover+focus on
  actions.
- **Motion:** slide-up + fade on first paint (`--dur-normal`), slide-down on
  dismiss. Reduced motion → opacity only.

---

## 6. Motion spec

Every animation earns its place (guide attention / communicate state / preserve
continuity) or it's cut. **`prefers-reduced-motion` is checked via a single
`shouldAnimate()` gate + `useReducedMotion()`; the reduced path is not "less" —
it is opacity-only ≤ 0.2s, or nothing.** No layout-property animation ever (only
`transform`/`opacity`). SSR: `initial` must equal server output (mount-guard).

| Motion | Trigger | Spec (full) | Reduced-motion fallback |
|---|---|---|---|
| **KPI count-up** | tile enters viewport | number tweens 0→value, `--dur-slow` `--ease-smooth`, mono tabular so width is stable | **render final value instantly** (no tween) |
| **Chart draw-in** (`VisitsChart` line, donut sweep, bars, map bins) | mount / in-view | path: `stroke-dashoffset` len→0 `--dur-slow`; area fade after; donut angle sweep; bars `scaleY` from baseline; map bins stagger 20ms | **final state, opacity 0→1 ≤0.15s**, no draw/sweep/grow |
| **Row-insert** (`ActivityTable`, live feed) | new event via SSE | new row `opacity 0→1`, `y −8→0` `--dur-normal` `springs.gentle`, then a `--glass-tint` highlight wash fades over `--dur-slow` | opacity 0→1 only; **highlight wash still shown** (state cue) but no slide |
| **Background mesh + grain** | ambient | 2–3 grayscale radial blobs drift on a 30–60s loop (`transform: translate`); grain is static | **static** mesh, static grain (no drift) |
| **Magnetic hover / sheen** (glass tiles, buttons) | pointer over | element `scale 1.02` + specular `::before` follows cursor `--dur-fast` `--ease-sharp` | **disabled** (no scale, no sheen); focus ring still animates in |
| **Route transition** | navigation | outgoing `opacity→0 y 0→−8`, incoming reverse, `--dur-normal` `--ease-smooth`; shared `Header/Sidebar` persist | **crossfade opacity only** ≤0.15s |
| **Live pulse dot** | connected | dot opacity/scale breathes 1↔0.6 on a 2s loop | **static dot** (steady, still means "connected"); state changes announced via `aria-live` text, not motion |
| **Modal / drawer** | open/close | scrim fades; panel `scale .98→1` + `opacity` `--dur-normal` `springs.gentle`; drawer slides X | opacity only, no scale/slide |
| **Theme toggle** | click | glyph crossfade + 15° rotate `--dur-fast` | instant glyph swap |
| **Skeleton shimmer** | loading | 1.2s translate sweep | **static** dimmed placeholder (no sweep) |

Implementation: `motion/react`, `"use client"` on animated files, all values from
`motionTokens`/`springs`, `useSafeMotion()` for enter/exit. Low-end devices
(`hardwareConcurrency ≤ 4`) drop non-essential motion via `shouldAnimate()`.

---

## 7. Accessibility checklist — WCAG 2.2 AA

### 7.1 Contrast — verified monochrome pairs
Computed with the WCAG relative-luminance formula (script in build notes). Text on
glass is checked against the **lightest effective surface** (worst case).

| Pair | Theme | Ratio | Req | ✓ |
|---|---|---|---|---|
| text-primary `#F2F2F2` / bg `#0E0E0E` | dark | **17.24** | 4.5 | ✓ |
| text-primary `#F2F2F2` / glass `#1C1C1C` | dark | **15.22** | 4.5 | ✓ |
| text-secondary `#ADADAD` / bg | dark | **8.60** | 4.5 | ✓ |
| text-secondary / glass | dark | **7.59** | 4.5 | ✓ |
| text-muted `#808080` / bg (body-min) | dark | **4.89** | 4.5 | ✓ |
| text-muted / glass (large/UI) | dark | **4.32** | 3.0 | ✓ |
| focus-ring `#F2F2F2` / bg | dark | **17.24** | 3.0 | ✓ |
| text-primary `#141414` / bg `#F2F2F2` | light | **16.46** | 4.5 | ✓ |
| text-primary / glass `#FFFFFF` | light | **18.42** | 4.5 | ✓ |
| text-secondary `#525252` / bg | light | **6.98** | 4.5 | ✓ |
| text-secondary / glass | light | **7.81** | 4.5 | ✓ |
| text-muted `#6E6E6E` / bg (body-min) | light | **4.55** | 4.5 | ✓ |
| focus-ring `#141414` / bg | light | **16.46** | 3.0 | ✓ |
| series-1/2/3 vs viz-surface (graphical) | dark | 17.0 / 8.2 / 4.9 | 3.0 | ✓ |

`--text-disabled` is intentionally sub-AA — disabled controls are exempt (1.4.3).
Monochrome makes contrast trivial to hold; the discipline is keeping *muted* text
at body sizes ≥ 4.5 (it is) and never dropping below `--text-muted` for real text.

### 7.2 Keyboard & focus (2.1.1, 2.4.3, 2.4.7, 2.4.11, 2.5.8)
- **Skip link** first in DOM → `#content`.
- **Focus order** (Overview): skip-link → header (hamburger · search · date-range
  · theme · bell · profile) → sidebar nav (top→bottom) → main (tiles L→R → charts →
  table toolbar → rows → pagination) → ConsentBanner.
- **Visible focus:** 3px `--focus-ring`, 2px offset, `:focus-visible` only.
- **No positive `tabindex`.** All interactive elements are native `<button>/<a>/
  <input>` or have `role`+`tabindex=0`+key handlers.
- **Focus not obscured (2.4.11):** sticky glass header uses `scroll-margin-top:80px`
  on focus targets so focus never hides behind it.
- **Target size (2.5.8):** interactive controls ≥ 24×24 CSS px; primary controls 44px.
- **Charts:** every value reachable without pointer — crosshair/tooltip mirror on
  `focus`; map countries are a focusable ranked list; a **table view** backs every chart.
- **Modals/drawer:** focus trap (`focus-trap-react`), `Esc` closes, focus restored
  to opener.

### 7.3 Landmarks, ARIA, labels (1.3.1, 4.1.2, 3.3.2)
- Landmarks: `banner` (Header), `navigation` (Sidebar), `main`, `search`,
  `contentinfo`/region (ConsentBanner). One `<h1>` per route; heading levels never skip.
- Every `<input>` has a connected `<label htmlFor/id>` (login: Email, Password,
  Confirm) — **placeholders are not labels.** Required = `required aria-required`
  + visible `*` marked `aria-hidden`.
- Errors: `aria-invalid` + `aria-describedby` → message with `role="alert"`; never
  color-alone (glyph + text).
- Icon-only buttons (theme, bell, dismiss, show-password) have `aria-label`;
  decorative glyphs `aria-hidden`.
- Live feed & pulse: SSE inserts + connection state announced via
  `role="status" aria-live="polite"`; the delta arrows carry SR-only text.
- Segmented range toggles use `aria-pressed`; sortable columns `aria-sort`;
  nav active item `aria-current="page"`.

### 7.4 Reduced motion (2.3.3) & other
- Every entry in §6 has a reduced path; gated by `shouldAnimate()` +
  `useReducedMotion()` + the CSS `@media` duration overrides. The animated mesh and
  pulse go static; state cues (new-row highlight, connection status) survive as
  non-motion signals.
- **Reflow (1.4.10):** single-column at 320px, no horizontal scroll; wide charts/
  tables scroll inside their own `overflow-x:auto` container, page body never does.
- **Text spacing / zoom (1.4.4, 1.4.12):** rem units throughout; 200% zoom holds.
- **Consistent help (3.2.6):** "Details/privacy" link in the same place (ConsentBanner
  + Settings).

### 7.5 ConsentBanner semantics (privacy differentiator)
- `role="region" aria-label="Privacy notice"`; **not** modal — does not trap focus
  or block the page (recording is disclosed, not gated).
- Present in initial DOM (persistent, so no `aria-live` needed); last in tab order.
- "Got it" dismiss persists (localStorage), returns focus to page; "Details" links
  to the privacy setting (raw-IP vs `ip_hash`, per product spec §11). Notice copy
  matches the login recording line — one consistent message.

---

### Build notes
- Tokens → Tailwind v4 `@theme` + CSS vars; inline head script stamps `data-theme`
  pre-paint (no FOUC).
- `GlassPanel` is the only place `backdrop-filter` is written; everything frosted
  composes it.
- Contrast ratios above are reproducible (WCAG luminance formula over the exact
  token hexes); re-run if any neutral step changes.
- Charts: Recharts (`VisitsChart`, `BreakdownChart`) + `react-simple-maps`
  (`WorldMap`), styled by the §3 rules; motion via `motion/react` per §6.
