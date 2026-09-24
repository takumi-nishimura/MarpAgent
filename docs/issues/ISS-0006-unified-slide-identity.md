---
id: ISS-0006
title: 'Unify slide identity: markdown index, rendered section, displayed page'
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
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
resolution: completed
resolved: "2026-09-24"
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

- [x] A single function returns, for each rendered slide: rendered index, `section` id, displayed page (or none), Markdown slide index, and source start line. It derives these from the configured Marp engine (including hide/Mermaid/alerts plugins), not from separate regexes.
- [x] Validator findings (text, JSON, SARIF, report.md) all carry the same identity fields; text output shows the displayed page alongside the slide index when they differ.
- [x] SARIF `region.startLine` points at the slide's first source line.
- [x] Report screenshots are selected by rendered index and match the finding's slide for decks with hidden, empty, and `paginate: skip` slides.
- [x] `--screenshot`, serve, and `--overview` page arguments document which number they accept and resolve through the same map.
- [x] Tests cover empty slides, setext headings, hidden slides, and skipped pagination.

## Out of scope

- Changing hide semantics (handled in ISS-0005, which should land first).

## Files

- `src/markdown-slides.js`, `src/marp-pagination.js`, `src/visual-overflow.js`, `src/deck-validator.js`
- `bin/marpx.js` (`--screenshot`), `scripts/marp-serve.js`, `scripts/preview-overview.js`
- related unit tests

## Notes

- `src/slide-map.js` `buildSlideMap` parses the deck with the engine from `marp.config.js` (hide, Mermaid, alerts plugins) and two observing core rules: one before `marpit_slide` records the front matter and level-0 `hr` token maps (headingDivider's hidden `hr` starts at its heading), one before `marpit_directives_apply` records every `marpit_slide_open`, so hidden slides removed later are still known. Each entry has `slide` (Markdown index, Marpit order including hidden and empty slides), `renderedSlide` (1-based rendered position or null), `sectionId`, `page` (displayed page or null), `hidden`, `line`/`endLine`, and `raw`.
- The regex splitters `splitSlideRawBlocks`/`splitNonEmptySlides` were removed. Heuristics, the media file check, hidden-slide detection, and the rendered-to-Markdown map all read slide boundaries from the map, so empty slides keep their rendered place and setext underlines no longer split slides.
- Findings keep `slide` and add `renderedSlide`, `sectionId`, `page`, and `line`. Text and `report.md` print `slide 11 (page 10)` when the page differs and `(hidden)` for hidden slides; SARIF `region.startLine` is `line`. Report screenshots pick `slide.NNN.png` by `renderedSlide` and keep the `slide-NNN.png` name by Markdown index.
- Page arguments for serve, `--overview`, and `--screenshot` take the displayed page; a deck that shows no page numbers falls back to the rendered position; hidden slides are never returned. `--screenshot` no longer falls back to the section id. Serve now opens `#<renderedSlide>` because Marp's bespoke template reads a numeric hash as the rendered position (the section id was wrong after a hidden slide). Overview cards are labeled with the Markdown index.
