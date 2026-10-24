---
version: alpha
name: summarise-design-system
description: Summarise reads like a quietly editorial print magazine that happens to be an AI notetaker. The base canvas is off-white (`#f5f5f5`) holding warm near-black ink (`#292524`); colour comes only from soft pastel atmospheric gradient orbs (mint → peach → lavender → sky → rose). Display runs Newsreader at weight 300 — the editorial signature. Inter carries body, navigation, captions. CTAs are subtle: a near-black ink pill is the primary, a transparent outline is the secondary. There is no neon accent, no saturated CTA colour.

colors:
  primary: "#292524"
  primary-active: "#0c0a09"
  ink: "#0c0a09"
  body: "#4e4e4e"
  body-strong: "#292524"
  muted: "#6b665f"
  muted-soft: "#a8a29e"
  hairline: "#e7e5e4"
  hairline-soft: "#f0efed"
  hairline-strong: "#d6d3d1"
  canvas: "#f5f5f5"
  canvas-soft: "#fafafa"
  canvas-deep: "#0c0a09"
  surface-card: "#ffffff"
  surface-strong: "#f0efed"
  surface-dark: "#0c0a09"
  surface-dark-elevated: "#1c1917"
  on-primary: "#ffffff"
  on-dark: "#ffffff"
  on-dark-soft: "#a8a29e"
  gradient-mint: "#a7e5d3"
  gradient-peach: "#f4c5a8"
  gradient-lavender: "#c8b8e0"
  gradient-sky: "#a8c8e8"
  gradient-rose: "#e8b8c4"
  semantic-error: "#dc2626"
  semantic-success: "#16a34a"

colors-dark:
  primary: "#fafaf9"
  primary-active: "#e7e5e4"
  ink: "#fafaf9"
  body: "#d6d3d1"
  body-strong: "#e7e5e4"
  muted: "#a8a29e"
  muted-soft: "#78716c"
  hairline: "#292524"
  hairline-soft: "#1c1917"
  hairline-strong: "#44403c"
  canvas: "#0c0a09"
  canvas-soft: "#141210"
  surface-card: "#1c1917"
  surface-strong: "#292524"
  on-primary: "#0c0a09"
  semantic-error: "#ef4444"
  semantic-success: "#22c55e"

typography:
  display-mega:
    fontFamily: "'Newsreader', 'Times New Roman', serif"
    fontSize: 64px
    fontWeight: 300
    lineHeight: 1.05
    letterSpacing: -1.92px
  display-xl:
    fontFamily: "'Newsreader', serif"
    fontSize: 48px
    fontWeight: 300
    lineHeight: 1.08
    letterSpacing: -0.96px
  display-lg:
    fontFamily: "'Newsreader', serif"
    fontSize: 36px
    fontWeight: 300
    lineHeight: 1.17
    letterSpacing: -0.36px
  display-md:
    fontFamily: "'Newsreader', serif"
    fontSize: 32px
    fontWeight: 300
    lineHeight: 1.13
    letterSpacing: -0.32px
  display-sm:
    fontFamily: "'Newsreader', serif"
    fontSize: 24px
    fontWeight: 300
    lineHeight: 1.2
    letterSpacing: 0
  title-md:
    fontFamily: "'Inter', sans-serif"
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0
  title-sm:
    fontFamily: "'Inter', sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.44
    letterSpacing: 0.18px
  body-md:
    fontFamily: "'Inter', sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.16px
  body-strong:
    fontFamily: "'Inter', sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.16px
  body-sm:
    fontFamily: "'Inter', sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: 0.15px
  caption:
    fontFamily: "'Inter', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "'Inter', sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.96px
    textTransform: uppercase
  button:
    fontFamily: "'Inter', sans-serif"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0
  nav-link:
    fontFamily: "'Inter', sans-serif"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  base: 16px
  md: 20px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

components:
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: 64px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 10px 20px
    height: 40px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 9px 19px
    height: 40px
  button-tertiary-text:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.button}"
  hero-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-mega}"
    padding: 96px
  gradient-orb-card:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xxl}"
    padding: 32px
  feature-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.xl}"
    padding: 24px
  product-card-stack:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 0
  list-row:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    padding: 12px 0
  icon-circular:
    backgroundColor: "{colors.surface-strong}"
    rounded: "{rounded.full}"
    size: 32px
  pricing-tier-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 32px
  pricing-tier-featured:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 32px
  text-input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 44px
  badge-pill:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.caption-uppercase}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  cta-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    padding: 96px
  testimonial-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.body}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 32px
  audio-waveform-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
    padding: 64px 48px
  footer-link:
    backgroundColor: transparent
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
---

# Summarise design system

This is the source of truth for how Summarise looks. Every token here maps to a
CSS variable or Tailwind class in `apps/web/src/index.css`. Each component has
its own doc in [`components/`](components/), and each page in [`pages/`](pages/).

## Overview

Summarise reads like a quietly editorial print magazine that happens to be an AI notetaker. The base canvas is off-white `{colors.canvas}` (#f5f5f5) holding warm near-black ink `{colors.ink}` (#0c0a09). The visual energy is **atmospheric, not chromatic**: soft pastel gradient orbs (mint, peach, lavender, sky, rose) drift through the page as the only "colour" moments. There is no neon accent, no saturated CTA colour.

Type pairs **Newsreader Light** (serif at weight 300) for display with **Inter** for body, navigation, captions. The display weight at 300 is the editorial signature — never bold, never heavy.

CTAs are subtle: a near-black ink pill (`{component.button-primary}`) is the primary, a transparent outline (`{component.button-outline}`) is the secondary.

**Key Characteristics:**

- Off-white canvas, warm near-black ink. No saturated CTA colour.
- Single primary action: ink pill at `{rounded.pill}`. Atmospheric gradients carry the visual energy.
- Display runs Newsreader at weight 300 — editorial magazine voice.
- Body runs Inter at 400 with subtle letter-spacing (+0.15-0.18px).
- Pastel gradient orbs (5 tokens: mint, peach, lavender, sky, rose) used as atmospheric decoration only.
- Soft pill geometry (`{rounded.pill}` for CTAs, `{rounded.xl}` for cards).
- 96px section rhythm.
- Light and dark themes share every token name; only the values change.

## Colors

### Brand & Accent

- **Ink Primary** (`{colors.primary}` — #292524): The primary action colour — warm near-black pill. Used scarcely.
- **Ink Primary Active** (`{colors.primary-active}` — #0c0a09): Press state.

### Surface

- **Canvas** (`{colors.canvas}` — #f5f5f5): Off-white page floor.
- **Canvas Soft** (`{colors.canvas-soft}` — #fafafa): Lighter band for subtle alternating sections.
- **Canvas Deep** (`{colors.canvas-deep}` — #0c0a09): Same as ink — used for rare dark bands.
- **Surface Card** (`{colors.surface-card}` — #ffffff): Pure white card.
- **Surface Strong** (`{colors.surface-strong}` — #f0efed): Badges, icon plates.
- **Surface Dark** (`{colors.surface-dark}` — #0c0a09): Dark hero/CTA band canvas.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #1c1917): Cards on dark canvas.

### Hairlines

- **Hairline** (`{colors.hairline}` — #e7e5e4): Default 1px divider.
- **Hairline Soft** (`{colors.hairline-soft}` — #f0efed): Lighter divider.
- **Hairline Strong** (`{colors.hairline-strong}` — #d6d3d1): Stronger panel outline, input borders.

### Text

- **Ink** (`{colors.ink}` — #0c0a09): Display, primary text.
- **Body** (`{colors.body}` — #4e4e4e): Default running-text.
- **Body Strong** (`{colors.body-strong}` — #292524): Same as primary — emphasis.
- **Muted** (`{colors.muted}` — #6b665f): Sub-titles, helper text. Darker than the reference spec's #777169 so small text passes WCAG AA on the canvas.
- **Muted Soft** (`{colors.muted-soft}` — #a8a29e): Disabled text.
- **On Primary** (`{colors.on-primary}` — #ffffff): White text on ink pill.
- **On Dark** (`{colors.on-dark}` — #ffffff): White text on dark bands.
- **On Dark Soft** (`{colors.on-dark-soft}` — #a8a29e): Muted off-white on dark.

### Atmospheric Gradient Stops (signature)

- **Gradient Mint** (`{colors.gradient-mint}` — #a7e5d3)
- **Gradient Peach** (`{colors.gradient-peach}` — #f4c5a8)
- **Gradient Lavender** (`{colors.gradient-lavender}` — #c8b8e0)
- **Gradient Sky** (`{colors.gradient-sky}` — #a8c8e8)
- **Gradient Rose** (`{colors.gradient-rose}` — #e8b8c4)

These appear ONLY as soft radial-gradient atmospheric orbs inside `{component.gradient-orb-card}` and as background blooms behind hero copy. Never as button fills, never as text colours.

### Semantic

- **Success** (`{colors.semantic-success}` — #16a34a): Confirmation.
- **Error** (`{colors.semantic-error}` — #dc2626): Validation errors, live recording indicator.

### Dark theme

Dark mode is turned on by the `.dark` class on `<html>`, which follows the system setting. Every token keeps its name; values come from `colors-dark` above.

| Token           | Light   | Dark    |
| --------------- | ------- | ------- |
| canvas          | #f5f5f5 | #0c0a09 |
| canvas-soft     | #fafafa | #141210 |
| surface-card    | #ffffff | #1c1917 |
| surface-strong  | #f0efed | #292524 |
| hairline        | #e7e5e4 | #292524 |
| hairline-strong | #d6d3d1 | #44403c |
| ink             | #0c0a09 | #fafaf9 |
| body            | #4e4e4e | #d6d3d1 |
| muted           | #6b665f | #a8a29e |
| primary         | #292524 | #fafaf9 |
| on-primary      | #ffffff | #0c0a09 |

- The primary pill **inverts** in dark mode: light background, dark text.
- Gradient orbs keep their hues but are dimmed (lower opacity) so they glow rather than glare.

### Colour classes

Use these Tailwind classes. They switch values automatically in dark mode.

| Token                                    | Class                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| canvas, canvas-soft                      | `bg-canvas`, `bg-canvas-soft`                                                         |
| surface-card, surface-strong             | `bg-surface-card`, `bg-surface-strong`                                                |
| hairline, hairline-soft, hairline-strong | `border-hairline`, `border-hairline-soft`, `border-hairline-strong`                   |
| ink, body, body-strong                   | `text-ink`, `text-body`, `text-body-strong`                                           |
| muted, muted-soft                        | `text-muted-foreground`, `text-muted-soft`                                            |
| primary, primary-active, on-primary      | `bg-primary`, `bg-primary-active`, `text-on-primary`                                  |
| semantic-error, semantic-success         | `text-destructive`, `text-success`                                                    |
| gradient-*                               | `orb-mint`, `orb-peach`, `orb-lavender`, `orb-sky`, `orb-rose` (e.g. `from-orb-mint`) |

shadcn/ui variables (`--background`, `--primary`, `--border`, …) point at these tokens, so shadcn components follow the design system without changes.

## Typography

### Font Family

**Newsreader** (variable, used at weight 300) stands in for the licensed Waldenburg Light as the display serif. **Inter** carries body, navigation, captions, and buttons. Fallback: `'Times New Roman', serif` for Newsreader, `sans-serif` for Inter. Both are self-hosted via `@fontsource-variable`.

### Hierarchy

| Token                            | Size | Weight | Line Height | Letter Spacing | Use                            |
| -------------------------------- | ---- | ------ | ----------- | -------------- | ------------------------------ |
| `{typography.display-mega}`      | 64px | 300    | 1.05        | -1.92px        | Hero h1                        |
| `{typography.display-xl}`        | 48px | 300    | 1.08        | -0.96px        | Subsidiary heroes              |
| `{typography.display-lg}`        | 36px | 300    | 1.17        | -0.36px        | Section heads                  |
| `{typography.display-md}`        | 32px | 300    | 1.13        | -0.32px        | Sub-section heads, page titles |
| `{typography.display-sm}`        | 24px | 300    | 1.2         | 0              | Card group titles              |
| `{typography.title-md}`          | 20px | 500    | 1.35        | 0              | Component titles — Inter       |
| `{typography.title-sm}`          | 18px | 500    | 1.44        | 0.18px         | List labels                    |
| `{typography.body-md}`           | 16px | 400    | 1.5         | 0.16px         | Default body — Inter           |
| `{typography.body-strong}`       | 16px | 500    | 1.5         | 0.16px         | Emphasized body                |
| `{typography.body-sm}`           | 15px | 400    | 1.47        | 0.15px         | Secondary body, footer         |
| `{typography.caption}`           | 14px | 400    | 1.5         | 0              | Captions, helper text          |
| `{typography.caption-uppercase}` | 12px | 600    | 1.4         | 0.96px         | Section labels, badges         |
| `{typography.button}`            | 15px | 500    | 1.0         | 0              | CTA pill                       |
| `{typography.nav-link}`          | 15px | 500    | 1.4         | 0              | Top-nav menu                   |

Each token is a Tailwind class that sets size, line height, letter spacing and weight: `text-display-mega`, `text-title-md`, `text-body-md`, `text-caption-upper`, etc.

- Display tokens need the serif: pair them with `font-display`. Headings (`h1`–`h6`) get `font-display` and weight 300 by default.
- `text-caption-upper` pairs with `uppercase`.
- The page body defaults to `text-body-md` in Inter.

### Principles

- **Display weight stays at 300.** Never bold display copy.
- **Subtle letter-spacing on body.** Inter at +0.15-0.18px tracking.
- **Negative letter-spacing on display.** -0.32px to -1.92px on display sizes.

## Layout

### Spacing System

- **Base unit:** 4px (Tailwind's default spacing step, so `p-4` = 16px).
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.base}` 16px · `{spacing.md}` 20px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- **Section padding:** 96px (`py-section`).

### Grid & Container

- Max content width: 1200px (`max-w-content`).
- Feature card grids: 2-up at desktop for hero splits, 3-up for benefit grids.

### Whitespace Philosophy

Generous editorial pacing — print-magazine feel. 96px between bands; cards inside bands sit close (16-24px gap). Gradient orbs occupy generous breathing space without competing with copy.

## Elevation & Depth

The system uses **hairline + soft drop**.

| Level           | Treatment                                         | Use                                      |
| --------------- | ------------------------------------------------- | ---------------------------------------- |
| Flat (canvas)   | `{colors.canvas}`                                 | Body bands, footer                       |
| Card            | `{colors.surface-card}`                           | Content cards                            |
| Hairline border | 1px `{colors.hairline}`                           | Card outlines                            |
| Soft drop       | `0 4px 16px rgba(0, 0, 0, 0.04)` (`shadow-soft`)  | Hovered cards (single shadow tier)       |
| Gradient orb    | Radial gradient with one of `{colors.gradient-*}` | Atmospheric depth — never a card surface |

## Shapes

### Border Radius Scale

| Token            | Value  | Class          | Use                     |
| ---------------- | ------ | -------------- | ----------------------- |
| `{rounded.none}` | 0px    | `rounded-none` | Reserved                |
| `{rounded.xs}`   | 4px    | `rounded-xs`   | Inline tags             |
| `{rounded.sm}`   | 6px    | `rounded-sm`   | Compact rows            |
| `{rounded.md}`   | 8px    | `rounded-md`   | Form inputs             |
| `{rounded.lg}`   | 12px   | `rounded-lg`   | Compact cards           |
| `{rounded.xl}`   | 16px   | `rounded-xl`   | Feature cards           |
| `{rounded.xxl}`  | 24px   | `rounded-2xl`  | Gradient orb cards      |
| `{rounded.pill}` | 9999px | `rounded-full` | All CTA buttons, badges |
| `{rounded.full}` | 9999px | `rounded-full` | Icon circles, avatars   |

## Components

Component specs live in [`components/`](components/), one file per component.
The `components` block in the front matter lists the reference shapes they
build on:

- **Buttons:** `button-primary`, `button-primary-active`, `button-outline`, `button-tertiary-text`.
- **Atmospheric:** `hero-band`, `gradient-orb-card`, `audio-waveform-card`.
- **Cards:** `feature-card`, `product-card-stack`, `testimonial-card`, `pricing-tier-card`, `pricing-tier-featured`.
- **Lists:** `list-row`, `icon-circular`.
- **Forms & tags:** `text-input` (1px `{colors.hairline-strong}` border; on focus the border becomes 2px ink), `badge-pill`.
- **Navigation & bands:** `top-nav`, `cta-band`, `footer`, `footer-link`.

## Do's and Don'ts

### Do

- Reserve `{colors.primary}` (ink pill) for primary CTAs.
- Use Newsreader at weight 300 for every display headline. Never bold.
- Use Inter at +0.15-0.18px tracking for body.
- Use gradient orbs (mint/peach/lavender/sky/rose) as decoration only.
- Use the pill shape for every CTA and badge.
- Use token classes (`bg-canvas`, `text-muted-foreground`, `text-body-md`) — never inline hex.

### Don't

- Don't introduce a saturated action colour. Ink pill is the only CTA colour.
- Don't bold display copy.
- Don't use gradient orbs as button fills, text colours, or component backgrounds.
- Don't use sharp `{rounded.none}` (0px) on CTAs.
- Don't drop body Inter to weight 300 — body stays at 400/500 for legibility.

## Responsive Behavior

### Breakpoints

| Name    | Width       | Key Changes                                                |
| ------- | ----------- | ---------------------------------------------------------- |
| Mobile  | < 640px     | Hero h1 64→32px; feature cards 1-up; gradient orbs shrink. |
| Tablet  | 640–1024px  | Hero h1 48px; feature cards 2-up.                          |
| Desktop | 1024–1280px | Full hero h1 64px; feature cards 3-up.                     |
| Wide    | > 1280px    | Content caps at 1200px.                                    |

### Touch Targets

- Primary pill at 40px height — WCAG AA.
- Icon circles 32px — padded row creates effective 48px tap zone.

### Collapsing Strategy

- Feature grid: 3-up → 2-up → 1-up.
- Gradient orbs reduce diameter at every breakpoint but never disappear.

## Iteration Guide

1. Focus on a single component at a time.
2. CTAs default to `{rounded.pill}`. Cards use `{rounded.xl}` (16px).
3. Variants live as separate entries.
4. Use token references everywhere — never inline hex.
5. Newsreader 300 for display, Inter 400/500 for body.
6. Gradient orbs scoped to atmospheric decoration.
7. Every new component or page ships with its doc in `components/` or `pages/`.

## Known Gaps

- Waldenburg is licensed; Newsreader is the substitute.
- Animation timings (orb drift, hero entrance) out of scope.
- Form validation states beyond focus and error are not specified yet.
