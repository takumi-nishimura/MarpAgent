---
id: ISS-0024
title: "Report media that fail to load in rendered slides"
type: issue
status: closed
date: "2026-09-24"
authors:
  - claude-code
scope:
  - src/visual-overflow.js
  - src/deck-validator.js
  - src/media-assets.js
tags:
  - validator
  - feature
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


# Report media that fail to load in rendered slides

## Problem

The validator does not check whether slide media actually load. Marp renders a missing local image as a broken-image icon, and validation still passes. On 2026-09-24, checking the XR-0001 lab decks with PR #24 found three slides with a broken `assets/img/fusion-system.png`: slide 1 of 06-22-lab-seminar, slide 2 of 06-26-nec-interview, and slide 2 of 07-06-fujitsu-interview. Each file is a cross-deck symlink whose target no longer exists, and one of them uses an absolute path. Both the previous and the current validator report nothing for these slides.

## Goal

Media that the deck references but that fail to load are reported as a blocking `missing-asset` error under ADR-0001, naming the slide and the reference.

## Acceptance criteria

- [x] The rendered audit reports an `img` that finished loading with `naturalWidth === 0`, and a `video` / `audio` / `source` whose element reports a load error or no usable source.
- [x] Marp background images (`![bg](...)`) and CSS `url(...)` images declared in the slide are checked by resolving and loading each URL in the page, or by the source-level check below.
- [x] A source-level check resolves every local media reference relative to the deck file and reports missing files and broken symlinks, naming the symlink target. It also runs when rendering is unavailable, and is still an `error` because it is a definite check, not a heuristic.
- [x] Remote `http(s)` URLs are not fetched by default, and the documentation says so.
- [x] Findings are grouped per slide: `missing-asset` (error, `source: render` or `source: files`) with each missing reference and the reason (not found / broken symlink / failed to decode).
- [x] The three XR-0001 slides above are reported, and the other lab-deck slides and the repository fixtures produce no new errors.
- [x] Unit tests cover a missing image, a broken symlink, a missing background image, a missing video, an ignored remote URL, and a deck whose assets all load.
- [x] The `marp-validator` rules reference documents the rule.

## Out of scope

- Checking that an asset is the *right* file (content identity).
- Fixing the lab/decks links; the author handles the deck repository separately.

## Notes

Follow-up under ADR-0001; it extends the "visible defect" category that the ADR assigns to `error`. When measuring in the page, wait for image decode and video metadata (e.g. `img.decode()` and `loadedmetadata` or `error` events) instead of relying on `networkidle` alone, so slow media are not misreported as missing.

2026-09-24 implementation: `src/media-assets.js` adds the source-level file check. It resolves Markdown images (including `![bg ...]`, size keywords, `<...>` destinations, titles, and percent-encoded paths), the `src`/`poster`/`data` attributes of `img`, `video`, `audio`, `source`, `object`, and `embed`, and CSS `url(...)` in `<style>`, `style` attributes, directive comments, and the front matter against the deck directory. It reports "not found" or "broken symlink" with the link target, and names a broken parent-directory link such as `shared`. It skips code, speaker notes, hidden slides, `http(s)`, `//`, `data:`, and other schemes. `auditMediaInPage` in `src/visual-overflow.js` waits for `img.decode()` and for video/audio `loadedmetadata` or `error` (bounded by 15 s, before layout is measured), then reports an `img` with `naturalWidth === 0` as "failed to decode" and a video/audio element with a media error or no usable source as "failed to load". Failed URLs are mapped back from the rendered copy to the deck; remote URLs and files outside the copied deck directory are left to the file check. `validateDeckWithVisualCheck` and the `validateDeckFile` fallback merge both checks into one `missing-asset` error per slide. A reference that the file check reports is not repeated from the render. `source` is `render` only when every item came from the render, and `files` otherwise. Front-matter references are reported on the first slide.

Decisions: remote media are not checked in either layer, and the render ignores remote failures so that results do not depend on the network. `fixtures/figure-heavy-slide.md` referenced a nonexistent `fig.png`, so a small placeholder `fixtures/fig.png` was added to keep that fixture free of new errors. No new fixture was added, because unit tests cover the rule.

Lab-deck check (read-only, `node scripts/validate-deck.js <deck> --format json` on the eight `decks/2026/*/slide.md`): the new `missing-asset` errors are exactly slide 1 of 06-22-lab-seminar, slide 2 of 06-26-nec-interview (both `broken symlink -> ../../../06-11-panasonic-ojt-pr/assets/img/fusion-system.png`), and slide 2 of 07-06-fujitsu-interview (`broken symlink -> /Users/hapticslab/Documents/nishi/lab/decks/decks/2026/06-11-panasonic-ojt-pr/assets/img/fusion-system.png`, the absolute link). The render layer found the same three images independently, and they were deduplicated. The 558 MB `shared/video/融合アバター共創実験_プロジェクトストーリー_JP.mp4` on 07-06 slide 2 and the videos in 02-20-midterm-examination loaded metadata in Chromium and were not reported. All other findings match the base revision: 02-20 has `content-clipped` on slides 11 and 14 and `edge-crowding` warnings on slides 4, 12, 14, and 15, and 07-06 has `content-clipped` on slide 5.
