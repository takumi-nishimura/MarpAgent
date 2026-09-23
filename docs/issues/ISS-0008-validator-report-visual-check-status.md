---
id: ISS-0008
title: Validator output does not say whether the visual check ran
type: issue
status: open
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

- [ ] The text summary includes a line such as `Visual check: measured` or `Visual check: skipped (<reason>)`.
- [ ] JSON, SARIF (run properties), `report.md`, and `report.json` carry the same status and reason.
- [ ] `--lint` surfaces the fallback the same way as `-v`.
- [ ] Tests force fallback with `MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE=1` and assert the status in each format.
- [ ] `marp-validator/SKILL.md` refers to the new status line instead of inferring fallback from stderr.

## Out of scope

- Changing exit codes for fallback in non-strict mode.

## Files

- `src/deck-validator.js`, `src/visual-overflow.js`
- `scripts/validate-deck.js`, `scripts/lint-deck.js`
- `tests/unit/validate-observability.test.js`
- `.agents/skills/marp-validator/SKILL.md`
