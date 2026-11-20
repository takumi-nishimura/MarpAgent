---
version: alpha
name: {{name}}
description: Visual identity for {{name}} presentations.
colors:
  primary: "#182536"
  secondary: "#536477"
  neutral: "#FFFFFF"
  on-surface: "{colors.primary}"
  surface-muted: "#EFF3F6"
  accent-strong: "#145C75"
  emphasis: "#83C9CA"
typography:
  display:
    fontFamily: Noto Sans JP
    fontSize: 64px
    fontWeight: 700
    lineHeight: "1.15"
  body-md:
    fontFamily: Noto Sans JP
    fontSize: 28px
    fontWeight: 400
    lineHeight: "1.4"
  header-label:
    fontFamily: Noto Sans JP
    fontSize: 26px
    fontWeight: 400
    lineHeight: "1.3"
    letterSpacing: 0em
spacing:
  slide-x: 56px
  header-outdent: 16px
components:
  canvas:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    padding: "{spacing.slide-x}"
  title:
    typography: "{typography.display}"
    textColor: "{colors.primary}"
  panel:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.secondary}"
  accent:
    textColor: "{colors.accent-strong}"
  header-band:
    typography: "{typography.header-label}"
    padding: "{spacing.header-outdent}"
  marker:
    backgroundColor: "{colors.emphasis}"
---

# {{name}} Design

## Overview

{{source}}

## Colors

Set ink, canvas, accent and emphasis for the intended viewing conditions.
Shared components and named color schemes have defaults that can be overridden here.

## Typography

Set the display and body scales independently.

## Layout

Edit the cover and body styles independently in the theme's CSS directory.
