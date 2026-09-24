---
id: ISS-0011
title: Bullet counting and --autofix operate inside code fences
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
authors:
- claude-code
scope:
- src/deck-validator.js
- scripts/lint-deck.js
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

# Bullet counting and --autofix operate inside code fences

## Problem

- `countTopLevelBullets` (`src/deck-validator.js:64-70`) scans `stripNonContent(raw)` line by line without tracking code fences, unlike `getVisibleLines`. A code block containing `- item` or `1. step` lines (YAML, Markdown, or shell examples) counts toward `dense-bullets`, `figure-text-density`, `comparison-overpacked`, and `overflow-risk`.
- `applyAutoFixes` (`scripts/lint-deck.js:69-89`) runs global regex replacements over the whole file, so `--lint --autofix` rewrites `<small>…</small>` and `text-xs2` / `text-xs3` inside code examples as well. It also rewrites the file in place with no preview.

## Goal

Rules and autofixes ignore fenced code content, and autofix never changes code examples.

## Acceptance criteria

- [x] Bullet-like lines inside fenced code blocks (``` and ~~~) are not counted.
- [x] `--autofix` leaves fenced code blocks and inline code spans byte-identical.
- [x] Unit tests cover both cases.

## Out of scope

- A dry-run mode for autofix (consider it in ISS-0018).

## Files

- `src/deck-validator.js`
- `scripts/lint-deck.js`
- `tests/unit/validate-deck.test.js`, `tests/unit/lint-deck.test.js`

## Notes

Resolved on 2026-09-24. `src/markdown-slides.js` now owns the shared fence
state machine: `nextFenceState` tracks ``` / ~~~ markers (same character and
at least the opening run length to close) and `splitFenceSegments` groups a
document into fenced and regular segments that rejoin byte-for-byte.
`countTopLevelBullets` counts only non-fenced segments, and `applyAutoFixes`
rewrites only editable text, skipping fenced segments and inline code spans
matched by `` (`+)[\s\S]*?\1 ``. A `<small>` wrapper spanning a code span or
fence boundary is now left alone rather than partially unwrapped, which keeps
autofix conservative. `splitSlideRawBlocks` was refactored onto the same
helper; slide splitting behavior is unchanged.
