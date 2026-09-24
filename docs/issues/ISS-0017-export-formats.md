---
id: ISS-0017
title: Add PPTX / HTML / image export and a screenshot output path
type: issue
status: open
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- bin/marpx.js
tags:
- feature
- dx
depends_on: []
supersedes: []
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

- [ ] `--pptx`, `--html`, and `--images [png|jpeg]` export via `runMarp` with `--config` and `--browser-path`, mutually exclusive with other modes.
- [ ] `--output <path>` is accepted by `--pdf`, `--pptx`, `--html`, `--images`, and `--screenshot`. Without it, the current default locations remain.
- [ ] `--html` output resolves deck-local and `shared/` assets when opened from its output location, or the limitation is documented.
- [ ] Usage text, README, and AGENTS.md command tables list the new options.
- [ ] `tests/unit/cli-args.test.js` covers flag validation, and an e2e smoke test exports at least PPTX and HTML.

## Out of scope

- Editable-PPTX conversion (`--pptx-editable`) unless trivial.

## Files

- `bin/marpx.js`
- `README.md`, `AGENTS.md`
- `tests/unit/cli-args.test.js`, `tests/e2e/cli-smoke.spec.js`
