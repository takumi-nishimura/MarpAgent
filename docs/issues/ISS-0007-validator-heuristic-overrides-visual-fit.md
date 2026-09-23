---
id: ISS-0007
title: Heuristic overflow-risk still fires when the visual check shows the slide fits
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- src/deck-validator.js
- src/visual-overflow.js
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

# Heuristic overflow-risk still fires when the visual check shows the slide fits

## Problem

`validateDeckWithVisualCheck` (`src/deck-validator.js:592-599`) removes heuristic `overflow-risk` findings only for slides that the visual check reports as *overflowing*. For slides that were measured and fit, the heuristic finding remains, and the command exits 1.

Reproduced 2026-09-23: a `lab` slide with a short heading and one 149-character body line (30 words, which renders on about two lines) returns `[warning] slide 1 overflow-risk: ... single line 149 chars` and exit 1, with no visual-check failure diagnostics.

Root cause: `measureVisualOverflow` (`src/visual-overflow.js:152-213`) returns `[]` both when measurement succeeded with no overflow and when it failed in non-strict mode, so the caller cannot tell measured slides from unmeasured ones. The code comment says "slides where visual measurement ran", but the implementation uses "slides that overflowed".

## Goal

When pixel measurement succeeds for a slide, its result replaces the heuristic overflow estimate for that slide. The heuristic remains only as a fallback.

## Acceptance criteria

- [x] `measureVisualOverflow` returns which slides were measured in addition to which overflowed, and distinguishes success from fallback.
- [x] A measured slide that fits produces no `overflow-risk` finding; the 149-character reproduction above exits 0.
- [x] When visual measurement fails (non-strict), heuristic `overflow-risk` findings are kept.
- [x] Unit tests cover measured-fit, measured-overflow, and fallback cases.

## Out of scope

- Rethinking the other density rules (see ISS-0009).
- Reporting visual-check status to the user (see ISS-0008).

## Files

- `src/deck-validator.js`
- `src/visual-overflow.js`
- `tests/unit/validate-deck.test.js`, `tests/unit/visual-overflow.test.js`

## Notes

Resolved by ISS-0019 under ADR-0001 on 2026-09-24. `measureVisualOverflow` was replaced by `measureRenderedSlides`, which returns `{ status: "measured" | "skipped", slides }` with one entry per rendered slide. After a measured render, `overflow-risk` is dropped and the other heuristics become non-blocking hints.
