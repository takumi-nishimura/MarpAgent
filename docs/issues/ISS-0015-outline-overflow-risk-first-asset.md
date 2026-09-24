---
id: ISS-0015
title: Outline overflow risk adds the first asset's length to every slide
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
authors:
- claude-code
scope:
- src/outline.js
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

# Outline overflow risk adds the first asset's length to every slide

## Problem

In `buildSlidePlan` (`src/outline.js:334-353`), every required section is scored with `estimateOverflowRisk(cleanTitle, brief.mustUseAssets[0])`. The first must-use asset line, which is often a long path plus description, is added to every slide's title length, whether or not that slide uses the asset. In `decks/example/brief.md`, this raises unrelated slides to `medium` or `high`. The score therefore reflects the length of the brief's first asset line, not the slide's expected content.

## Goal

The outline's overflow-risk hint depends only on information about that slide.

## Acceptance criteria

- [x] The overflow-risk hint no longer includes an unrelated asset's text; it uses the section text plus only assets explicitly tied to that section, if such a link exists.
- [x] A test with a long first asset shows unrelated sections unaffected.

## Out of scope

- Assigning assets to slides from prose (a separate, larger feature).

## Files

- `src/outline.js`
- `tests/unit/outline.test.js`

## Notes

- 2026-09-24: `buildSlidePlan` no longer scores every section against `brief.mustUseAssets[0]`. A new `linkedAssetContext` helper counts a must-use asset toward a slide's overflow risk only when the section text explicitly names it — by its backticked path, or by the asset label before a ` — `/` - ` separator (the whole line when there is no separator). A regression test confirms a long first asset leaves unrelated sections at `low` while a section naming the asset still scores `high`.
