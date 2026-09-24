---
id: ISS-0013
title: Declare @marp-team/marp-core as a direct dependency
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
authors:
- claude-code
scope:
- package.json
tags:
- chore
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

# Declare @marp-team/marp-core as a direct dependency

## Problem

`src/marp-pagination.js:4` and four unit tests (`canvas-size`, `theme-css`, `github-alerts`, `budoux-html`) `require("@marp-team/marp-core")`. `package.json` does not list it; it resolves only because npm hoists it from `@marp-team/marp-cli` (currently 4.3.0). A change in marp-cli's dependency tree or package manager layout (pnpm, strict hoisting) breaks `--screenshot`, serve/overview page resolution, and the tests.

## Goal

Every package the code imports is declared, pinned compatibly with the marp-cli release in use.

## Acceptance criteria

- [x] `@marp-team/marp-core` is in `dependencies`, at a version matching the one marp-cli 4.2.3 resolves.
- [x] `npm ls @marp-team/marp-core` shows a single deduplicated copy.
- [x] `--doctor` or a unit test fails if the in-process marp-core version differs from the one marp-cli uses.

## Notes

- Declared `@marp-team/marp-core` as an exact `4.3.0` dependency (installed with `--save-exact`), matching the version `@marp-team/marp-cli` 4.2.3 resolves via its `^4.1.0` range and matching the repo's exact-pin style for marp-cli.
- `npm ls @marp-team/marp-core` reports one copy: a top-level `4.3.0` with marp-cli's entry marked `deduped`.
- Chose the unit-test option over a `--doctor` check: `tests/unit/package-json.test.js` now asserts the declared version equals the version marp-cli resolves (via `require.resolve` with `paths` anchored at marp-cli's package directory) and that the in-process `require("@marp-team/marp-core/package.json").version` matches it, so a drift or a nested second copy fails `npm test`.

## Files

- `package.json`, `package-lock.json`
- `scripts/doctor.js` or `tests/unit/package-json.test.js`
