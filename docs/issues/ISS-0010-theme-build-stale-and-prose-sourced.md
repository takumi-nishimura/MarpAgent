---
id: ISS-0010
title: Compiled theme CSS is stale and depends on skill prose
type: issue
status: open
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- themes/
tags:
- bug
- ci
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Compiled theme CSS is stale and depends on skill prose

## Problem

The theme sources scan these globs for Tailwind utility candidates (`themes/src/{lab,muji,toshiba}.css:10-12`):

```css
@source "../../decks/**/*.md";
@source "../../fixtures/**/*.md";
@source "../../.agents/skills/**/*.md";
```

1. **Prose in skill files generates CSS.** Words such as "fixed", "static", and "lowercase" in skill text become utilities. Rebuilding on 2026-09-23 adds `.fixed`, `.static`, and `.lowercase` to all three compiled themes, which means the committed `themes/*.css` were not rebuilt after c84a953 edited the skills.
2. **Nothing checks freshness.** CI (`npm run quality:gate:strict`) checks design-token freshness (`tests/unit/theme-css.test.js:265`) but not whether `themes/*.css` matches a fresh build.
3. **Deck output depends on the last rebuild.** A Tailwind class newly used in a deck has no effect until someone runs `marpx --theme`. Serve, preview, validate, and PDF export do not rebuild, and the shared compiled CSS changes whenever any deck adds a class.

## Goal

Compiled themes are reproducible from tracked sources, CI detects stale builds, and utility availability does not depend on documentation wording.

## Acceptance criteria

- [ ] The utility set comes from an explicit source: `@source inline(...)` safelist, the fixtures, and/or the decks. Skill prose no longer contributes candidates.
- [ ] A test or CI step builds each theme to a temporary path and fails if the output differs from `themes/<name>.css`.
- [ ] The documented policy states whether decks may use utilities outside the safelist. If they may, validation warns when a deck uses a class that is absent from the compiled theme.
- [ ] The committed `themes/*.css` are regenerated under the new configuration.

## Out of scope

- Visual redesign of the themes.

## Files

- `themes/src/lab.css`, `themes/src/muji.css`, `themes/src/toshiba.css`, `themes/*.css`
- `tests/unit/theme-css.test.js` or `.github/workflows/quality-gate.yml`
- `docs/theme-contract.md`
