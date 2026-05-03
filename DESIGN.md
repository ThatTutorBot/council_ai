---
name: Council AI
description: WeChat-inspired council chat shell; warm OKLCH neutrals and one green accent; first-run council preview uses council-* surfaces. Tokens scanned from src/index.css (:root, @theme inline); UI patterns from src/App.tsx and src/components/OnboardingFlow.tsx.
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
  dialog: "calc(var(--radius) * 1.8)"
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
  onboarding-preview-dialog:
    backgroundColor: "{colors.council-canvas}"
    textColor: "{colors.neutral-foreground-token}"
    rounded: "{rounded.dialog}"
    padding: "0"
  onboarding-preview-footer:
    backgroundColor: "{colors.council-bubble-advisor}"
    textColor: "{colors.neutral-foreground-token}"
    rounded: "0"
    padding: "16px 32px"
---

# Design System: Council AI

## 1. Overview

**Creative North Star: "The Scholar's Rail"**

Council AI reads like a **mobile messenger shell** (narrow rail, warm list column, pale canvas, rounded bubbles) adapted for **slow deliberation**. Familiarity lowers cognitive load; character stays in **messages and personas**, not in chrome.

**Canonical colors** for the council shell are **`--council-*` OKLCH tokens** on `:root` in `src/index.css`, exposed to Tailwind as `bg-council-*`, `text-council-*`, etc. via `@theme inline`. **`--radius`** is **`0.625rem`** on `:root`; derived radii use `calc(var(--radius) * …)` in the theme (see Tailwind `rounded-*` mapping). Implementations should **not** drift ad hoc hex values on shell surfaces; extend tokens when new surfaces appear.

**Implementation sources (scan):**

| Area | Primary files |
|------|----------------|
| Tokens, fonts, base layer | `src/index.css` |
| Main chat shell, bubbles, composer, settings flyout | `src/App.tsx` (`CouncilShell`) |
| First-run (API capsule + council preview dialog) | `src/components/OnboardingFlow.tsx` |
| Shared primitives | `src/components/ui/*` (shadcn-style) |

This system rejects **PRODUCT.md** anti-references: generic AI-product polish stacks, decorative glass as default, hype framing, and chrome that competes with the thread.

**Key Characteristics:**

- **Thread first**: Chat column and bubbles dominate; settings are secondary surfaces (popover panels).
- **One green voice**: `--council-accent` carries navigation, toggles, primary sends, and focus; not full-screen washes.
- **Warm neutrals**: Canvas and list use **tinted** OKLCH grays; advisor bubbles use `--council-bubble-advisor` (warm paper, not pure white).
- **Bolder hierarchy**: Chat title and list titles lean **semibold**; meta labels use **tracking** and weight contrast against body copy.
- **First-run matches the rail at commitment**: The **Meet the council** preview uses **`council-*`** surfaces (canvas, borders, welcome pill, accent primary). Transition into **`CouncilShell`** uses an expand-style entrance from onboarding (see **`App.tsx`** `AnimatePresence`). The **API key setup** step still uses a **separate high-contrast capsule** (`bg-black`, white type, hardcoded Tailwind accents on helper icons). PRODUCT.md allows a compact entry affordance; DESIGN treats that capsule as **migration debt** toward full token alignment (see Do's and Don'ts).

## 2. Colors: The Rail and Canvas

Normative values are the **OKLCH strings in the YAML frontmatter** above (same as `:root` in `src/index.css`). Below is **role** guidance only.

### Primary

- **`--council-accent`**: Active rail state, chat title hover, member **Added**, primary CTAs, Send when ready, focus rings on shell inputs.

### Secondary

- **`--council-bubble-user`**: Outgoing message fill only; pair with foreground text (~`oklch(0.145 0 0)`, same chroma as **`--foreground`** on `:root`) and tail triangles matching the bubble fill.

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

- **`--background` / `--foreground`**, **`--primary`**, **`--destructive`**, **`--border`**: shadcn/ui primitives on `:root` for shared components (`Button`, `Input`, `Card`) where the shell does not override. Bubble body text aligns with **`--foreground`** (`oklch(0.145 0 0)` light theme).

### Named Rules

**The One Green Rule.** **`--council-accent`** is the **only** saturated green for UI chrome and commitment actions.

**The Bubble Contrast Rule.** Advisor bubbles use **`--council-bubble-advisor`** on **`--council-canvas`**; user bubbles use **`--council-bubble-user`**. Tail triangles must match their bubble fill.

## 3. Typography

**Display / editorial font:** Playfair Display (`--font-heading`), used sparingly (e.g. contact quote in `App.tsx`).

**Body font:** Geist Variable on `html` via `font-sans` (`@fontsource-variable/geist` in `src/index.css`).

### Hierarchy

- **Chat title**: `text-xl md:text-[1.75rem]` **semibold** `tracking-tight`; member count in **`--council-text-muted`**.
- **Profile name**: `text-2xl font-bold tracking-tight` on contact detail.
- **Thread body**: ~15px (`text-[15px]`) in bubbles; sender label uppercase, **semibold**, tracked (`meta-caption` role).
- **Composer**: 16px **medium** (`font-medium`) with softer placeholder weight.
- **Section caps** (“My Profile”, “Historical Masters”, “Advisors in this room”): ~11px **extrabold**, wide tracking (`tracking-[0.16em]`).

### Named Rules

**The Thread Width Rule.** Bubble column stays near **70%** max width of the chat column (`max-w-[70%]` pattern) for readable measure.

## 4. Elevation

Surfaces stay **mostly flat**; the rail and list avoid heavy drop shadows (flat rail rule). **Ephemeral panels** (settings, mentions, emoji picker, overflow menus, **first-run council preview**) use **large soft shadows** and rounded shells (`rounded-2xl`). **Bubbles** use layered shadows (green-tinted lift for user, neutral depth for advisor).

### Shadow vocabulary (implementation)

Scan from **`App.tsx`** / **`OnboardingFlow.tsx`**:

- **Popover / dropdown** (settings): `shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)]`.
- **Mentions picker**: `shadow-[0_16px_40px_-8px_rgba(0,0,0,0.14)]`.
- **Emoji picker**: `shadow-[0_16px_44px_-10px_rgba(0,0,0,0.16)]`.
- **Chat header strip**: `shadow-[0_6px_20px_-8px_rgba(0,0,0,0.07)]`.
- **Composer dock**: `shadow-[0_-14px_40px_-16px_rgba(0,0,0,0.09)]`.
- **First-run council preview modal**: panel `shadow-[0_24px_60px_-16px_rgba(0,0,0,0.22)]`; backdrop `bg-black/45`. Centered overlay; not side-by-side with setup.
- **Welcome pill** (empty thread + preview): `shadow-[0_18px_48px_-10px_rgba(5,120,65,0.5)]`.
- **Advisor cards** (preview grid): `shadow-[0_10px_28px_-12px_rgba(0,0,0,0.12)]` plus `ring-1 ring-black/[0.04]`.
- **Chat bubbles**: user `shadow-[0_12px_32px_-8px_rgba(25,130,55,0.28)]`; advisor `shadow-[0_14px_40px_-12px_rgba(0,0,0,0.14)]`.

### Named Rules

**The Flat Rail Rule.** Rail and list panels do not use decorative drop shadows; separation is **color**, **gradient on rail**, and **borders**.

## 5. Components

### Buttons

- **Send**: `rounded-full`; when input has text, **`--council-accent`** fill and shadow; disabled outline uses canvas + hairline border.
- **Primary CTAs** (e.g. Messages, Create group, **Enter Council** in preview): **`--council-accent`** / **`--council-accent-hover`**, rounded-full where specified.

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

### First-run API setup capsule

In **`OnboardingFlow.tsx`**, the collapsed pill and expanded **vendor/API key** block sit inside **`bg-black`** / white typography ( **`shadow-[0_25px_80px_-20px_rgba(0,0,0,0.45)]`** ). Quick actions on the collapsed pill use **`bg-orange-500`** and **`bg-blue-600`** (Tailwind defaults). **Save & apply** uses inverted white/black button styling. This block is **not** yet on **`--council-*`** tokens; align over time with **PRODUCT.md** principle 6 and the Don’t on arbitrary accents.

### First-run council preview (“Meet the council”)

Implemented as a **fixed dialog** (`role="dialog"`, `aria-modal`) over **`bg-black/45`**.

- **Panel shell**: **`bg-council-canvas`**, **`border-council-list-border`**, **`rounded-2xl`**, **`shadow-[0_24px_60px_-16px_rgba(0,0,0,0.22)]`**; responsive insets on mobile; centered on **`md:`**.
- **Header**: **`h-[72px]`**, **`border-council-list-border`**, title **`text-xl font-semibold tracking-tight`**; close **`text-council-text-soft`**, **`hover:bg-council-row-hover`**.
- **Body**: Scrollable **`bg-council-canvas`**; welcome pill **`bg-council-welcome`** (matches empty **`App.tsx`** thread).
- **Advisor roster**: Grid of **`bg-council-bubble-advisor`** tiles, **`border-council-hairline`**, **`rounded-xl`**.
- **Footer**: **`bg-council-bubble-advisor`**, **`border-council-list-border`**; **Enter the Council** **`--council-accent`** (see YAML `onboarding-preview-footer`).

## 6. Do's and Don'ts

Align with **PRODUCT.md** anti-references: no gradient hero metrics, decorative glass, side-stripe accent cards, hype framing, heavy dashboard chrome, or cheap futuristic illustration.

### Do:

- **Do** use **`--council-*` tokens** (or Tailwind `council-*` colors) for all new shell surfaces.
- **Do** keep persona flavor in **message content** and **Moments**, not in chrome paint.
- **Do** use **hairlines and tonal steps** before adding shadows on structural columns.
- **Do** align onboarding preview panels with **settings / popover** elevation and token usage so first-run and product UI share one vocabulary.
- **Do** migrate the **API setup capsule** off hardcoded oranges/blues toward **`--council-accent`** and neutrals when touching that code next.

### Don't:

- **Don't** use **gradient text** for emphasis.
- **Don't** add **full-panel blur** or glass cards behind the thread as a default.
- **Don't** use **thick colored side stripes** on rows; use **full-row wash** or borders.
- **Don't** nest cards around the thread; the thread stays the content surface.
- **Don't** introduce **arbitrary accent colors** on onboarding chrome when **`--council-accent`** and neutrals already define actions; that reads as a second product identity (current orange/blue icon buttons are flagged for removal).
