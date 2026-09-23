---
id: ISS-0013
title: Declare @marp-team/marp-core as a direct dependency
type: issue
status: open
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- package.json
tags:
- chore
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Declare @marp-team/marp-core as a direct dependency

## Problem

`src/marp-pagination.js:4` and four unit tests (`canvas-size`, `theme-css`, `github-alerts`, `budoux-html`) `require("@marp-team/marp-core")`. `package.json` does not list it; it resolves only because npm hoists it from `@marp-team/marp-cli` (currently 4.3.0). A change in marp-cli's dependency tree or package manager layout (pnpm, strict hoisting) breaks `--screenshot`, serve/overview page resolution, and the tests.

## Goal

Every package the code imports is declared, pinned compatibly with the marp-cli release in use.

## Acceptance criteria

- [ ] `@marp-team/marp-core` is in `dependencies`, at a version matching the one marp-cli 4.2.3 resolves.
- [ ] `npm ls @marp-team/marp-core` shows a single deduplicated copy.
- [ ] `--doctor` or a unit test fails if the in-process marp-core version differs from the one marp-cli uses.

## Files

- `package.json`, `package-lock.json`
- `scripts/doctor.js` or `tests/unit/package-json.test.js`
