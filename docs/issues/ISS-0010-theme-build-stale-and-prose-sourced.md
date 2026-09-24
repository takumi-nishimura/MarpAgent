---
id: ISS-0010
title: Compiled theme CSS is stale and depends on skill prose
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-24'
authors:
- claude-code
scope:
- themes/
tags:
- bug
- ci
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

- [x] The utility set comes from an explicit source: `@source inline(...)` safelist, the fixtures, and/or the decks. Skill prose no longer contributes candidates.
- [x] A test or CI step builds each theme to a temporary path and fails if the output differs from `themes/<name>.css`.
- [x] The documented policy states whether decks may use utilities outside the safelist. If they may, validation warns when a deck uses a class that is absent from the compiled theme.
- [x] The committed `themes/*.css` are regenerated under the new configuration.

## Out of scope

- Visual redesign of the themes.

## Files

- `themes/src/lab.css`, `themes/src/muji.css`, `themes/src/toshiba.css`, `themes/*.css`
- `tests/unit/theme-css.test.js` or `.github/workflows/quality-gate.yml`
- `docs/theme-contract.md`

## Notes

- 2026-09-24: Theme entries keep `@import "tailwindcss" source(none);` and register no file globs. The only Tailwind utilities come from `@source inline(...)` in `themes/src/_shared/_safelist.css`: `text-xs text-sm text-xl self-start self-center self-end`. They pair with the hand-written classes of the same name, and keeping them preserves the rendered line-height and `align-self`. Every other author-facing class is hand-written in `themes/src/_shared/`, so the prose-derived utilities (`.fixed`, `.static`, `.lowercase`, `.hidden`, `.container`, `.flex`, `.grid`, `.table`, `.border`, `.transition`, and others) are gone. The scaffold template in `scripts/new-theme.js` follows the same layout.
- Removing the glob scan also dropped `--color-tertiary` from `lab` and `muji`. Only scanned prose had kept that variable, but the paper template and `decks/example-paper` use it in deck-local styles. Entries now import their generated tokens with `theme(static)`, so every `DESIGN.md` token is defined in the compiled theme whatever decks exist. This matters for downstream repositories that merge this one and rebuild the themes.
- Leader review found a downstream regression. The downstream deck repository rebuilds these themes from its own decks, and its deck `2026/02-20-midterm-examination` uses `font-size: var(--text-lg)`. `--text-lg` had been emitted only because the old scan saw `text-lg`. An `@theme static` block in `_safelist.css` now restates Tailwind's font-size scale (`--text-xs` through `--text-9xl` and the `--text-*--line-height` companions), so every theme always defines it. A test compares those values with `tailwindcss/theme.css`. No other documented author variable depends on Tailwind emission. The guaranteed variables (all design tokens, the text scale, and the hand-written compatibility variables) are listed in `docs/theme-contract.md` under "Guaranteed CSS variables". I rendered the downstream deck read-only with the downstream themes and with this build: 24 of 24 slides match. The intermediate build without the text scale changed slide 6 (the agenda).
- Policy (`docs/theme-contract.md`, "Deck author policy"): decks may use only the classes the compiled theme defines and classes they define in their own styles. Utilities outside the safelist are not available. Adding one means changing the safelist, rebuilding, and documenting it. Because the policy does not allow them, this change adds no validator warning. A warning for classes missing from the compiled theme remains a possible follow-up.
- `tests/unit/theme-css.test.js` rebuilds each compiled theme to a temporary directory and fails when the result differs from `themes/<name>.css`. It takes about 0.2 s for all three themes. The file also checks the shape of the safelist and the source files, the absence of prose-derived utilities, that every design token and the full text scale (including `--text-lg`) are defined, and that every class and every `var(--...)` used in fixtures, example decks, templates, skills, and the README exists in every compiled theme.
- Regenerated `themes/*.css`. Screenshots of all 31 rendered slides are byte-identical before and after (`decks/example/slide.md`, `decks/example-paper/paper.md`, and every fixture deck), and the class sets in the rendered DOM are unchanged.
