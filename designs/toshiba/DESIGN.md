---
version: alpha
name: Toshiba
description: Toshiba presentation design system for MarpAgent slides and A-series paper layouts.
colors:
  primary: "#000000"
  secondary: "#505054"
  tertiary: "#0064D2"
  neutral: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F7F9FA"
  on-primary: "#FFFFFF"
  on-surface: "#000000"
  accent-strong: "#E61E1E"
  emphasis: "#E61E1E"
  muted-invert: "#D8D8D8"
  highlight-invert: "#64AFE1"
  table-border: "#D8D8D8"
  table-header: "#F7F9FA"
  table-stripe: "#FFFFFF"
  cursor-orange: "#E61E1E"
  cursor-glow: "rgba(230, 30, 30, 0.35)"
  note: "#0064D2"
  note-strong: "#265C80"
  tip: "#347D39"
  tip-strong: "#009606"
  important: "#505054"
  important-strong: "#000000"
  warning: "#FAD737"
  warning-strong: "#CC9D35"
  caution: "#E61E1E"
  caution-strong: "#C93C37"
  red: "#E61E1E"
  blue: "#0064D2"
  light-blue: "#64AFE1"
  green: "#2EAB7F"
  yellow: "#FAD737"
  orange: "#FA9628"
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
  code-keyword: "#E61E1E"
  code-string: "#265C80"
  code-number: "#0064D2"
  code-function: "#6F42C1"
  code-tag: "#22863A"
  code-builtin: "#FA9628"
  code-meta: "#505054"
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
    fontSize: 72px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: 0em
  headline-lg:
    fontFamily: Noto Sans JP
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: 0em
  headline-md:
    fontFamily: Noto Sans JP
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0em
  body-md:
    fontFamily: Noto Sans JP
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.45
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
  sm: 2px
  md: 4px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  slide-x: 56px
  header-height: 64px
  header-title-inset: 10px
  header-group-left-shift: 20px
  accent-bar-width: 6px
  accent-bar-height: 28px
  line-width: 1px
  title-heading-top: 150px
  title-heading-inset: 24px
  title-subtitle-top: 44px
  title-copy-width: 760px
  title-stripe-start: 70%
  title-stripe-light-end: 78%
  title-stripe-blue-end: 86%
  title-stripe-red-end: 94%
  content-top-gap: 82px
  logo-title-size: 80px
  logo-header-size: 44px
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
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
  emphasis-marker:
    backgroundColor: "{colors.emphasis}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  strong-emphasis:
    textColor: "{colors.on-surface}"
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

# Toshiba Design

## Overview

This theme adapts the visual system of the
[Toshiba corporate website](https://www.global.toshiba/jp/top.html) for
research, engineering, and corporate presentation use. It is an adaptation of
the source hierarchy rather than a page replica: a white canvas, forceful black
headlines, a short Toshiba-red signal, blue action cues, pale-gray information
surfaces, and decisive diagonal geometry.

The emotional target is "clear infrastructure confidence". Slides should feel
precise, public-facing, and forward-looking while leaving enough white space
for technical figures and Japanese text. Brand geometry belongs on title and
section-transition moments; evidence slides remain quiet so the content stays
primary.

External website images and logos are not bundled into the theme. Deck authors
may supply approved deck-local assets through the existing logo variables.

## Colors

The palette follows the current website CSS and logo asset.

- **Brand red (#E61E1E):** the Toshiba wordmark color, the short structural
  marker beside section headings, and a pale marker for short inline emphasis.
  Use it for identity and caution, not for paragraphs or large background
  fields.
- **Action blue (#0064D2):** links, buttons, process direction, and note-style
  information. It is the interaction color rather than the brand signature.
- **Ink (#000000):** high-contrast headlines and body copy.
- **Ink muted (#505054):** metadata, captions, pagination, and secondary copy.
- **Neutral / Surface (#FFFFFF):** white canvas for projection and PDF export.
- **Panel (#F7F9FA):** quiet section bands, summary boxes, tables, and compact
  cards.
- **Line (#D8D8D8):** separators and table borders.
- **Sky blue (#64AFE1) and signal yellow (#FAD737):** supporting colors for
  source-inspired diagrams and restrained title geometry.

Compatibility colors preserve MarpAgent's shared utility, code, and optional
color-scheme contracts. They are secondary to the core red / blue / black /
white system.

Callouts use blue for notes, green for tips, neutral ink for important context,
yellow for warnings, and Toshiba red for cautions.

## Typography

The source site uses an Arial / Helvetica-led stack with Meiryo and Hiragino for
Japanese. The theme adapts that neutral grotesk tone to **Noto Sans JP** so
mixed Japanese and English remain stable across HTML, PDF, and screenshots.
Headlines use weight 700 and generous scale; body text stays at weight 400.

The author-facing scale maps to existing MarpAgent utilities:

- `display` maps to title-slide headings.
- `headline-lg` maps to `.text-xl4` / top-level slide headings.
- `headline-md` maps to `.text-xl2`.
- `body-md` is the base slide text.
- `body-sm` maps to `.text-sm`.
- `caption` maps to `.text-xs`, the smallest supported authoring size.

Letter spacing remains `0em`. Do not simulate the TOSHIBA wordmark with tracked
body text. Japanese line breaking is handled by BudouX; use `.nobr` only for
short phrases that must remain unbroken.

## Layout

The slide canvas is fixed at **1280 x 720**. The horizontal safe area is 56px,
with a 64px full-bleed header on non-title slides. The extra inset mirrors the
website's broad content gutters and gives technical figures room to breathe.

Title slides use asymmetry: a left-aligned text block and three cropped
diagonal stripes—pale blue, action blue, and brand red—on the right. Normal
slides return to a white field, a fine gray header separator, and one short red
vertical marker. Do not repeat the title geometry behind charts or dense
content.

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
theme variants. Logos and photography must be deck-local and explicitly
approved; one-off scoped CSS is a last resort.

## Elevation & Depth

Depth is intentionally flat. Visual hierarchy comes from scale, spacing, thin
rules, pale surfaces, and image crops rather than shadows. The title's diagonal
stripes are hard-edged, not glossy. Avoid floating cards, soft drop shadows, and
decorative gradients.

## Shapes

Use square corners by default and 2px to 4px radii only for compact controls or
callouts. Large cards, figures, tables, and image crops remain rectilinear.
Diagonals are reserved for title-page color stripes and source-inspired visual
transitions.

## Components

Components are author-facing class contracts. A component should be available
from the theme before skills recommend it in generated slides.

- **Title composition:** a left-aligned black headline with equal-width pale
  blue, action-blue, and brand-red diagonal stripes cropped at the right edge.
  It creates identity without an external logo dependency.
- **Header band:** white, separated by a fine gray rule, with one short red
  vertical marker before the context label. Logos may occupy the existing
  right-side logo area.
- **Summary box:** one concise takeaway on a pale-gray surface with a red left
  edge.
- **Placement utilities:** `fill` lets a body-level layout use the remaining
  slide body height above the footer safe area. `place-top`, `place-middle`,
  `place-bottom`, `place-spread`, `place-left`, `place-center`, and
  `place-right` place content inside `.col > div` or `.box`. `self-start`,
  `self-center`, and `self-end` place fit-to-content components themselves.
- **Summary columns:** `.col.with-summary` creates balanced comparison columns
  with a per-column conclusion box.
- **Feature grid:** compact white or pale-gray cards with fine gray boundaries.
  Keep each card short; do not use it to hide long prose at caption size.
- **Visual column:** the standard `.col` layout with the `visual` modifier for
  media + interpretation. Prefer the CSS variables `--visual-left`,
  `--visual-right`, and `--visual-gap` over scoped
  CSS when adjusting proportions.
- **Metric grid:** short quantitative cards. Each card should contain one
  visible number or label and one short interpretation line.
- **Timeline:** horizontal steps for process or chronology. Use blue for
  direction and reserve red for a selected or cautionary step. Keep each step
  to one short sentence.
- **Callouts:** use note, tip, important, warning, and caution semantics.
  Callout body text still counts as body text for density checks.
- **Figures and Mermaid diagrams:** size the rendered container, not only SVG
  text. Diagrams must remain readable in PDF export.

## Do's and Don'ts

- Do use one clear headline and one dominant figure or evidence group per slide.
- Do preserve broad white space and strong black type.
- Do use blue for navigation, linkage, and process; use red for identity,
  section markers, caution, and short inline emphasis.
- Do keep Japanese and English mixed text in Noto Sans JP unless a deck
  explicitly introduces a vetted secondary font.
- Do keep `.text-xs` for captions, dense table labels, and fine print only.
- Do keep title-page diagonal geometry cropped and subordinate to the headline.
- Don't place long text in brand red or action blue.
- Don't add shadows, glass effects, rounded card stacks, or soft gradients.
- Don't repeat the title geometry on every evidence slide.
- Don't introduce deck-local reusable CSS when a theme component should exist.
- Don't use `.text-xs2`, `.text-xs3`, `<small>`, or tiny inline font sizes as
  authoring escapes.
- Don't let DESIGN.md prose become Tailwind class detection input.
