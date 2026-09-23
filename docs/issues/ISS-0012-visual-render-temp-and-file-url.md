---
id: ISS-0012
title: 'Visual render pipeline: unencoded file URLs and leaked temp directories'
type: issue
status: open
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- src/visual-overflow.js
- src/deck-validator.js
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

# Visual render pipeline: unencoded file URLs and leaked temp directories

## Problem

- `measureOverflowInBrowser` and `screenshotSlide` open ``file://${htmlPath}`` without encoding (`src/visual-overflow.js:85, 225`). `htmlPath` includes the deck's directory name, so a directory containing `#`, `%`, or `?` yields a wrong URL, and the visual check falls back or the screenshot fails.
- `defaultImageExporter` (`src/deck-validator.js:439-489`) removes its temp directory only on success. If `marp --images` throws, `marp-agent-validator-*` remains in the OS temp directory. Both render paths also copy the entire deck directory, including videos and exported PDFs, on every run.

## Goal

The visual pipeline works for any valid directory name and never leaves temp directories behind.

## Acceptance criteria

- [ ] Both call sites build the URL with `url.pathToFileURL(htmlPath).href`.
- [ ] A test renders a deck whose directory name contains `#` and `%`.
- [ ] `defaultImageExporter` cleans up in `finally`.
- [ ] Copying the deck to temp skips media that rendering does not need (e.g. `*.pdf`, generated `.*.overview.html`), or the design comment explains why a full copy is required.

## Files

- `src/visual-overflow.js`
- `src/deck-validator.js`
- `tests/unit/visual-overflow.test.js`
