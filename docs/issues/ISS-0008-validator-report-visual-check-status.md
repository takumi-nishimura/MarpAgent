---
id: ISS-0008
title: Validator output does not say whether the visual check ran
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- src/deck-validator.js
- scripts/validate-deck.js
- scripts/lint-deck.js
tags:
- dx
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

# Validator output does not say whether the visual check ran

## Problem

When the Playwright visual check fails, the validator silently falls back to heuristics:

- `-v` emits the fallback only as JSON lines on stderr (`scripts/validate-deck.js:14-18`, `src/visual-overflow.js:175-198`). The stdout summary, `--format json`, SARIF, and `report.md` / `report.json` contain no visual-check status.
- `--lint` calls `validateDeckWithVisualCheck` without `onDiagnostic` (`scripts/lint-deck.js:105-107`), so a fallback produces no signal at all.

`.agents/skills/marp-validator/SKILL.md:21` tells agents not to present `Findings: 0` from fallback as a verified render, but the tool gives them no reliable way to detect fallback.

## Goal

Every validator output states whether pixel measurement ran and, if not, why.

## Acceptance criteria

- [x] The text summary includes a line such as `Visual check: measured` or `Visual check: skipped (<reason>)`.
- [x] JSON, SARIF (run properties), `report.md`, and `report.json` carry the same status and reason.
- [x] `--lint` surfaces the fallback the same way as `-v`.
- [x] Tests force fallback with `MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE=1` and assert the status in each format.
- [x] `marp-validator/SKILL.md` refers to the new status line instead of inferring fallback from stderr.

## Out of scope

- Changing exit codes for fallback in non-strict mode.

## Files

- `src/deck-validator.js`, `src/visual-overflow.js`
- `scripts/validate-deck.js`, `scripts/lint-deck.js`
- `tests/unit/validate-observability.test.js`
- `.agents/skills/marp-validator/SKILL.md`

## Notes

Resolved by ISS-0019 on 2026-09-24. The text summary prints `Visual check: measured` or `Visual check: skipped (<reason>)`. JSON and `report.json` carry `visualCheck`, SARIF carries it in `runs[0].properties.visualCheck`, and `report.md` has a `Visual check:` line. `--lint` shares the summary formatter. `tests/unit/validate-observability.test.js` covers the text, JSON, and SARIF output on forced fallback; `tests/unit/validate-deck.test.js` covers the report files.
