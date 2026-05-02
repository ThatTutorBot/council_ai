---
name: Council AI
description: WeChat-inspired council chat shell; warm OKLCH neutrals and one green accent. Canonical tokens live in src/index.css (:root --council-*).
colors:
  council-canvas: "oklch(96.8% 0.028 92)"
  council-rail: "oklch(19.5% 0.055 155)"
  council-rail-deep: "oklch(14.5% 0.048 158)"
  council-list: "oklch(91.5% 0.042 88)"
  council-list-border: "oklch(78% 0.045 82)"
  council-search-bg: "oklch(85% 0.038 86)"
  council-accent: "oklch(56% 0.225 152)"
  council-accent-hover: "oklch(49% 0.22 152)"
  council-bubble-user: "oklch(88.5% 0.23 124)"
  council-bubble-advisor: "oklch(99.2% 0.014 95)"
  council-row-active: "oklch(83.5% 0.095 142)"
  council-row-hover: "oklch(87.5% 0.052 92)"
  council-hairline: "oklch(88.5% 0.034 92)"
  council-text-muted: "oklch(52% 0.035 65)"
  council-text-soft: "oklch(38% 0.03 55)"
  council-rail-icon: "oklch(68% 0.035 250)"
  council-typing-bg: "oklch(84% 0.055 95)"
  council-typing-dot: "oklch(50% 0.155 155)"
  council-welcome: "oklch(58% 0.19 152)"
  council-moments-link: "oklch(46% 0.14 264)"
  neutral-foreground-token: "oklch(0.145 0 0)"
typography:
  headline-chat:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title-profile:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body-chat:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  body-composer:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  meta-caption:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.16em"
  card-heading:
    fontFamily: '"Playfair Display", Georgia, serif'
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "normal"
rounded:
  sm: "2px"
  md: "8px"
  lg: "10px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-send-ready:
    backgroundColor: "{colors.council-accent}"
    textColor: "{colors.council-bubble-advisor}"
    rounded: "9999px"
    padding: "10px 40px"
  chip-member-on:
    backgroundColor: "{colors.council-accent}"
    textColor: "{colors.council-bubble-advisor}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
  chip-member-off:
    backgroundColor: "{colors.council-canvas}"
    textColor: "{colors.council-text-muted}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
  bubble-advisor:
    backgroundColor: "{colors.council-bubble-advisor}"
    textColor: "{colors.neutral-foreground-token}"
    rounded: "{rounded.xl}"
    padding: "16px"
  bubble-user:
    backgroundColor: "{colors.council-bubble-user}"
    textColor: "{colors.neutral-foreground-token}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Council AI

## 1. Overview

**Creative North Star: "The Scholar's Rail"**

Council AI reads like a **mobile messenger shell** (narrow rail, warm list column, pale canvas, rounded bubbles) adapted for **slow deliberation**. Familiarity lowers cognitive load; character stays in **messages and personas**, not in chrome.

**Canonical colors** for the council shell are **`--council-*` OKLCH tokens** on `:root` in `src/index.css`, exposed to Tailwind as `bg-council-*`, `text-council-*`, etc. via `@theme inline`. Implementations should **not** drift hex values in components; extend tokens when new surfaces appear.

**Key Characteristics:**

- **Thread first**: Chat column and bubbles dominate; settings are secondary surfaces (popover panels).
- **One green voice**: `--council-accent` carries navigation, toggles, primary sends, and focus; not full-screen washes.
- **Warm neutrals**: Canvas and list use **tinted** OKLCH grays; advisor bubbles use `--council-bubble-advisor` (warm paper, not pure white).
- **Bolder hierarchy**: Chat title and list titles lean **semibold**; meta labels use **tracking** and weight contrast against body copy.

## 2. Colors: The Rail and Canvas

Normative values are the **OKLCH strings in the YAML frontmatter** above (same as `:root` in `src/index.css`). Below is **role** guidance only.

### Primary

- **`--council-accent`**: Active rail state, chat title hover, member **Added**, primary CTAs, Send when ready, focus rings on shell inputs.

### Secondary

- **`--council-bubble-user`**: Outgoing message fill only; pair with `--neutral-foreground-token` text and tail triangles matching the bubble fill.

### Tertiary

- **`--council-moments-link`**: Moments author names and icon tint (WeChat-style blue), isolated to that view.

### Neutral

- **`--council-rail` / `--council-rail-deep`**: Left column gradient for depth without shadow on the rail itself.
- **`--council-rail-icon`**: Idle Lucide stroke on rail; active state uses accent on top of `white/12` pill.
- **`--council-list`**: Chat list and contacts panel fill.
- **`--council-list-border`**: Strong vertical separation between list and main canvas.
- **`--council-search-bg`**: Search field and thumbnail chrome.
- **`--council-canvas`**: Main thread background.
- **`--council-row-active` / `--council-row-hover`**: Selection and hover washes (green-tinted active state).
- **`--council-hairline`**: Header rules, composer top edge, light dividers.
- **`--council-text-muted` / `--council-text-soft`**: Timestamps, secondary lines, de-emphasized chrome.

### Library tokens (global stylesheet)

- **`--background` / `--foreground`**, **`--primary`**: shadcn/ui primitives for shared components (`Button`, `Input`, `Card`) where the shell does not override.

### Named Rules

**The One Green Rule.** **`--council-accent`** is the **only** saturated green for UI chrome and commitment actions.

**The Bubble Contrast Rule.** Advisor bubbles use **`--council-bubble-advisor`** on **`--council-canvas`**; user bubbles use **`--council-bubble-user`**. Tail triangles must match their bubble fill.

## 3. Typography

**Display / editorial font:** Playfair Display (`--font-heading`), used sparingly (e.g. card titles in shared components).

**Body font:** Geist Variable on `html` via `font-sans`.

### Hierarchy

- **Chat title**: `text-xl font-semibold tracking-tight`; member count in **`--council-text-muted`** and lighter weight.
- **Profile name**: `text-2xl font-bold tracking-tight` on contact detail.
- **Thread body**: ~15px in bubbles; sender label uppercase, **semibold**, tracked (`meta-caption` role).
- **Composer**: 16px **medium** body with softer placeholder weight.
- **Section caps** (“My Profile”, “Historical Masters”): 11px **extrabold**, wide tracking (`meta-caption`).

### Named Rules

**The Thread Width Rule.** Bubble column stays near **70%** max width of the chat column for readable measure.

## 4. Elevation

Surfaces stay **mostly flat**; the rail and list avoid heavy drop shadows (flat rail rule). **Ephemeral panels** (settings, mentions, emoji picker, overflow menus) use **large soft shadows** and rounded-2xl shells. **Bubbles** use layered shadows (green-tinted lift for user, neutral depth for advisor).

### Shadow vocabulary (implementation)

- **Popover / dropdown**: `shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)]` class pattern on settings flyout (see `App.tsx`).
- **Chat bubbles**: User bubble green-tinted shadow; advisor bubble neutral ambient shadow; both use subtle rings for edge definition.

### Named Rules

**The Flat Rail Rule.** Rail and list panels do not use decorative drop shadows; separation is **color**, **gradient on rail**, and **borders**.

## 5. Components

### Buttons

- **Send**: `rounded-full`; when input has text, **`--council-accent`** fill and shadow; disabled outline uses canvas + hairline border.
- **Primary CTAs** (e.g. Messages, Create group): **`--council-accent`** / **`--council-accent-hover`**, rounded-full where specified.

### Chips / toggles

- **Member row**: On state uses **`--council-accent`**; off state uses canvas + hairline.

### Message bubbles

- **Advisor**: `rounded-2xl` with **flat** corner on thread side; tail via CSS borders; translation row separated with border and **`--council-text-soft`**.
- **User**: **`--council-bubble-user`**; tail matches fill; slightly stronger shadow than advisor.

### Navigation

- **Left rail**: Icon buttons in **`white/12`** when active; stroke **`--council-accent`** when selected view.
- **Chat list**: Rows use row-active / row-hover tokens; overflow menu uses bubble-advisor surface and list-border.

### Create group modal

- Panel uses **`--council-bubble-advisor`** surface, **`--council-list-border`**, rounded-xl/2xl; primary action **`--council-accent`**.

## 6. Do's and Don'ts

Align with **PRODUCT.md** anti-references: no gradient hero metrics, decorative glass, side-stripe accent cards, hype framing, heavy dashboard chrome, or cheap futuristic illustration.

### Do:

- **Do** use **`--council-*` tokens** (or Tailwind `council-*` colors) for all new shell surfaces.
- **Do** keep persona flavor in **message content** and **Moments**, not in chrome paint.
- **Do** use **hairlines and tonal steps** before adding shadows on structural columns.

### Don't:

- **Don't** use **gradient text** for emphasis.
- **Don't** add **full-panel blur** or glass cards behind the thread as a default.
- **Don't** use **thick colored side stripes** on rows; use **full-row wash** or borders.
- **Don't** nest cards around the thread; the thread stays the content surface.
