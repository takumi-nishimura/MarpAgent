---
id: ISS-0014
title: marpx --outline overwrites an edited outline.md without warning
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
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
resolution: completed
resolved: '2026-09-24'
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

- [x] If the output file exists, `--outline` exits non-zero without writing and suggests `--force` or `--output <path>`.
- [x] `--force` overwrites; `bin/marpx.js` accepts `--force` with `--outline` and documents it.
- [x] Tests cover refusal and forced overwrite.

## Files

- `scripts/generate-outline.js`, `src/outline.js`
- `bin/marpx.js`
- `tests/unit/outline.test.js`, `tests/unit/cli-args.test.js`

## Notes

Implemented 2026-09-24.

- `generateOutlineFile` (`src/outline.js`) lstats the resolved output path before reading the brief and throws `refusing to overwrite existing file: <path>` when it exists and `options.force` is absent; the message points at `--force` and `--output <path>`. lstat is used so broken symlinks still count as conflicts, matching the ISS-0004 guard in `new-deck.js`.
- `scripts/generate-outline.js` parses `--force`, shows it in the usage string, and catches `generateOutlineFile` errors to print a clean `Error: ...` line (previously the strict-brief failure also surfaced as an uncaught stack trace).
- `bin/marpx.js` accepts `--force` with `--outline` in addition to `--new`/`--theme-new`, forwards it to `generate-outline.js`, and the usage line now reads "(for --new, --theme-new, --outline)". The mode error message was widened to match.
- Tests: library-level refusal and forced overwrite in `tests/unit/outline.test.js`; the widened `--force` mode check and an end-to-end `marpx --outline`/`--force` run in `tests/unit/cli-args.test.js`.
