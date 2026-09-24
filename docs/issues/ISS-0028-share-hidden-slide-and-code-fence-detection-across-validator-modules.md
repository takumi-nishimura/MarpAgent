---
id: ISS-0028
title: "Share hidden-slide and code-fence detection across validator modules"
type: issue
status: closed
date: "2026-09-24"
authors:
  - claude-code
scope:
  - src/media-assets.js
  - src/markdown-slides.js
  - src/visual-overflow.js
  - src/hidden-slides.js
tags:
  - refactor
  - validator
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


# Share hidden-slide and code-fence detection across validator modules

## Problem

Several validator PRs were developed in parallel on separate branches. As a result, some detection logic is now duplicated with different behavior:

- **Hidden slides:** `src/media-assets.js` (added by ISS-0024, PR #32) skips hidden slides with the regex `/<!--\s*hide:\s*true\s*-->/`. That regex misses `<!-- _hide: true -->` and multi-key directive comments, and it matches comments inside code fences. ISS-0005 (PR #29) made `detectHiddenSlides` in `src/visual-overflow.js` parse slides with the real hide plugin. The missing-asset check can therefore report media on a slide that is hidden with `_hide`, which the renderer never shows.
- **Code fences:** `src/media-assets.js` has its own fenced-code tracking. ISS-0011 (PR #28) extracted a shared `nextFenceState` / `splitFenceSegments` helper into `src/markdown-slides.js`.

## Goal

Every validator module uses one hidden-slide detector and one code-fence helper, so the modules agree with each other and with the renderer.

## Acceptance criteria

- [x] `src/media-assets.js` decides hidden slides through the same detector as `detectHiddenSlides` (the hide plugin), and a test shows that a `<!-- _hide: true -->` slide's missing media is not reported.
- [x] `src/media-assets.js` uses the shared fence helper from `src/markdown-slides.js`, and its duplicate fence tracking is removed.
- [x] Existing tests pass unchanged apart from the new cases.

## Out of scope

- Unifying slide numbering (ISS-0006).

## Notes

Blocked until #28, #29, and #32 (and their base, #24) are merged, because the helpers live on those branches.

2026-09-24 implementation: `detectHiddenSlides` moved unchanged from `src/visual-overflow.js` to a new `src/hidden-slides.js`, which both `visual-overflow.js` (re-exported, so its public API and tests are unchanged) and `media-assets.js` import. A new module was needed because `visual-overflow.js` already requires `media-assets.js`, so importing the detector from `visual-overflow.js` would have been circular. `findMissingAssets` now computes the hidden-slide set once via `detectHiddenSlides` and filters on slide numbers, so `_hide`, multi-key directive comments, and `hide` comments inside code fences behave exactly as rendered. `maskNonRendered` masks fenced segments through `splitFenceSegments` instead of its own fence tracking; `isHiddenSlide` and the local fence code are removed. New tests cover a `_hide` slide's missing media not being reported and a fenced `hide: true` comment not hiding its slide.
