---
id: ISS-0017
title: Add PPTX / HTML / image export and a screenshot output path
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
authors:
- claude-code
scope:
- bin/marpx.js
tags:
- feature
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

# Add PPTX / HTML / image export and a screenshot output path

## Problem

`marpx` exposes only `--pdf` for export (`bin/marpx.js:342-349`). Marp CLI already supports PPTX, standalone HTML, and per-slide images, but users must call `node_modules/.bin/marp` directly. That bypasses the repository config (`marp.config.js` plugins, BudouX, theme set, browser path). `--screenshot` always writes to `os.tmpdir()/marpx-screenshot-<name>-p<N>.png` (`bin/marpx.js:324-328`) and cannot target a chosen path. Neither command lets the user choose the export output path.

## Goal

All common export formats go through `marpx` with the repository config, and the user can choose output paths.

## Acceptance criteria

- [x] `--pptx`, `--html`, and `--images [png|jpeg]` export via `runMarp` with `--config` and `--browser-path`, mutually exclusive with other modes.
- [x] `--output <path>` is accepted by `--pdf`, `--pptx`, `--html`, `--images`, and `--screenshot`. Without it, the current default locations remain.
- [x] `--html` output resolves deck-local and `shared/` assets when opened from its output location, or the limitation is documented.
- [x] Usage text, README, and AGENTS.md command tables list the new options.
- [x] `tests/unit/cli-args.test.js` covers flag validation, and an e2e smoke test exports at least PPTX and HTML.

## Out of scope

- Editable-PPTX conversion (`--pptx-editable`) unless trivial.

## Files

- `bin/marpx.js`
- `README.md`, `AGENTS.md`
- `tests/unit/cli-args.test.js`, `tests/e2e/cli-smoke.spec.js`

## Notes

Implemented in `bin/marpx.js`: `pptx`/`html`/`images` join the mode list so
they conflict with every other mode, and all three dispatch through the
existing `runMarp` helper (`--config` + `--browser-path`). HTML is Marp's
default conversion, so the `html` case passes no format flag. Bare
`--images` defaults to `png` via a small argv pre-pass before `parseArgs`.
`--output` (`-o`) is forwarded to Marp for exports (resolved to an absolute
path) and used directly for `--screenshot`; it is rejected for unrelated
modes. `--images --output out.png` yields `out.001.png`, … per Marp naming.

Verified `--html` asset behavior by loading exported HTML in headless
Chromium: opened from the deck directory (default output), deck-local
`assets/` and the `shared/` symlink resolve with no failed requests; opened
from an outside `--output` directory they all fail. Documented in README.
