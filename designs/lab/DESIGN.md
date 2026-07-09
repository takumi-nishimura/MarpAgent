---
version: alpha
name: MarpAgent Lab
description: Research presentation design system for MarpAgent lab slides and A-series paper layouts.
colors:
  primary: "#202228"
  secondary: "#7F7F7F"
  tertiary: "#0969DA"
  neutral: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F6F8FA"
  on-primary: "#FFFFFF"
  on-surface: "#202228"
  accent-strong: "#D97706"
  emphasis: "#D1C600"
  muted-invert: "#AAAAAA"
  highlight-invert: "#FDBA74"
  table-border: "#999999"
  table-header: "#F0F0F0"
  table-stripe: "#FAFAFA"
  cursor-orange: "#FF5C31"
  cursor-glow: "rgba(255, 92, 49, 0.5)"
  note: "#316DCA"
  note-strong: "#3282EF"
  tip: "#347D39"
  tip-strong: "#009606"
  important: "#8256D0"
  important-strong: "#602FB6"
  warning: "#CC9D35"
  warning-strong: "#D78722"
  caution: "#C93C37"
  caution-strong: "#E5534B"
  red: "#FF5555"
  blue: "#3388FF"
  light-blue: "#61DBFB"
  green: "#2EAB7F"
  yellow: "#D1C600"
  orange: "#FF8800"
  cyan: "#00CCCC"
  pink: "#FF55AA"
  purple: "#673AB8"
  dracula-bg: "#282A36"
  dracula-fg: "#F8F8F2"
  dracula-muted: "#6272A4"
  dracula-highlight: "#BD93F9"
  dracula-emphasis: "#F1FA8C"
  dracula-strong: "#FF79C6"
  one-dark-bg: "#282C34"
  one-dark-fg: "#ABB2BF"
  one-dark-muted: "#5C6370"
  one-dark-highlight: "#61AFEF"
  one-dark-emphasis: "#E5C07B"
  one-dark-strong: "#E06C75"
  nord-bg: "#2E3440"
  nord-fg: "#ECEFF4"
  nord-muted: "#4C566A"
  nord-highlight: "#88C0D0"
  nord-emphasis: "#EBCB8B"
  nord-strong: "#BF616A"
  neogaia-dark-bg: "#455A64"
  neogaia-dark-fg: "#FFF8E1"
  neogaia-dark-muted: "#B0BEC5"
  neogaia-dark-highlight: "#D1E8FF"
  neogaia-dark-emphasis: "#FFFF66"
  neogaia-dark-strong: "#FFEB3B"
  neogaia-light-bg: "#FFF8E1"
  neogaia-light-fg: "#455A64"
  neogaia-light-muted: "#607D8B"
  neogaia-light-highlight: "#0288D1"
  neogaia-light-emphasis: "#BF8700"
  neogaia-light-strong: "#D97706"
  github-light-bg: "#FFFFFF"
  github-light-fg: "#24292F"
  github-light-muted: "#57606A"
  github-light-highlight: "#0969DA"
  github-light-emphasis: "#BF8700"
  github-light-strong: "#CF222E"
  code-inline-bg: "rgba(128, 128, 128, 0.2)"
  code-block-bg: "rgba(128, 128, 128, 0.15)"
  code-comment: "#6A737D"
  code-keyword: "#D73A49"
  code-string: "#032F62"
  code-number: "#005CC5"
  code-function: "#6F42C1"
  code-tag: "#22863A"
  code-builtin: "#E36209"
  code-meta: "#735C0F"
  code-deletion: "#B31D28"
  code-deletion-bg: "#FFEEF0"
  code-addition: "#22863A"
  code-addition-bg: "#F0FFF4"
  code-dark-comment: "#7F848E"
  code-dark-keyword: "#C678DD"
  code-dark-string: "#98C379"
  code-dark-number: "#D19A66"
  code-dark-function: "#61AFEF"
  code-dark-tag: "#E06C75"
  code-dark-builtin: "#E6C07B"
  code-dark-meta: "#56B6C2"
typography:
  display:
    fontFamily: Noto Sans JP
    fontSize: 65px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0em
  headline-lg:
    fontFamily: Noto Sans JP
    fontSize: 58.5px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: 0em
  headline-md:
    fontFamily: Noto Sans JP
    fontSize: 39px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0em
  body-md:
    fontFamily: Noto Sans JP
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0em
  body-sm:
    fontFamily: Noto Sans JP
    fontSize: 22.75px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: 0em
  caption:
    fontFamily: Noto Sans JP
    fontSize: 19.5px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0em
  label-md:
    fontFamily: Noto Sans JP
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  slide-x: 40px
  header-height: 60px
  logo-title-size: 80px
  logo-header-size: 50px
components:
  slide-canvas:
    backgroundColor: "{colors.neutral}"
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
    textColor: "{colors.on-surface}"
    typography: "{typography.display}"
  header-band:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    height: "{spacing.header-height}"
  summary-box:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    padding: 0.4em
  gap-box:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    padding: 0.3em
  feature-card:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.caption}"
    padding: 0.3em
  accent-marker:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.on-surface}"
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
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
  callout-tip-label:
    textColor: "{colors.tip-strong}"
    typography: "{typography.body-sm}"
  callout-important:
    backgroundColor: "{colors.important}"
    textColor: "{colors.on-primary}"
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
    textColor: "{colors.on-primary}"
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

# MarpAgent Lab Design

## Overview

MarpAgent Lab is a research-presentation design system for technical talks,
lab meetings, and A-series paper layouts. It should feel clear, precise, and scholarly
rather than decorative. Slides are optimized for repeated authoring by agents:
stable layout primitives, predictable density limits, and readable Japanese /
English mixed text matter more than expressive one-off styling.

The primary emotional target is "calm technical confidence". The theme should
support dense research content, but it should not reward shrinking text to fit
too much material onto one slide.

## Colors

The palette is neutral-first with a warm orange accent and restrained semantic
colors for callouts.

- **Primary (#202228):** near-black ink for body text, title rules, and
  high-contrast labels.
- **Secondary (#7F7F7F):** muted gray for metadata, captions, pagination, and
  non-essential labels.
- **Tertiary (#0969DA):** technical blue reserved for note-style highlights,
  links, and utility emphasis; it is not the default theme accent.
- **Neutral / Surface (#FFFFFF):** white canvas for projection and PDF export.
- **Surface muted (#F6F8FA):** subtle panel fill for summaries, feature cards,
  and compact explanatory blocks.
- **Accent strong (#D97706):** warm emphasis for accent markers and `strong`
  text. Header and title rules use a semi-transparent treatment of this color
  so they support structure without dominating the slide.

Utility colors preserve the existing lab theme vocabulary for inline emphasis:
red, blue, light-blue, green, yellow, orange, cyan, pink, and purple.

Callout colors follow familiar GitHub-style semantics: blue for notes, green
for tips, purple for important context, amber for warnings, and red for
cautions.

## Typography

Use **Noto Sans JP** for both Japanese and English to keep mixed technical text
stable across HTML, PDF, and screenshots. Japanese body text needs more air
than Latin-only UI text, so dense slides should be split before type is reduced
below the caption scale.

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
40px, with a 60px full-bleed header on non-title slides. Layout should be
stable under live preview, PDF export, and thumbnail overview rendering.

Use built-in layout primitives before adding scoped CSS:

- `.col` for two or more columns.
- `.centered` for agenda and closing slides.
- `.summary-box` for a short fit-to-content takeaway.
- `.fill`, `.place-*`, `.self-*`, and `.box` for placement without scoped CSS.
- `.col.with-summary` and `.gap-box` for compact column comparison.
- `.feature-grid` for 2xN compact cards.
- `.col.visual` for figure/text or before/after slides with stable visual ratios.
- `.metric-grid` for compact evidence, KPI, or result tiles.
- `.timeline` for process and step sequences; `ol` adds simple numeric markers.

Deck-specific visual adjustment should prefer frontmatter CSS variables and
theme variants. One-off scoped CSS is a last resort.

## Elevation & Depth

Depth is intentionally flat. Visual hierarchy comes from type scale, spacing,
header rules, muted surfaces, and callout color rather than shadows. Avoid
decorative depth, floating cards, and heavy gradients in normal research slides.

## Shapes

The current lab slide system is mostly square and utilitarian. Use `0px` to
`4px` radius for panels and callouts unless a component already defines a
stronger shape. Rounded shapes should not become a visual motif.

## Components

Components are author-facing class contracts. A component should be available
from the theme before skills recommend it in generated slides.

- **Header band:** establishes slide context and carries logos without affecting
  content layout.
- **Summary box:** one concise takeaway or action statement.
- **Placement utilities:** `fill` lets a body-level layout use the remaining
  slide body height above the footer safe area. `place-top`, `place-middle`,
  `place-bottom`, `place-spread`, `place-left`, `place-center`, and
  `place-right` place content inside `.col > div` or `.box`. `self-start`,
  `self-center`, and `self-end` place fit-to-content components themselves.
- **Summary columns:** `.col.with-summary` creates balanced comparison columns
  with a per-column conclusion box.
- **Feature grid:** compact repeated cards. Keep each card short; do not use it
  to hide long prose at caption size.
- **Visual column:** the standard `.col` layout with the `visual` modifier for
  media + interpretation. Prefer the CSS variables `--visual-left`,
  `--visual-right`, and `--visual-gap` over scoped
  CSS when adjusting proportions.
- **Metric grid:** short quantitative cards. Each card should contain one
  visible number or label and one short interpretation line.
- **Timeline:** horizontal steps for process or chronology, with directional
  arrows between cards. Keep each step to one short sentence; split the slide if
  the sequence needs explanation.
- **Callouts:** use note, tip, important, warning, and caution semantics.
  Callout body text still counts as body text for density checks.
- **Figures and Mermaid diagrams:** size the rendered container, not only SVG
  text. Diagrams must remain readable in PDF export.

## Do's and Don'ts

- Do split slides when a message needs more space.
- Do keep Japanese and English mixed text in the same font family unless a deck
  explicitly introduces a vetted secondary font.
- Do keep `.text-xs` for captions, dense table labels, and fine print only.
- Do use color to clarify hierarchy, not to decorate.
- Don't introduce deck-local reusable CSS when a theme component should exist.
- Don't use `.text-xs2`, `.text-xs3`, `<small>`, or tiny inline font sizes as
  authoring escapes.
- Don't let DESIGN.md prose become Tailwind class detection input.
