---
id: ISS-0018
title: Consolidate --lint and -v into one validation command
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
authors:
- claude-code
scope:
- scripts/lint-deck.js
- scripts/validate-deck.js
- bin/marpx.js
tags:
- refactor
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

# Consolidate --lint and -v into one validation command

## Problem

`scripts/lint-deck.js` and `scripts/validate-deck.js` duplicate argument parsing, output formatting, and exit-code handling. `--lint` is effectively `-v` without `--report-dir`, without diagnostics, and without the heuristic fallback when visual validation throws. Its only unique feature is `--autofix`. The two commands have diverged: `--lint` drops visual-check diagnostics (`scripts/lint-deck.js:105-107`), and `-v` cannot autofix. The README and skills present them as separate tools, so users and agents must choose between near-identical commands.

## Goal

One validation entry point with a single behavior. Autofix is an option of it.

## Acceptance criteria

- [x] `-v` accepts `--autofix`, and the shared implementation lives in one module.
- [x] `--lint` either becomes an alias of `-v` that prints a deprecation notice or is removed; the choice is recorded in the issue before implementation.
- [x] `--autofix` gains `--dry-run` (or prints a diff) so changes can be reviewed before writing.
- [x] README, AGENTS.md, and `.agents/skills/marp-validator` document the single command.
- [x] Existing `lint-deck` and `validate-deck` tests pass against the consolidated command or are merged.

## Out of scope

- Changes to rule logic.

## Notes

Coordinate with ISS-0008 (diagnostics) and ISS-0011 (autofix scope).

2026-09-24: Leader decision for the open criterion — keep `--lint` as an
alias of `-v` that prints a one-line deprecation notice on stderr (and still
works with `--autofix`), rather than removing it. The shared
parsing/output/exit logic of `scripts/lint-deck.js` and
`scripts/validate-deck.js` moves into one module (`src/validate-cli.js`) so
both entry points use it; lint therefore also reports diagnostics and
supports `--report-dir`. `--autofix` gains `--dry-run`, which prints a
unified diff on stderr without writing. Exit codes and output formats are
unchanged otherwise.

2026-09-24: Implemented. The shared module is `src/validate-cli.js`
(`parseArgs`, autofix, unified-diff, and run/exit logic);
`scripts/validate-deck.js` is a thin entry point and
`scripts/lint-deck.js` only adds the deprecation notice. `bin/marpx.js`
forwards `--report-dir`, `--autofix`, `--dry-run`, `--strict`, `--hints`,
and `--format` identically for `-v` and `--lint`. `--dry-run` emits a
unified diff on stderr so stdout keeps the requested `--format`.

## Files

- `scripts/lint-deck.js`, `scripts/validate-deck.js`, `bin/marpx.js`
- `tests/unit/lint-deck.test.js`, `tests/unit/validate-deck.test.js`, `tests/unit/cli-args.test.js`
- `README.md`, `AGENTS.md`, `.agents/skills/marp-validator/`
