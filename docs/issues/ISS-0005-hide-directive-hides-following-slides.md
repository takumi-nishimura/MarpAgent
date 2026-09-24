---
id: ISS-0005
title: hide directive hides the slide and every following slide
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
authors:
- claude-code
scope:
- scripts/hide-slides-plugin.js
- src/visual-overflow.js
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

# hide directive hides the slide and every following slide

## Problem

`<!-- hide: true -->` is meant to hide only the slide it appears on. `scripts/hide-slides-plugin.js:4` registers `hide` as a Marpit *local* directive, and local directives inherit to all following slides. Rendering a 4-slide deck with `hide: true` on slide 2 through `marp.config.js` produces only slide 1 (checked 2026-09-23 against marp-core 4.3.0).

The validator assumes single-slide semantics: `detectHiddenSlides` (`src/visual-overflow.js:117-127`) and its tests (`tests/unit/visual-overflow.test.js:16-80`) map only the marked slide as hidden, so they disagree with the renderer. The spot form `<!-- _hide: true -->` hides exactly one slide in the renderer, but `detectHiddenSlides` does not recognize it, so visual findings after it are attributed to the wrong slide.

## Goal

`hide: true` hides exactly the slide that carries it, and every tool (render, validator, overview, screenshot) agrees on which slides are hidden.

## Acceptance criteria

- [x] A deck with `<!-- hide: true -->` on slide 2 of 4 renders slides 1, 3, and 4.
- [x] `<!-- _hide: true -->` behaves identically.
- [x] A hidden slide does not affect pagination directives or inherited local directives (e.g. `class`, `header`) of the following slides.
- [x] Hidden-slide detection used by the validator derives from the same source as the renderer (or recognizes both forms), with tests for both forms.
- [x] A render-level test exercises the plugin through `marp.config.js`, not only the Markdown-side detector.
- [x] The directive is documented in `AGENTS.md` (Per-Slide Directives table).

## Out of scope

- The broader slide-numbering unification (see ISS-0006); this issue only fixes hide semantics.

## Approach

Decide hiding from the slide's own directive rather than the inherited value, e.g. by checking whether the `hide` comment was parsed on that slide (spot semantics), so inheritance cannot leak.

## Files

- `scripts/hide-slides-plugin.js`
- `src/visual-overflow.js`
- `tests/unit/visual-overflow.test.js`
- `AGENTS.md`

## Notes

- 2026-09-24: `scripts/hide-slides-plugin.js` still registers `hide` as a Marpit local directive so `hide`/`_hide` comments are recognized, but the directive contributes nothing to the inherited directive state. The removal rule decides per slide from the slide's own directive comments (block and inline, last one wins), so `hide: true` and `_hide: true` behave identically and hiding cannot leak. The rule now removes the whole slide wrapper; the previous version left the closing `</svg>` of each hidden slide in the HTML.
- Hidden slides are still removed after `marpit_directives_apply`, so later slides keep the inherited directives they would have without hiding.
- Leader decision (2026-09-24): hidden slides do not count toward page numbers. A rule before `marpit_directives_apply` gives each hidden slide `paginate: skip`, so Marpit neither numbers it nor counts it in `data-marpit-pagination-total`; the `_paginate: skip`/`hold` semantics of other slides are unchanged. Motivation: a real deck (25 slides, `_paginate: skip` title, `_hide: true` last slide) showed its last visible slide as "23 / 24"; it now shows "23 / 23". `findSlideIdByDisplayedPage` (`--screenshot`, serve page arguments) reads the same rendered attributes, so displayed pages resolve past hidden slides.
- `detectHiddenSlides` (`src/visual-overflow.js`) parses each slide block with Marp and the same plugin and treats a block as hidden when the plugin removes all of its slides, so the validator agrees with the renderer for both forms, multi-key comments, and comments inside code blocks. Block numbering still comes from `splitSlideRawBlocks` (ISS-0006).
- Tests: `tests/unit/hide-slides.test.js` renders through `marp.config.js` (hiding, inherited directives, page numbers and totals, skip/hold interplay); `tests/unit/visual-overflow.test.js` covers the detector and the rendered-to-Markdown map for both forms; `tests/unit/marp-pagination.test.js` covers displayed-page lookup with hidden slides.
