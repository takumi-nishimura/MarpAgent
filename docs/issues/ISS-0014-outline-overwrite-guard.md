---
id: ISS-0014
title: marpx --outline overwrites an edited outline.md without warning
type: issue
status: open
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- scripts/generate-outline.js
- bin/marpx.js
tags:
- bug
- dx
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# marpx --outline overwrites an edited outline.md without warning

## Problem

`scripts/generate-outline.js:56-58` writes `outline.md` next to the brief unconditionally. The workflow expects authors and agents to refine the draft outline (`decks/example/outline.md` is hand-curated and differs substantially from generator output), so re-running `--outline` after a brief change silently discards those edits.

## Goal

Regenerating an outline never destroys manual edits without an explicit request.

## Acceptance criteria

- [ ] If the output file exists, `--outline` exits non-zero without writing and suggests `--force` or `--output <path>`.
- [ ] `--force` overwrites; `bin/marpx.js` accepts `--force` with `--outline` and documents it.
- [ ] Tests cover refusal and forced overwrite.

## Files

- `scripts/generate-outline.js`, `src/outline.js`
- `bin/marpx.js`
- `tests/unit/outline.test.js`, `tests/unit/cli-args.test.js`
