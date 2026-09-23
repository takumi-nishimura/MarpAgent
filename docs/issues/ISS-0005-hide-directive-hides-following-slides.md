---
id: ISS-0005
title: hide directive hides the slide and every following slide
type: issue
status: open
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- scripts/hide-slides-plugin.js
- src/visual-overflow.js
tags:
- bug
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# hide directive hides the slide and every following slide

## Problem

`<!-- hide: true -->` is meant to hide only the slide it appears on. `scripts/hide-slides-plugin.js:4` registers `hide` as a Marpit *local* directive, and local directives inherit to all following slides. Rendering a 4-slide deck with `hide: true` on slide 2 through `marp.config.js` produces only slide 1 (checked 2026-09-23 against marp-core 4.3.0).

The validator assumes single-slide semantics: `detectHiddenSlides` (`src/visual-overflow.js:117-127`) and its tests (`tests/unit/visual-overflow.test.js:16-80`) map only the marked slide as hidden, so they disagree with the renderer. The spot form `<!-- _hide: true -->` hides exactly one slide in the renderer, but `detectHiddenSlides` does not recognize it, so visual findings after it are attributed to the wrong slide.

## Goal

`hide: true` hides exactly the slide that carries it, and every tool (render, validator, overview, screenshot) agrees on which slides are hidden.

## Acceptance criteria

- [ ] A deck with `<!-- hide: true -->` on slide 2 of 4 renders slides 1, 3, and 4.
- [ ] `<!-- _hide: true -->` behaves identically.
- [ ] A hidden slide does not affect pagination directives or inherited local directives (e.g. `class`, `header`) of the following slides.
- [ ] Hidden-slide detection used by the validator derives from the same source as the renderer (or recognizes both forms), with tests for both forms.
- [ ] A render-level test exercises the plugin through `marp.config.js`, not only the Markdown-side detector.
- [ ] The directive is documented in `AGENTS.md` (Per-Slide Directives table).

## Out of scope

- The broader slide-numbering unification (see ISS-0006); this issue only fixes hide semantics.

## Approach

Decide hiding from the slide's own directive rather than the inherited value, e.g. by checking whether the `hide` comment was parsed on that slide (spot semantics), so inheritance cannot leak.

## Files

- `scripts/hide-slides-plugin.js`
- `src/visual-overflow.js`
- `tests/unit/visual-overflow.test.js`
- `AGENTS.md`
