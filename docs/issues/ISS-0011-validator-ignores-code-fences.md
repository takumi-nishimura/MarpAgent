---
id: ISS-0011
title: Bullet counting and --autofix operate inside code fences
type: issue
status: open
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- src/deck-validator.js
- scripts/lint-deck.js
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

# Bullet counting and --autofix operate inside code fences

## Problem

- `countTopLevelBullets` (`src/deck-validator.js:64-70`) scans `stripNonContent(raw)` line by line without tracking code fences, unlike `getVisibleLines`. A code block containing `- item` or `1. step` lines (YAML, Markdown, or shell examples) counts toward `dense-bullets`, `figure-text-density`, `comparison-overpacked`, and `overflow-risk`.
- `applyAutoFixes` (`scripts/lint-deck.js:69-89`) runs global regex replacements over the whole file, so `--lint --autofix` rewrites `<small>…</small>` and `text-xs2` / `text-xs3` inside code examples as well. It also rewrites the file in place with no preview.

## Goal

Rules and autofixes ignore fenced code content, and autofix never changes code examples.

## Acceptance criteria

- [ ] Bullet-like lines inside fenced code blocks (``` and ~~~) are not counted.
- [ ] `--autofix` leaves fenced code blocks and inline code spans byte-identical.
- [ ] Unit tests cover both cases.

## Out of scope

- A dry-run mode for autofix (consider it in ISS-0018).

## Files

- `src/deck-validator.js`
- `scripts/lint-deck.js`
- `tests/unit/validate-deck.test.js`, `tests/unit/lint-deck.test.js`
