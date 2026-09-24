---
id: ISS-0012
title: 'Visual render pipeline: unencoded file URLs and leaked temp directories'
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
authors:
- claude-code
scope:
- src/visual-overflow.js
- src/deck-validator.js
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

# Visual render pipeline: unencoded file URLs and leaked temp directories

## Problem

- `measureOverflowInBrowser` and `screenshotSlide` open ``file://${htmlPath}`` without encoding (`src/visual-overflow.js:85, 225`). `htmlPath` includes the deck's directory name, so a directory containing `#`, `%`, or `?` yields a wrong URL, and the visual check falls back or the screenshot fails.
- `defaultImageExporter` (`src/deck-validator.js:439-489`) removes its temp directory only on success. If `marp --images` throws, `marp-agent-validator-*` remains in the OS temp directory. Both render paths also copy the entire deck directory, including videos and exported PDFs, on every run.

## Goal

The visual pipeline works for any valid directory name and never leaves temp directories behind.

## Acceptance criteria

- [x] Both call sites build the URL with `url.pathToFileURL(htmlPath).href`.
- [x] A test renders a deck whose directory name contains `#` and `%`.
- [x] `defaultImageExporter` cleans up in `finally`.
- [x] Copying the deck to temp skips media that rendering does not need (e.g. `*.pdf`, generated `.*.overview.html`), or the design comment explains why a full copy is required.

## Files

- `src/visual-overflow.js`
- `src/deck-validator.js`
- `tests/unit/visual-overflow.test.js`

## Notes

The file-URL fix landed with ISS-0019 on 2026-09-24. The directory-name test, temp cleanup in `defaultImageExporter`, and the copy scope remain open.

2026-09-24: Implemented the remaining criteria. `defaultImageExporter` now removes its temp root in `finally`, so a `marp --images` failure no longer leaks `marp-agent-validator-*` directories. Both render paths copy the deck via the new `copyDeckForRender` (`src/media-assets.js`), which skips `*.pdf` exports and generated `.*.overview.html` files unless the deck references them — a PDF embedded via `<embed>`/`<object>` still has to load, so the skip checks the deck's media references instead of being a blind denylist. The test for `#`/`%` directory names renders a `mktemp` deck and exercises `pathToFileURL` end to end.
