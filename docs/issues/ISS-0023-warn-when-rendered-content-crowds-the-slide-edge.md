---
id: ISS-0023
title: "Warn when rendered content crowds the slide edge"
type: issue
status: open
date: "2026-09-24"
authors:
  - claude-code
scope:
  - src/visual-overflow.js
  - src/deck-validator.js
tags:
  - validator
  - feature
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---


# Warn when rendered content crowds the slide edge

## Problem

The lab theme has 40px side padding but 0px bottom padding, so body text can run right down to the bottom edge. XR-0001 found several accepted slides whose last line or caption sits 0–16px from the bottom edge, for example slides 4, 5, 12, 15, and 20 of the 2026-02-20 deck. These lines are not clipped, so ADR-0001's `content-clipped` does not report them. The author wants a warning when content approaches the slide edge.

## Goal

Rendered content that is inside the canvas but within a safe margin of the edge is reported as a non-blocking `edge-crowding` warning, as decided in ADR-0001.

## Acceptance criteria

- [ ] The in-page audit reports unclipped visible content whose gap to the bottom, left, or right edge is below a safe margin of 20px at 720px canvas height, scaled with canvas height for other sizes.
- [ ] Text lines are checked on the bottom, left, and right edges; media only on the bottom edge. The top edge is not checked.
- [ ] Content with an absolutely or fixed-positioned ancestor (e.g. `.footnote`), and `header` / `footer` content, is excluded.
- [ ] Each slide produces at most one `edge-crowding` finding (`warning`, `source: render`) that names the closest elements, their edge, and the gap; it does not change the exit code.
- [ ] A slide already reported as `content-clipped` does not also report the clipped elements as crowding.
- [ ] Unit tests cover a crowded bottom line, an exempt footnote, a media right edge that is not reported, and a clean slide.
- [ ] The `marp-validator` rules reference documents the rule and the margin.

## Out of scope

- Configurable margins per theme (revisit if another theme defines a different safe area).

## Notes

Requested by the author on 2026-09-24 when accepting ADR-0001. The margin matches the theme's pagination inset (`padding-right` / `padding-bottom: 20px` on `section::after`). Media are excluded on the left and right edges because their boxes often include transparent margins: in XR-0001, an image box reached 5px from the right edge while its visible content stopped about 50px away.
