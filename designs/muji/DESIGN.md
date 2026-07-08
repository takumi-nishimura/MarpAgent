---
version: alpha
name: MUJI
description: Minimal, unadorned presentation design based on MUJI network store visual rules.
colors:
  primary: "#3C3C43"
  secondary: "#6D6D72"
  tertiary: "#7F0019"
  neutral: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F5F5F5"
  on-primary: "#FFFFFF"
  on-surface: "#3C3C43"
  accent-strong: "#7F0019"
  emphasis: "#F4EEDE"
  muted-invert: "#C4C4C6"
  highlight-invert: "#E0CEAA"
  table-border: "#D8D8D9"
  table-header: "#F5F5F5"
  table-stripe: "#FFFFFF"
  cursor-orange: "#7F0019"
  cursor-glow: "rgba(127, 0, 25, 0.35)"
  muji-red: "#7F0019"
  red: "#DD0C14"
  kinari: "#F4EEDE"
  beige: "#E0CEAA"
  text-primary: "#3C3C43"
  text-secondary: "#6D6D72"
  text-tertiary: "#76767B"
  text-disabled: "#9D9DA0"
  border: "#D8D8D9"
  border-light: "#EBEBEC"
  background: "#FFFFFF"
  background-secondary: "#F5F5F5"
  gray-800: "#3C3C43"
  gray-700: "#6D6D72"
  gray-600: "#76767B"
  gray-500: "#9D9DA0"
  gray-400: "#C4C4C6"
  gray-300: "#D8D8D9"
  gray-200: "#EBEBEC"
  gray-100: "#F5F5F5"
  note: "#6D6D72"
  note-strong: "#3C3C43"
  tip: "#E0CEAA"
  tip-strong: "#7F0019"
  important: "#7F0019"
  important-strong: "#7F0019"
  warning: "#E0CEAA"
  warning-strong: "#7F0019"
  caution: "#DD0C14"
  caution-strong: "#DD0C14"
  blue: "#6D6D72"
  light-blue: "#9D9DA0"
  green: "#6D6D72"
  yellow: "#E0CEAA"
  orange: "#7F0019"
  cyan: "#76767B"
  pink: "#7F0019"
  purple: "#6D6D72"
  dracula-bg: "#3C3C43"
  dracula-fg: "#FFFFFF"
  dracula-muted: "#C4C4C6"
  dracula-highlight: "#E0CEAA"
  dracula-emphasis: "#F4EEDE"
  dracula-strong: "#DD0C14"
  one-dark-bg: "#3C3C43"
  one-dark-fg: "#FFFFFF"
  one-dark-muted: "#C4C4C6"
  one-dark-highlight: "#E0CEAA"
  one-dark-emphasis: "#F4EEDE"
  one-dark-strong: "#DD0C14"
  nord-bg: "#3C3C43"
  nord-fg: "#FFFFFF"
  nord-muted: "#C4C4C6"
  nord-highlight: "#E0CEAA"
  nord-emphasis: "#F4EEDE"
  nord-strong: "#DD0C14"
  neogaia-dark-bg: "#3C3C43"
  neogaia-dark-fg: "#F4EEDE"
  neogaia-dark-muted: "#C4C4C6"
  neogaia-dark-highlight: "#E0CEAA"
  neogaia-dark-emphasis: "#F4EEDE"
  neogaia-dark-strong: "#DD0C14"
  neogaia-light-bg: "#F4EEDE"
  neogaia-light-fg: "#3C3C43"
  neogaia-light-muted: "#6D6D72"
  neogaia-light-highlight: "#7F0019"
  neogaia-light-emphasis: "#E0CEAA"
  neogaia-light-strong: "#DD0C14"
  github-light-bg: "#FFFFFF"
  github-light-fg: "#3C3C43"
  github-light-muted: "#6D6D72"
  github-light-highlight: "#7F0019"
  github-light-emphasis: "#E0CEAA"
  github-light-strong: "#DD0C14"
  code-inline-bg: "rgba(216, 216, 217, 0.45)"
  code-block-bg: "#F5F5F5"
  code-comment: "#76767B"
  code-keyword: "#7F0019"
  code-string: "#3C3C43"
  code-number: "#7F0019"
  code-function: "#3C3C43"
  code-tag: "#7F0019"
  code-builtin: "#3C3C43"
  code-meta: "#6D6D72"
  code-deletion: "#DD0C14"
  code-deletion-bg: "#F4EEDE"
  code-addition: "#3C3C43"
  code-addition-bg: "#F5F5F5"
  code-dark-comment: "#C4C4C6"
  code-dark-keyword: "#E0CEAA"
  code-dark-string: "#FFFFFF"
  code-dark-number: "#E0CEAA"
  code-dark-function: "#FFFFFF"
  code-dark-tag: "#E0CEAA"
  code-dark-builtin: "#FFFFFF"
  code-dark-meta: "#C4C4C6"
typography:
  display:
    fontFamily: Helvetica Neue
    fontSize: 52px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0em
  headline-lg:
    fontFamily: Helvetica Neue
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.6
    letterSpacing: 0em
  headline-md:
    fontFamily: Helvetica Neue
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.6
    letterSpacing: 0em
  body-md:
    fontFamily: Helvetica Neue
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  body-sm:
    fontFamily: Helvetica Neue
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  caption:
    fontFamily: Helvetica Neue
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  label-md:
    fontFamily: Helvetica Neue
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0em
rounded:
  none: 0px
  sm: 4px
  md: 4px
  full: 9999px
spacing:
  xxxxs: 4px
  xxxs: 8px
  xxs: 12px
  xs: 16px
  sm: 20px
  md: 32px
  lg: 48px
  xl: 64px
  slide-x: 56px
  header-height: 56px
  header-title-inset: 20px
  logo-title-size: 64px
  logo-header-size: 38px
components:
  slide-canvas:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    width: 1280px
    height: 720px
    padding: "{spacing.slide-x}"
  content-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
  title-heading:
    textColor: "{colors.text-primary}"
    typography: "{typography.display}"
  header-band:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-md}"
    height: "{spacing.header-height}"
    padding: "{spacing.header-title-inset}"
  summary-box:
    backgroundColor: "{colors.background-secondary}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-sm}"
    padding: 1em
  paper-section:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-sm}"
  accent-marker:
    backgroundColor: "{colors.muji-red}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
  table-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-sm}"
  table-border:
    backgroundColor: "{colors.border}"
  table-header:
    backgroundColor: "{colors.background-secondary}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-sm}"
  token-neutral:
    backgroundColor: "{colors.neutral}"
  token-surface-muted:
    backgroundColor: "{colors.surface-muted}"
  token-accent-strong:
    backgroundColor: "{colors.accent-strong}"
  token-emphasis:
    backgroundColor: "{colors.emphasis}"
  token-muted-invert:
    backgroundColor: "{colors.muted-invert}"
  token-highlight-invert:
    backgroundColor: "{colors.highlight-invert}"
  token-table-border:
    backgroundColor: "{colors.table-border}"
  token-table-header:
    backgroundColor: "{colors.table-header}"
  token-table-stripe:
    backgroundColor: "{colors.table-stripe}"
  token-cursor-orange:
    backgroundColor: "{colors.cursor-orange}"
  token-cursor-glow:
    backgroundColor: "{colors.cursor-glow}"
  token-red:
    backgroundColor: "{colors.red}"
  token-kinari:
    backgroundColor: "{colors.kinari}"
  token-beige:
    backgroundColor: "{colors.beige}"
  token-text-secondary:
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
  token-text-tertiary:
    textColor: "{colors.text-tertiary}"
    typography: "{typography.caption}"
  token-text-disabled:
    textColor: "{colors.text-disabled}"
    typography: "{typography.caption}"
  token-border-light:
    backgroundColor: "{colors.border-light}"
  token-gray-800:
    backgroundColor: "{colors.gray-800}"
  token-gray-700:
    backgroundColor: "{colors.gray-700}"
  token-gray-600:
    backgroundColor: "{colors.gray-600}"
  token-gray-500:
    backgroundColor: "{colors.gray-500}"
  token-gray-400:
    backgroundColor: "{colors.gray-400}"
  token-gray-300:
    backgroundColor: "{colors.gray-300}"
  token-gray-200:
    backgroundColor: "{colors.gray-200}"
  token-gray-100:
    backgroundColor: "{colors.gray-100}"
  token-note:
    backgroundColor: "{colors.note}"
  token-note-strong:
    textColor: "{colors.note-strong}"
    typography: "{typography.body-sm}"
  token-tip:
    backgroundColor: "{colors.tip}"
  token-tip-strong:
    textColor: "{colors.tip-strong}"
    typography: "{typography.body-sm}"
  token-important:
    backgroundColor: "{colors.important}"
  token-important-strong:
    textColor: "{colors.important-strong}"
    typography: "{typography.body-sm}"
  token-warning:
    backgroundColor: "{colors.warning}"
  token-warning-strong:
    textColor: "{colors.warning-strong}"
    typography: "{typography.body-sm}"
  token-caution:
    backgroundColor: "{colors.caution}"
  token-caution-strong:
    textColor: "{colors.caution-strong}"
    typography: "{typography.body-sm}"
  token-blue:
    backgroundColor: "{colors.blue}"
  token-light-blue:
    backgroundColor: "{colors.light-blue}"
  token-green:
    backgroundColor: "{colors.green}"
  token-yellow:
    backgroundColor: "{colors.yellow}"
  token-orange:
    backgroundColor: "{colors.orange}"
  token-cyan:
    backgroundColor: "{colors.cyan}"
  token-pink:
    backgroundColor: "{colors.pink}"
  token-purple:
    backgroundColor: "{colors.purple}"
  token-dracula-bg:
    backgroundColor: "{colors.dracula-bg}"
  token-dracula-fg:
    textColor: "{colors.dracula-fg}"
    typography: "{typography.body-sm}"
  token-dracula-muted:
    textColor: "{colors.dracula-muted}"
    typography: "{typography.caption}"
  token-dracula-highlight:
    backgroundColor: "{colors.dracula-highlight}"
  token-dracula-emphasis:
    backgroundColor: "{colors.dracula-emphasis}"
  token-dracula-strong:
    textColor: "{colors.dracula-strong}"
    typography: "{typography.body-sm}"
  token-one-dark-bg:
    backgroundColor: "{colors.one-dark-bg}"
  token-one-dark-fg:
    textColor: "{colors.one-dark-fg}"
    typography: "{typography.body-sm}"
  token-one-dark-muted:
    textColor: "{colors.one-dark-muted}"
    typography: "{typography.caption}"
  token-one-dark-highlight:
    backgroundColor: "{colors.one-dark-highlight}"
  token-one-dark-emphasis:
    backgroundColor: "{colors.one-dark-emphasis}"
  token-one-dark-strong:
    textColor: "{colors.one-dark-strong}"
    typography: "{typography.body-sm}"
  token-nord-bg:
    backgroundColor: "{colors.nord-bg}"
  token-nord-fg:
    textColor: "{colors.nord-fg}"
    typography: "{typography.body-sm}"
  token-nord-muted:
    textColor: "{colors.nord-muted}"
    typography: "{typography.caption}"
  token-nord-highlight:
    backgroundColor: "{colors.nord-highlight}"
  token-nord-emphasis:
    backgroundColor: "{colors.nord-emphasis}"
  token-nord-strong:
    textColor: "{colors.nord-strong}"
    typography: "{typography.body-sm}"
  token-neogaia-dark-bg:
    backgroundColor: "{colors.neogaia-dark-bg}"
  token-neogaia-dark-fg:
    textColor: "{colors.neogaia-dark-fg}"
    typography: "{typography.body-sm}"
  token-neogaia-dark-muted:
    textColor: "{colors.neogaia-dark-muted}"
    typography: "{typography.caption}"
  token-neogaia-dark-highlight:
    backgroundColor: "{colors.neogaia-dark-highlight}"
  token-neogaia-dark-emphasis:
    backgroundColor: "{colors.neogaia-dark-emphasis}"
  token-neogaia-dark-strong:
    textColor: "{colors.neogaia-dark-strong}"
    typography: "{typography.body-sm}"
  token-neogaia-light-bg:
    backgroundColor: "{colors.neogaia-light-bg}"
  token-neogaia-light-fg:
    textColor: "{colors.neogaia-light-fg}"
    typography: "{typography.body-sm}"
  token-neogaia-light-muted:
    textColor: "{colors.neogaia-light-muted}"
    typography: "{typography.caption}"
  token-neogaia-light-highlight:
    backgroundColor: "{colors.neogaia-light-highlight}"
  token-neogaia-light-emphasis:
    backgroundColor: "{colors.neogaia-light-emphasis}"
  token-neogaia-light-strong:
    textColor: "{colors.neogaia-light-strong}"
    typography: "{typography.body-sm}"
  token-github-light-bg:
    backgroundColor: "{colors.github-light-bg}"
  token-github-light-fg:
    textColor: "{colors.github-light-fg}"
    typography: "{typography.body-sm}"
  token-github-light-muted:
    textColor: "{colors.github-light-muted}"
    typography: "{typography.caption}"
  token-github-light-highlight:
    backgroundColor: "{colors.github-light-highlight}"
  token-github-light-emphasis:
    backgroundColor: "{colors.github-light-emphasis}"
  token-github-light-strong:
    textColor: "{colors.github-light-strong}"
    typography: "{typography.body-sm}"
  token-code-inline-bg:
    backgroundColor: "{colors.code-inline-bg}"
  token-code-block-bg:
    backgroundColor: "{colors.code-block-bg}"
  token-code-comment:
    textColor: "{colors.code-comment}"
    typography: "{typography.body-sm}"
  token-code-keyword:
    textColor: "{colors.code-keyword}"
    typography: "{typography.body-sm}"
  token-code-string:
    textColor: "{colors.code-string}"
    typography: "{typography.body-sm}"
  token-code-number:
    textColor: "{colors.code-number}"
    typography: "{typography.body-sm}"
  token-code-function:
    textColor: "{colors.code-function}"
    typography: "{typography.body-sm}"
  token-code-tag:
    textColor: "{colors.code-tag}"
    typography: "{typography.body-sm}"
  token-code-builtin:
    textColor: "{colors.code-builtin}"
    typography: "{typography.body-sm}"
  token-code-meta:
    textColor: "{colors.code-meta}"
    typography: "{typography.body-sm}"
  token-code-deletion:
    textColor: "{colors.code-deletion}"
    typography: "{typography.body-sm}"
  token-code-deletion-bg:
    backgroundColor: "{colors.code-deletion-bg}"
  token-code-addition:
    textColor: "{colors.code-addition}"
    typography: "{typography.body-sm}"
  token-code-addition-bg:
    backgroundColor: "{colors.code-addition-bg}"
  token-code-dark-comment:
    textColor: "{colors.code-dark-comment}"
    typography: "{typography.body-sm}"
  token-code-dark-keyword:
    textColor: "{colors.code-dark-keyword}"
    typography: "{typography.body-sm}"
  token-code-dark-string:
    textColor: "{colors.code-dark-string}"
    typography: "{typography.body-sm}"
  token-code-dark-number:
    textColor: "{colors.code-dark-number}"
    typography: "{typography.body-sm}"
  token-code-dark-function:
    textColor: "{colors.code-dark-function}"
    typography: "{typography.body-sm}"
  token-code-dark-tag:
    textColor: "{colors.code-dark-tag}"
    typography: "{typography.body-sm}"
  token-code-dark-builtin:
    textColor: "{colors.code-dark-builtin}"
    typography: "{typography.body-sm}"
  token-code-dark-meta:
    textColor: "{colors.code-dark-meta}"
    typography: "{typography.body-sm}"
---

# MUJI Design

## Overview

MUJI is a restrained, unadorned design direction for quiet product-like
presentations. It uses whitespace, flat surfaces, thin rules, and neutral text
instead of decorative motion, gradients, or heavy chroma. The tone should feel
plain, natural, and calm.

This design is adapted from the MUJI network store design.md reference in
`awesome-design-md-jp`. The original reference is web-UI oriented; this file
translates it into MarpAgent slide and paper tokens while preserving the visual
principles.

## Colors

The palette is neutral-first. `--color-text-primary` is the default ink and
should be preferred over pure black. `--color-muji-red` is a brand accent used
sparingly for logos, strong emphasis, and small markers. `--color-kinari` and
`--color-beige` add warmth in restrained background areas.

## Typography

The preferred font stack is Helvetica Neue, Arial, Noto Sans JP, Hiragino Kaku
Gothic ProN, Meiryo, sans-serif. Line height is intentionally generous at 1.6
for most text. Letter spacing stays normal, except for rare compact labels that
may use slight positive tracking.

## Layout

Use more whitespace than the lab theme. Slides should feel sparse and ordered:
one message, simple rules, and flat sections. Do not make nested cards or
decorative panels. Paper layouts use A4 as the authoring base and may be scaled
at print time.

## Elevation & Depth

Avoid shadows. Most surfaces are flat with thin borders. When depth is needed,
use spacing and hierarchy instead of shadow or blur.

## Shapes

Corners are square or lightly rounded at 4px. Large rounded cards and pill-like
containers are outside the design language unless required by an existing
component convention.

## Components

Headers are quiet bands with a thin bottom rule. Buttons and labels use dark
neutral fills or outline treatments. Cards are white surfaces with thin neutral
borders and no shadow. Tables should use light rules and minimal striping.

## Do's and Don'ts

- Do use text-primary instead of pure black.
- Do keep line-height at 1.6 and preserve generous whitespace.
- Do use kinari and beige as warm background accents.
- Do use MUJI Red only as a small accent.
- Don't use decorative gradients, heavy shadows, or animation.
- Don't overuse large rounded corners.
- Don't compress the layout by shrinking typography.
