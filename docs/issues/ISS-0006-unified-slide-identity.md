---
id: ISS-0006
title: 'Unify slide identity: markdown index, rendered section, displayed page'
type: issue
status: open
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- src/markdown-slides.js
- src/marp-pagination.js
- src/visual-overflow.js
- src/deck-validator.js
- bin/marpx.js
tags:
- refactor
- bug
- dx
depends_on:
- ISS-0005
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Unify slide identity: markdown index, rendered section, displayed page

## Problem

Different commands number slides differently, and the mapping between them is re-derived with Markdown regexes that disagree with Marp:

- Heuristic findings use the Markdown split index from `src/markdown-slides.js` (`splitNonEmptySlides` keeps raw numbering but drops empty slides).
- Visual findings map rendered `section[id]` indices back through `buildRenderedToMarkdownMap` (`src/visual-overflow.js:133-145`), which skips empty slides. Marp still renders them: `A / (empty) / C` renders three sections but maps to `[1,3]`.
- `splitSlideRawBlocks` treats every `---` line as a separator, but `Text\n---` is a setext heading in Marp, so the split count is off by one.
- `--screenshot` and serve/overview page arguments use the displayed page number (`src/marp-pagination.js`), which diverges from both once `paginate: skip` / `_paginate` is used.
- `--report-dir` screenshots pick `slide.NNN.png` from `marp --images` output (rendered order) using the Markdown slide number (`src/deck-validator.js:473-476`), so a hidden or empty slide makes the report attach the wrong image.
- SARIF results always point at `region: { startLine: 1 }` (`src/deck-validator.js:403-405`) because no slide→source-line map exists.

Authors report that the mixed numbering is confusing in practice.

## Goal

One module computes a slide map from the actual Marp render, and every command reports and accepts slides through it.

## Acceptance criteria

- [ ] A single function returns, for each rendered slide: rendered index, `section` id, displayed page (or none), Markdown slide index, and source start line. It derives these from the configured Marp engine (including hide/Mermaid/alerts plugins), not from separate regexes.
- [ ] Validator findings (text, JSON, SARIF, report.md) all carry the same identity fields; text output shows the displayed page alongside the slide index when they differ.
- [ ] SARIF `region.startLine` points at the slide's first source line.
- [ ] Report screenshots are selected by rendered index and match the finding's slide for decks with hidden, empty, and `paginate: skip` slides.
- [ ] `--screenshot`, serve, and `--overview` page arguments document which number they accept and resolve through the same map.
- [ ] Tests cover empty slides, setext headings, hidden slides, and skipped pagination.

## Out of scope

- Changing hide semantics (handled in ISS-0005, which should land first).

## Files

- `src/markdown-slides.js`, `src/marp-pagination.js`, `src/visual-overflow.js`, `src/deck-validator.js`
- `bin/marpx.js` (`--screenshot`), `scripts/marp-serve.js`, `scripts/preview-overview.js`
- related unit tests
