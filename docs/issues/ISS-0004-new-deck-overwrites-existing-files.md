---
id: ISS-0004
title: marpx -n overwrites existing deck files without warning
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
authors:
- claude-code
scope:
- scripts/new-deck.js
- bin/marpx.js
tags:
- bug
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

# marpx -n overwrites existing deck files without warning

## Problem

`scripts/new-deck.js:85-93` creates the deck directory and writes every template file (`brief.md` + `slide.md`, or `paper.md` + `README.md`) unconditionally. Running `marpx -n decks/example` on an existing deck silently replaces its authored `slide.md` and `brief.md` with the templates. It also unlinks and recreates `shared` (`scripts/new-deck.js:105-115`) without checking what the path is.

## Goal

Scaffolding never destroys existing authored content unless the user explicitly asks for it.

## Acceptance criteria

- [x] `marpx -n <dir>` exits non-zero without writing anything when any target scaffold file already exists, and names the conflicting files.
- [x] `marpx -n <dir> --force` overwrites, matching the `--force` semantics of `--theme-new`.
- [x] `--force` is accepted with `--new` by `bin/marpx.js` (currently rejected as `--theme-new`-only) and documented in the usage text.
- [x] An existing `shared` entry that is not a symlink is left untouched and reported as an error.
- [x] `tests/unit/new-deck.test.js` covers the refusal, the `--force` overwrite, and the non-symlink `shared` case.

## Out of scope

- Template content changes.

## Files

- `scripts/new-deck.js`
- `bin/marpx.js`
- `tests/unit/new-deck.test.js`

## Notes

Implemented 2026-09-24.

- `scripts/new-deck.js` runs a preflight pass before creating or writing anything: it lstats each scaffold target (`brief.md`/`slide.md` or `paper.md`/`README.md`), exits 1 listing every existing file when `--force` is absent, and points the user at `--force`. lstat is used so broken symlinks still count as conflicts.
- A `shared` entry that exists but is not a symlink is always an error — even under `--force` — because it may hold authored content; it is left untouched and nothing is written. Existing symlinks (including Windows junctions, which lstat reports as symlinks) are still unlinked and recreated, so the Windows branch is unchanged.
- `bin/marpx.js` accepts `--force` with `--new` in addition to `--theme-new`, forwards it to `new-deck.js`, and the usage line now reads "(for --new, --theme-new)".
- Tests added in `tests/unit/new-deck.test.js` (refusal, `--force` overwrite, non-symlink `shared` with and without `--force`, marpx-level forwarding); `tests/unit/cli-args.test.js` updated for the widened `--force` mode check.
