---
version: alpha
name: BIL
description: Body Integration Learning presentation design system for MarpAgent slides and A-series paper layouts.
colors:
  primary: "#31384B"
  secondary: "#657083"
  tertiary: "#4726FF"
  neutral: "#D9DCDE"
  surface: "#FFFFFF"
  surface-muted: "#EEF1F3"
  on-primary: "#FFFFFF"
  on-surface: "#282B57"
  accent-strong: "#4726FF"
  emphasis: "#5FFF99"
  muted-invert: "#C7CDD4"
  highlight-invert: "#5FFF99"
  table-border: "#C8CDD2"
  table-header: "#EEF1F3"
  table-stripe: "#F7F9FA"
  cursor-orange: "#4726FF"
  cursor-glow: "rgba(71, 38, 255, 0.35)"
  bil-violet: "#4726FF"
  bil-logo-blue: "#2700FF"
  bil-green: "#5FFF99"
  bil-navy: "#31384B"
  bil-midnight: "#151B33"
  bil-gray: "#D9DCDE"
  bil-ink: "#282B57"
  bil-line: "#C8CDD2"
  note: "#4726FF"
  note-strong: "#2700FF"
  tip: "#5FFF99"
  tip-strong: "#31384B"
  important: "#9A90FF"
  important-strong: "#4726FF"
  warning: "#5FFF99"
  warning-strong: "#31384B"
  caution: "#FFE7DE"
  caution-strong: "#B33018"
  red: "#B33018"
  blue: "#4726FF"
  light-blue: "#8A7DFF"
  green: "#5FFF99"
  yellow: "#E5FF5F"
  orange: "#FF8A3D"
  cyan: "#62D8FF"
  pink: "#FF7BD9"
  purple: "#4726FF"
  dracula-bg: "#151B33"
  dracula-fg: "#FFFFFF"
  dracula-muted: "#C7CDD4"
  dracula-highlight: "#5FFF99"
  dracula-emphasis: "#8A7DFF"
  dracula-strong: "#FF7BD9"
  one-dark-bg: "#151B33"
  one-dark-fg: "#FFFFFF"
  one-dark-muted: "#C7CDD4"
  one-dark-highlight: "#62D8FF"
  one-dark-emphasis: "#5FFF99"
  one-dark-strong: "#FF8A3D"
  nord-bg: "#31384B"
  nord-fg: "#FFFFFF"
  nord-muted: "#C7CDD4"
  nord-highlight: "#8A7DFF"
  nord-emphasis: "#5FFF99"
  nord-strong: "#FF5C31"
  neogaia-dark-bg: "#31384B"
  neogaia-dark-fg: "#FFFFFF"
  neogaia-dark-muted: "#C7CDD4"
  neogaia-dark-highlight: "#5FFF99"
  neogaia-dark-emphasis: "#8A7DFF"
  neogaia-dark-strong: "#FF7BD9"
  neogaia-light-bg: "#D9DCDE"
  neogaia-light-fg: "#282B57"
  neogaia-light-muted: "#657083"
  neogaia-light-highlight: "#4726FF"
  neogaia-light-emphasis: "#5FFF99"
  neogaia-light-strong: "#31384B"
  github-light-bg: "#FFFFFF"
  github-light-fg: "#282B57"
  github-light-muted: "#657083"
  github-light-highlight: "#4726FF"
  github-light-emphasis: "#5FFF99"
  github-light-strong: "#FF5C31"
  code-inline-bg: "rgba(71, 38, 255, 0.12)"
  code-block-bg: "#EEF1F3"
  code-comment: "#657083"
  code-keyword: "#4726FF"
  code-string: "#31384B"
  code-number: "#2700FF"
  code-function: "#282B57"
  code-tag: "#4726FF"
  code-builtin: "#31384B"
  code-meta: "#657083"
  code-deletion: "#B33018"
  code-deletion-bg: "#FFE7DE"
  code-addition: "#31384B"
  code-addition-bg: "#D9FFE7"
  code-dark-comment: "#C7CDD4"
  code-dark-keyword: "#8A7DFF"
  code-dark-string: "#5FFF99"
  code-dark-number: "#62D8FF"
  code-dark-function: "#FFFFFF"
  code-dark-tag: "#FF7BD9"
  code-dark-builtin: "#E5FF5F"
  code-dark-meta: "#C7CDD4"
typography:
  display:
    fontFamily: Euclid
    fontSize: 58px
    fontWeight: 400
    lineHeight: 1.18
    letterSpacing: 0em
  headline-lg:
    fontFamily: Euclid
    fontSize: 44px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0em
  headline-md:
    fontFamily: Euclid
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0em
  body-md:
    fontFamily: Euclid
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  body-sm:
    fontFamily: Euclid
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  caption:
    fontFamily: Euclid
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  label-md:
    fontFamily: Euclid
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0em
rounded:
  none: 0px
  sm: 4px
  md: 40px
  full: 9999px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  slide-x: 56px
  header-height: 80px
  footer-height: 40px
  header-title-inset: 0px
  logo-title-size: 72px
  logo-header-size: 54px
components:
  slide-canvas:
    backgroundColor: "{colors.bil-gray}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    width: 1280px
    height: 720px
    padding: "{spacing.slide-x}"
  content-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  title-heading:
    textColor: "{colors.bil-violet}"
    typography: "{typography.display}"
  slide-header:
    backgroundColor: "{colors.bil-gray}"
    textColor: "{colors.bil-ink}"
    typography: "{typography.body-md}"
    height: "{spacing.header-height}"
    padding: "{spacing.header-title-inset}"
  summary-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    padding: 0.8em
  gap-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    padding: 0.7em
  feature-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.caption}"
    padding: 0.7em
  context-panel:
    backgroundColor: "{colors.bil-navy}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    padding: "{spacing.lg}"
  accent-marker:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
  emphasis-marker:
    backgroundColor: "{colors.emphasis}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  strong-emphasis:
    textColor: "{colors.accent-strong}"
    typography: "{typography.body-sm}"
  inverted-muted-text:
    textColor: "{colors.muted-invert}"
    typography: "{typography.caption}"
  inverted-highlight:
    backgroundColor: "{colors.highlight-invert}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  table-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  table-border:
    backgroundColor: "{colors.table-border}"
  table-header:
    backgroundColor: "{colors.table-header}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  table-stripe:
    backgroundColor: "{colors.table-stripe}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  token-neutral:
    backgroundColor: "{colors.neutral}"
  token-surface-muted:
    backgroundColor: "{colors.surface-muted}"
  token-bil-logo-blue:
    backgroundColor: "{colors.bil-logo-blue}"
  token-bil-green:
    backgroundColor: "{colors.bil-green}"
  token-bil-midnight:
    backgroundColor: "{colors.bil-midnight}"
  token-bil-ink:
    textColor: "{colors.bil-ink}"
    typography: "{typography.body-sm}"
  token-bil-line:
    backgroundColor: "{colors.bil-line}"
  presenter-cursor:
    backgroundColor: "{colors.cursor-orange}"
    typography: "{typography.body-sm}"
  presenter-cursor-glow:
    backgroundColor: "{colors.cursor-glow}"
    typography: "{typography.body-sm}"
  callout-note:
    backgroundColor: "{colors.note}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
  callout-note-label:
    textColor: "{colors.note-strong}"
    typography: "{typography.body-sm}"
  callout-tip:
    backgroundColor: "{colors.tip}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  callout-tip-label:
    textColor: "{colors.tip-strong}"
    typography: "{typography.body-sm}"
  callout-important:
    backgroundColor: "{colors.important}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  callout-important-label:
    textColor: "{colors.important-strong}"
    typography: "{typography.body-sm}"
  callout-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  callout-warning-label:
    textColor: "{colors.warning-strong}"
    typography: "{typography.body-sm}"
  callout-caution:
    backgroundColor: "{colors.caution}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  callout-caution-label:
    textColor: "{colors.caution-strong}"
    typography: "{typography.body-sm}"
  metadata-label:
    textColor: "{colors.secondary}"
    typography: "{typography.caption}"
  utility-red:
    textColor: "{colors.red}"
    typography: "{typography.body-sm}"
  utility-blue:
    textColor: "{colors.blue}"
    typography: "{typography.body-sm}"
  utility-light-blue:
    textColor: "{colors.light-blue}"
    typography: "{typography.body-sm}"
  utility-green:
    textColor: "{colors.green}"
    typography: "{typography.body-sm}"
  utility-yellow:
    textColor: "{colors.yellow}"
    typography: "{typography.body-sm}"
  utility-orange:
    textColor: "{colors.orange}"
    typography: "{typography.body-sm}"
  utility-cyan:
    textColor: "{colors.cyan}"
    typography: "{typography.body-sm}"
  utility-pink:
    textColor: "{colors.pink}"
    typography: "{typography.body-sm}"
  utility-purple:
    textColor: "{colors.purple}"
    typography: "{typography.body-sm}"
  scheme-dracula-bg:
    backgroundColor: "{colors.dracula-bg}"
  scheme-dracula-fg:
    textColor: "{colors.dracula-fg}"
    typography: "{typography.body-sm}"
  scheme-dracula-muted:
    textColor: "{colors.dracula-muted}"
    typography: "{typography.caption}"
  scheme-dracula-highlight:
    backgroundColor: "{colors.dracula-highlight}"
  scheme-dracula-emphasis:
    backgroundColor: "{colors.dracula-emphasis}"
  scheme-dracula-strong:
    textColor: "{colors.dracula-strong}"
    typography: "{typography.body-sm}"
  scheme-one-dark-bg:
    backgroundColor: "{colors.one-dark-bg}"
  scheme-one-dark-fg:
    textColor: "{colors.one-dark-fg}"
    typography: "{typography.body-sm}"
  scheme-one-dark-muted:
    textColor: "{colors.one-dark-muted}"
    typography: "{typography.caption}"
  scheme-one-dark-highlight:
    backgroundColor: "{colors.one-dark-highlight}"
  scheme-one-dark-emphasis:
    backgroundColor: "{colors.one-dark-emphasis}"
  scheme-one-dark-strong:
    textColor: "{colors.one-dark-strong}"
    typography: "{typography.body-sm}"
  scheme-nord-bg:
    backgroundColor: "{colors.nord-bg}"
  scheme-nord-fg:
    textColor: "{colors.nord-fg}"
    typography: "{typography.body-sm}"
  scheme-nord-muted:
    textColor: "{colors.nord-muted}"
    typography: "{typography.caption}"
  scheme-nord-highlight:
    backgroundColor: "{colors.nord-highlight}"
  scheme-nord-emphasis:
    backgroundColor: "{colors.nord-emphasis}"
  scheme-nord-strong:
    textColor: "{colors.nord-strong}"
    typography: "{typography.body-sm}"
  scheme-neogaia-dark-bg:
    backgroundColor: "{colors.neogaia-dark-bg}"
  scheme-neogaia-dark-fg:
    textColor: "{colors.neogaia-dark-fg}"
    typography: "{typography.body-sm}"
  scheme-neogaia-dark-muted:
    textColor: "{colors.neogaia-dark-muted}"
    typography: "{typography.caption}"
  scheme-neogaia-dark-highlight:
    backgroundColor: "{colors.neogaia-dark-highlight}"
  scheme-neogaia-dark-emphasis:
    backgroundColor: "{colors.neogaia-dark-emphasis}"
  scheme-neogaia-dark-strong:
    textColor: "{colors.neogaia-dark-strong}"
    typography: "{typography.body-sm}"
  scheme-neogaia-light-bg:
    backgroundColor: "{colors.neogaia-light-bg}"
  scheme-neogaia-light-fg:
    textColor: "{colors.neogaia-light-fg}"
    typography: "{typography.body-sm}"
  scheme-neogaia-light-muted:
    textColor: "{colors.neogaia-light-muted}"
    typography: "{typography.caption}"
  scheme-neogaia-light-highlight:
    backgroundColor: "{colors.neogaia-light-highlight}"
  scheme-neogaia-light-emphasis:
    backgroundColor: "{colors.neogaia-light-emphasis}"
  scheme-neogaia-light-strong:
    textColor: "{colors.neogaia-light-strong}"
    typography: "{typography.body-sm}"
  scheme-github-light-bg:
    backgroundColor: "{colors.github-light-bg}"
  scheme-github-light-fg:
    textColor: "{colors.github-light-fg}"
    typography: "{typography.body-sm}"
  scheme-github-light-muted:
    textColor: "{colors.github-light-muted}"
    typography: "{typography.caption}"
  scheme-github-light-highlight:
    backgroundColor: "{colors.github-light-highlight}"
  scheme-github-light-emphasis:
    backgroundColor: "{colors.github-light-emphasis}"
  scheme-github-light-strong:
    textColor: "{colors.github-light-strong}"
    typography: "{typography.body-sm}"
  code-inline-bg:
    backgroundColor: "{colors.code-inline-bg}"
  code-block-bg:
    backgroundColor: "{colors.code-block-bg}"
  code-comment:
    textColor: "{colors.code-comment}"
    typography: "{typography.body-sm}"
  code-keyword:
    textColor: "{colors.code-keyword}"
    typography: "{typography.body-sm}"
  code-string:
    textColor: "{colors.code-string}"
    typography: "{typography.body-sm}"
  code-number:
    textColor: "{colors.code-number}"
    typography: "{typography.body-sm}"
  code-function:
    textColor: "{colors.code-function}"
    typography: "{typography.body-sm}"
  code-tag:
    textColor: "{colors.code-tag}"
    typography: "{typography.body-sm}"
  code-builtin:
    textColor: "{colors.code-builtin}"
    typography: "{typography.body-sm}"
  code-meta:
    textColor: "{colors.code-meta}"
    typography: "{typography.body-sm}"
  code-deletion:
    backgroundColor: "{colors.code-deletion-bg}"
    textColor: "{colors.code-deletion}"
    typography: "{typography.body-sm}"
  code-addition:
    textColor: "{colors.code-addition}"
    typography: "{typography.body-sm}"
  code-addition-bg:
    backgroundColor: "{colors.code-addition-bg}"
  code-dark-comment:
    textColor: "{colors.code-dark-comment}"
    typography: "{typography.body-sm}"
  code-dark-keyword:
    textColor: "{colors.code-dark-keyword}"
    typography: "{typography.body-sm}"
  code-dark-string:
    textColor: "{colors.code-dark-string}"
    typography: "{typography.body-sm}"
  code-dark-number:
    textColor: "{colors.code-dark-number}"
    typography: "{typography.body-sm}"
  code-dark-function:
    textColor: "{colors.code-dark-function}"
    typography: "{typography.body-sm}"
  code-dark-tag:
    textColor: "{colors.code-dark-tag}"
    typography: "{typography.body-sm}"
  code-dark-builtin:
    textColor: "{colors.code-dark-builtin}"
    typography: "{typography.body-sm}"
  code-dark-meta:
    textColor: "{colors.code-dark-meta}"
    typography: "{typography.body-sm}"
---

# BIL Design

## Overview

Source: https://bodyintegration-learning.org/.

BIL adapts the Body Integration Learning Project website into a MarpAgent
theme for research slides and A-series paper layouts. It should feel open,
kinetic, and technical: a soft gray canvas, large blue-violet headings, dark
navy content panels, white pill controls, and a bright green secondary accent.
This is an unofficial inspired theme, so it does not reproduce the project's
logo or main visual by default.

The design is suitable for human-AI interaction, robotics, haptics, and project
overview decks where the material should feel like a living research program
rather than a conventional academic template. Keep the token schema complete so
shared slide and A-series paper components continue to compile.

## Colors

The palette is inspired by the Body Integration Learning website and logo.

- **BIL gray (#D9DCDE):** default page canvas, matching the website's quiet
  background.
- **BIL ink (#282B57):** main reading color for Japanese and English text.
- **BIL navy (#31384B):** dark rounded panels and high-contrast context blocks.
- **BIL midnight (#151B33):** deepest footer-like surface for inverted slides.
- **BIL violet (#4726FF):** primary accent for title headings, links, buttons,
  and focus markers.
- **BIL logo blue (#2700FF):** sharper logo accent, used sparingly.
- **BIL green (#5FFF99):** secondary accent for success, tips, and hover-like
  emphasis.
- **Surface (#FFFFFF):** cards and pill-shaped content surfaces.

Utility colors preserve MarpAgent's shared theme vocabulary for inline emphasis:
red, blue, light-blue, green, yellow, orange, cyan, pink, and purple.

Callout colors stay semantic but are recolored into the BIL palette: violet for
notes, translucent green for tips and warnings, brighter translucent violet for
important context, and warm orange for cautions.

## Typography

Use **Euclid** for the project's geometric English voice, with **Noto Sans JP**
provided by the theme CSS as the Japanese fallback. The website uses light,
open English headlines and medium-weight Japanese labels; slides should
preserve that airiness without relying on hand-tuned letter spacing.

The author-facing scale maps to existing MarpAgent utilities:

- `display` maps to title-slide headings.
- `headline-lg` maps to `.text-xl4` / top-level slide headings.
- `headline-md` maps to `.text-xl2`.
- `body-md` is the base slide text.
- `body-sm` maps to `.text-sm`.
- `caption` maps to `.text-xs`, the smallest supported authoring size.

Letter spacing remains `0em`. Do not add negative tracking. Japanese line
breaking is handled by BudouX; use `.nobr` only for short phrases that must
remain unbroken.

## Layout

The slide canvas is fixed at **1280 x 720**. The default horizontal safe area is
56px. Non-title slides reserve an 80px gray project header, vertically center the
header label within that band, then place the white content surface from the
header baseline to a 40px gray footer strip. Layout should be stable under live
preview, PDF export, and thumbnail overview rendering.

Use built-in layout primitives before adding scoped CSS:

- `.col` for two-column layouts.
- `.centered` for agenda and closing slides.
- `.summary-box` for a short takeaway.
- `.gap-cols` and `.gap-box` for compact three-column comparison.
- `.feature-grid` for 2xN compact cards.

Deck-specific visual adjustment should prefer frontmatter CSS variables and
theme variants. One-off scoped CSS is a last resort.

Official-looking assets stay opt-in. Use `.bil-logo` only when the deck provides
`--logos-dark`; the provided logo sits in the upper-right header area and leaves
the left header label alignment unchanged. Use `.bil-visual` only when the deck
provides `--bil-main-visual`.

## Elevation & Depth

Depth is flat but spatial. Visual hierarchy comes from scale, generous negative
space, dark rounded panels, white surfaces, and bright accent color rather than
shadows. Avoid decorative drop shadows; use the navy panel or white pill
surface when content needs containment.

## Shapes

Rounded shapes are a first-class motif. Use full pills for compact controls and
large 40px radii for panels, callouts, and cards. Keep tables and code blocks
more restrained so technical content remains easy to scan.

## Components

Components are author-facing class contracts. A component should be available
from the theme before skills recommend it in generated slides.

- **Slide header:** gray project header with a 24px section label centered
  between the page top and white content surface, aligned away from the page
  edge. The BIL mark is opt-in via `.bil-logo` and appears in the upper-right
  header corner.
- **Summary box:** white pill-like surface for one concise takeaway or action
  statement.
- **Context panel:** navy rounded surface for short project framing blocks that
  need high contrast.
- **Gap columns:** three balanced comparison columns with a per-column
  conclusion box.
- **Feature grid:** compact repeated cards. Keep each card short; do not use it
  to hide long prose at caption size.
- **Callouts:** use note, tip, important, warning, and caution semantics.
  Callout body text still counts as body text for density checks.
- **Figures and Mermaid diagrams:** size the rendered container, not only SVG
  text. Diagrams must remain readable in PDF export.

## Do's and Don'ts

- Do split slides when a message needs more space.
- Do keep Japanese and English mixed text in the same font family unless a deck
  explicitly introduces a vetted secondary font.
- Do keep `.text-xs` for captions, dense table labels, and fine print only.
- Do use violet for primary emphasis and green for secondary emphasis.
- Do use large rounded surfaces for project-level framing slides.
- Don't introduce deck-local reusable CSS when a theme component should exist.
- Don't overuse the green accent; it should feel like a signal, not a field.
- Don't use `.text-xs2`, `.text-xs3`, `<small>`, or tiny inline font sizes as
  authoring escapes.
- Don't let DESIGN.md prose become Tailwind class detection input.
