---
id: ISS-0022
title: "Replace source typography-drift with a rendered minimum font size check"
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

# Replace source typography-drift with a rendered minimum font size check

## Problem

`typography-drift` inspects source text only: `.text-xs2`, `.text-xs3`, `<small>`, and a regex for inline font sizes. It runs after `<style>` blocks are stripped (`src/deck-validator.js` `lintSlide`), so `<style scoped>section { font-size: 14px }</style>` is never seen. Meanwhile it flags classes whose rendered size may be acceptable. Under ADR-0001 it is now only a hint, so nothing reliably catches genuinely unreadable text.

## Goal

The validator reports body text whose computed font size is below a readable floor, based on the rendered slide.

## Acceptance criteria

- [ ] The in-page audit records the computed font size of each visible text run, scaled to slide pixels.
- [ ] Body text below a documented floor is an `error`. The floor is relative to the canvas height (e.g. at 720px height) and applies to paper canvases in proportion.
- [ ] Footnotes, citations, captions, headers, footers, pagination, and text inside diagrams have a separate lower floor or are exempt; the choice is documented.
- [ ] The XR-0001 decks produce no new errors unless the flagged text is confirmed unreadable in the screenshots.
- [ ] Once this lands, `typography-drift` is removed from the hints or kept only as the fallback when rendering is unavailable.
- [ ] Unit tests cover scoped `<style>` overrides, supported small utilities, and exempt footnotes.

## Notes

Follow-up to ISS-0019 under ADR-0001. XR-0001 observed a minimum rendered size of 10.4px, used only in citation footnotes (0.4em of a 26px base), in accepted decks.
