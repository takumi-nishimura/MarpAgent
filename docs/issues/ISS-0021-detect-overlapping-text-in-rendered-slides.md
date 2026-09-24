---
id: ISS-0021
title: "Detect overlapping text in rendered slides"
type: issue
status: open
date: "2026-09-23"
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

# Detect overlapping text in rendered slides

## Problem

The rendered check reports content that leaves the canvas, but not content that collides inside it. In XR-0001, slide 12 of the 2026-02-20 deck has its last bullet overlapping the citation footnote and touching the bottom edge. It was a visible defect, but no measured finding reported it.

## Goal

The validator reports overlapping text as a measured `error` under ADR-0001, with few false positives on accepted decks.

## Acceptance criteria

- [ ] The in-page audit reports text line boxes from different blocks that intersect each other, or that intersect media, by more than a small tolerance.
- [ ] Intended overlays are excluded, such as text on a callout background, captions on figures, absolutely positioned decorations, headers, footers, and pagination. The exclusion rules are documented.
- [ ] Findings name both colliding elements and the overlap size.
- [ ] Slide 12 of the XR-0001 midterm deck is reported, and the other XR-0001 slides produce no new errors.
- [ ] Unit tests cover a collision, an overlay that must not be reported, and a clean slide.

## Out of scope

- Aesthetic spacing judgments, such as items being "too close".

## Notes

Follow-up to ISS-0019 under ADR-0001. Record calibration results in a new XR.
