---
id: ISS-0004
title: marpx -n overwrites existing deck files without warning
type: issue
status: open
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- scripts/new-deck.js
- bin/marpx.js
tags:
- bug
depends_on: []
supersedes: []
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

- [ ] `marpx -n <dir>` exits non-zero without writing anything when any target scaffold file already exists, and names the conflicting files.
- [ ] `marpx -n <dir> --force` overwrites, matching the `--force` semantics of `--theme-new`.
- [ ] `--force` is accepted with `--new` by `bin/marpx.js` (currently rejected as `--theme-new`-only) and documented in the usage text.
- [ ] An existing `shared` entry that is not a symlink is left untouched and reported as an error.
- [ ] `tests/unit/new-deck.test.js` covers the refusal, the `--force` overwrite, and the non-symlink `shared` case.

## Out of scope

- Template content changes.

## Files

- `scripts/new-deck.js`
- `bin/marpx.js`
- `tests/unit/new-deck.test.js`
