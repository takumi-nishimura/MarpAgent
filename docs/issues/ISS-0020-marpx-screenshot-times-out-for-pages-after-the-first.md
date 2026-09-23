---
id: ISS-0020
title: "marpx --screenshot times out for pages after the first"
type: issue
status: closed
date: "2026-09-23"
authors:
  - claude-code
scope:
  - src/visual-overflow.js
  - bin/marpx.js
tags:
  - bug
depends_on: []
supersedes: []
resolution: completed
resolved: "2026-09-24"
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# marpx --screenshot times out for pages after the first

## Problem

`marpx <deck> --screenshot <page>` times out for any page after the first. `renderToHtml` used Marp's default bespoke template, which hides inactive slides, so Playwright's element screenshot waits for a slide that never becomes visible. Reproduced on 2026-09-23 with `marpx decks/example/slide.md --screenshot 3`. The e2e smoke test only covered page 1.

## Goal

Any displayed page can be screenshotted.

## Acceptance criteria

- [x] `renderToHtml` renders with `--template bare`, so every slide is laid out and visible.
- [x] `marpx decks/example/slide.md --screenshot 3` writes a PNG of page 3.
- [x] An e2e test screenshots a page after the first (`tests/e2e/cli-smoke.spec.js`).

## Notes

Fixed together with ISS-0019 on 2026-09-24.
