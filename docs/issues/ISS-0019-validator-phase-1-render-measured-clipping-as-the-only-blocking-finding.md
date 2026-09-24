---
id: ISS-0019
title: "Validator phase 1: render-measured clipping as the only blocking finding"
type: issue
status: closed
date: "2026-09-23"
authors:
  - claude-code
scope:
  - src/visual-overflow.js
  - src/deck-validator.js
  - scripts/validate-deck.js
  - scripts/lint-deck.js
  - scripts/ci-validate-fixtures.js
tags:
  - validator
  - refactor
depends_on: []
supersedes: []
resolution: completed
resolved: "2026-09-24"
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm test
    - MARP_AGENT_REQUIRE_VISUAL=1 node scripts/ci-validate-fixtures.js
---

# Validator phase 1: render-measured clipping as the only blocking finding

## Problem

Validation fails on slides that render fine. On the author's eight accepted lab decks (XR-0001), 5 decks exited 1 with 18 findings. All 12 source-heuristic findings were on slides with no visible defect. 2 of the 6 `visual-overflow` findings came from invisible trailing margins, because the check compares `scrollHeight` with `clientHeight`.

## Goal

Implement phase 1 of ADR-0001. Only defects measured on the rendered slide fail validation, and source heuristics become non-blocking hints.

## Acceptance criteria

- [x] Rendering uses Marp's bare template, and every slide is audited for visible text lines and media (`img`, `svg`, `video`, `canvas`, `iframe`, `object`) that extend past the canvas after intersecting with overflow-clipping ancestors.
- [x] Tolerance is 2px for text, and the larger of 2px and 2% of the element's size for media; trailing margins and intentional crops are not reported.
- [x] Clipping is reported as a `content-clipped` `error` naming each element, edge, and overflow; it replaces `visual-overflow`.
- [x] After a successful render, source heuristics are `info` hints, hidden from the text summary unless `--hints` is passed, and `overflow-risk` is dropped.
- [x] When rendering is unavailable, heuristics are `warning`s and the run exits 0 unless `--strict` is set.
- [x] The exit code is 1 only when an `error` exists.
- [x] Every output shows the visual-check status (ISS-0008).
- [x] `scripts/ci-validate-fixtures.js` checks expected errors and hints per fixture.
- [x] The `marp-validator` skill, README, and fixture docs describe the new model.
- [x] On the XR-0001 decks, errors are reported only for slides with visible clipping.

## Out of scope

- Overlap detection (ISS-0021) and rendered minimum font size (ISS-0022).
- Unifying slide numbering (ISS-0006).

## Notes

Implemented on 2026-09-24 in the commit that closes this issue. The implementation also fixes ISS-0007, ISS-0008, and ISS-0020, and the file-URL part of ISS-0012. The skill previously documented `-v --strict-visual`, which `marpx` rejects; it now documents `--strict`.
