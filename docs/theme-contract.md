# MarpAgent Theme Contract

This document defines the engineering contract between deck authors, agent
skills, theme CSS, Tailwind build inputs, and the validator. Visual identity
tokens and rationale live in `designs/<name>/DESIGN.md`.

## Source Of Truth

Theme source lives in `themes/src/`. Compiled CSS in `themes/*.css` is generated
from that source and should be regenerated after theme source changes.

| Surface | Role |
| :------ | :--- |
| `designs/README.md` | repo-level design index and default pointer |
| `designs/lab/DESIGN.md` | lab visual identity, design tokens, and design rationale |
| `themes/src/_generated/lab-design-tokens.css` | generated Tailwind v4 `@theme` tokens from `designs/lab/DESIGN.md` |
| `themes/src/_shared/_base.css` | slide canvas, title/header layout, tables, footnotes |
| `themes/src/_shared/_layouts.css` | reusable author-facing layout components |
| `themes/src/_shared/_callouts.css` | GFM alert / HTML callout classes |
| `themes/src/_shared/_typography.css` | typography utilities and emphasis |
| `.agents/skills/` | authoring patterns for agents |
| `src/deck-validator.js` | density and typography enforcement |

## Tailwind Boundary

Tailwind compiles `themes/src/*.css` into `themes/*.css`. Automatic class
detection is disabled with `source(none)` so prose documents do not mutate
compiled theme output by mentioning class names.

Before Tailwind runs, `marpx --theme` regenerates
`themes/src/_generated/lab-design-tokens.css` from `designs/lab/DESIGN.md` with
`@google/design.md`. In watch mode, `designs/lab/DESIGN.md` is watched and the
generated CSS is refreshed when the design tokens change.

Registered Tailwind sources:

- `decks/**/*.md`
- `fixtures/**/*.md`
- `.agents/skills/**/*.md`

Design documents are not class-scanning sources. They are token sources. The
generated lab token CSS is imported by both `themes/src/lab.css` and
`themes/src/poster.css`.

Useful commands:

- `npm run design:lint`
- `npm run design:tokens`
- `npm run design:tokens:check`
- `npm run marpx -- --theme`

## Component Boundary

Agents should not require authors to paste reusable CSS into `slide.md`.
Reusable layout patterns belong in the theme and are referenced by class name
from templates.

Built-in layout primitives:

| Class | Purpose |
| :---- | :------ |
| `.col` | flexible two-column row |
| `.centered` | body-area vertical centering for agenda/closing slides |
| `.fit` | shrink-to-content block with max-width guard |
| `.summary-box` | short call-to-action or takeaway box |
| `.gap-cols` | three-column equal-height variant used with `.col` |
| `.gap-box` | per-column conclusion box inside `.gap-cols` |
| `.feature-grid` | 2xN compact card grid |

These components should preserve the current `lab` visual style unless a
separate visual redesign change explicitly updates it.

## Token Boundary

Theme components may depend on stable compatibility variables. These variables
should map back to design tokens or derived values unless a legacy export
requires otherwise.

| Variable | Purpose |
| :------- | :------ |
| `--color-deck-gray` | shared muted gray |
| `--bg-gray-5` | subtle panel background |
| `--text-xs`, `--text-sm`, `--text-xl` | typography scale |
| `--logos-dark`, `--logos-light` | logo image lists |
| `--logo-title-background-size` | title logo background-size override |
| `--logo-header-size` | non-title header logo height |

New semantic tokens can be proposed later, but adding them should not be mixed
with a visual redesign unless that is the explicit task.

## Typography Contract

Allowed author-facing text utilities:

- `.text-xl5`, `.text-xl4`, `.text-xl3`, `.text-xl2`, `.text-xl`, `.text-lg`
- `.text-sm`
- `.text-xs` for captions, dense tables, and fine print

Validator-disallowed authoring escapes:

- `.text-xs2`
- `.text-xs3`
- `<small>`
- tiny inline `font-size` values

The theme may keep legacy render utilities for compatibility, but the validator
should reject the disallowed escapes and allow `.text-xs`.

## Validation Contract

The validator owns density limits. Component templates should help authors stay
inside those limits without shrinking text:

- split dense content before reducing type size;
- count top-level bullets across columns;
- count callout body text as body text;
- keep `three-column` and `feature-grid` slides to roughly two top-level bullets
  per column/card.
