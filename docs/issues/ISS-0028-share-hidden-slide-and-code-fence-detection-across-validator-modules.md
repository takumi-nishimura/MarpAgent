---
id: ISS-0028
title: "Share hidden-slide and code-fence detection across validator modules"
type: issue
status: open
date: "2026-09-24"
authors:
  - claude-code
scope:
  - src/media-assets.js
  - src/markdown-slides.js
  - src/visual-overflow.js
tags:
  - refactor
  - validator
depends_on: []
supersedes: []
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

- [ ] `src/media-assets.js` decides hidden slides through the same detector as `detectHiddenSlides` (the hide plugin), and a test shows that a `<!-- _hide: true -->` slide's missing media is not reported.
- [ ] `src/media-assets.js` uses the shared fence helper from `src/markdown-slides.js`, and its duplicate fence tracking is removed.
- [ ] Existing tests pass unchanged apart from the new cases.

## Out of scope

- Unifying slide numbering (ISS-0006).

## Notes

Blocked until #28, #29, and #32 (and their base, #24) are merged, because the helpers live on those branches.
