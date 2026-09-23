---
id: ISS-0024
title: "Report media that fail to load in rendered slides"
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


# Report media that fail to load in rendered slides

## Problem

The validator does not check whether slide media actually load. Marp renders a missing local image as a broken-image icon, and validation still passes. On 2026-09-24, checking the XR-0001 lab decks with PR #24 found three slides with a broken `assets/img/fusion-system.png`: slide 1 of 06-22-lab-seminar, slide 2 of 06-26-nec-interview, and slide 2 of 07-06-fujitsu-interview. Each file is a cross-deck symlink whose target no longer exists, and one of them uses an absolute path. Both the previous and the current validator report nothing for these slides.

## Goal

Media that the deck references but that fail to load are reported as a blocking `missing-asset` error under ADR-0001, naming the slide and the reference.

## Acceptance criteria

- [ ] The rendered audit reports an `img` that finished loading with `naturalWidth === 0`, and a `video` / `audio` / `source` whose element reports a load error or no usable source.
- [ ] Marp background images (`![bg](...)`) and CSS `url(...)` images declared in the slide are checked by resolving and loading each URL in the page, or by the source-level check below.
- [ ] A source-level check resolves every local media reference relative to the deck file and reports missing files and broken symlinks, naming the symlink target. It also runs when rendering is unavailable, and is still an `error` because it is a definite check, not a heuristic.
- [ ] Remote `http(s)` URLs are not fetched by default, and the documentation says so.
- [ ] Findings are grouped per slide: `missing-asset` (error, `source: render` or `source: files`) with each missing reference and the reason (not found / broken symlink / failed to decode).
- [ ] The three XR-0001 slides above are reported, and the other lab-deck slides and the repository fixtures produce no new errors.
- [ ] Unit tests cover a missing image, a broken symlink, a missing background image, a missing video, an ignored remote URL, and a deck whose assets all load.
- [ ] The `marp-validator` rules reference documents the rule.

## Out of scope

- Checking that an asset is the *right* file (content identity).
- Fixing the lab/decks links; the author handles the deck repository separately.

## Notes

Follow-up under ADR-0001; it extends the "visible defect" category that the ADR assigns to `error`. When measuring in the page, wait for image decode and video metadata (e.g. `img.decode()` and `loadedmetadata` or `error` events) instead of relying on `networkidle` alone, so slow media are not misreported as missing.
