# MarpAgent Theme Contract

This document defines the engineering contract between deck authors, agent
skills, theme CSS, Tailwind build inputs, and the validator. Visual identity
tokens and rationale live in `designs/<name>/DESIGN.md`.

## Source Of Truth

Theme source lives in `themes/src/`. Compiled CSS in `themes/*.css` is generated
from that source and should be regenerated after theme source changes.

| File | Role |
| :--- | :--- |
| `designs/README.md` | repo-level design index and default pointer |
| `designs/<name>/DESIGN.md` | visual identity, design tokens, and design rationale |
| `themes/src/_generated/<name>-design-tokens.css` | generated Tailwind v4 `@theme` tokens from `designs/<name>/DESIGN.md` |
| `themes/src/<name>.css` | Marp theme entry point for a design |
| `themes/src/_shared/_base.css` | slide canvas, title/header layout, tables, footnotes |
| `themes/src/_shared/_paper.css` | A-series paper layout components using the lab design tokens |
| `themes/src/_shared/_layouts.css` | reusable author-facing layout components |
| `themes/src/_shared/_callouts.css` | GFM alert / HTML callout classes |
| `themes/src/_shared/_typography.css` | typography utilities and emphasis |
| `.agents/skills/` | authoring patterns for agents |
| `src/deck-validator.js` | density and typography enforcement |

## Design And Surface Boundary

A design is the visual identity described by `designs/<name>/DESIGN.md`.
A Marp theme entry is a CSS file that Marp can select with `theme:`.
Those are intentionally separate concepts.

The current default design is `lab`; `muji` is also available as a separate
design and Marp theme. Theme entries support these canvas families:

- `16:9`, selected with `theme: lab` and `size: 16:9`;
- `4:3`, selected with `theme: lab` and `size: 4:3`;
- A-series paper, selected with `theme: lab` and `size: a4-portrait` or
  `size: a4-landscape`;
- custom pixel canvases, selected with `theme: lab` and `size: <width>x<height>`
  such as `400x200`.

Paper-specific layout lives in `themes/src/_shared/_paper.css` and is activated
by the `.paper-header` / `.paper-columns` structure. It is not a separate Marp
theme or `class:` mode. Custom pixel sizes are injected into the active theme
metadata at render time by `src/canvas-size.js`; they are not separate compiled
theme files. Future designs should add a new `designs/<name>/DESIGN.md` and
matching generated token file before remapping canvas behavior.

## Theme Creation Boundary

New visual identities should start from the scaffold command:

```bash
marpx --theme-new <name> --source-url <url> --no-build
```

The scaffold creates:

- `designs/<name>/DESIGN.md`, seeded with the complete `lab` token schema;
- `themes/src/<name>.css`, a Marp theme entry that imports the matching
  generated token CSS and shared components;
- `fixtures/<name>-slide.md`, a smoke deck for validation.

After scaffolding, edit `DESIGN.md` first. Literal design values belong there,
not in `themes/src/<name>.css`. Compile with `marpx --theme <name>`
only after the design rationale and tokens have been adapted from the source.

## Tailwind Boundary

Tailwind compiles `themes/src/*.css` into `themes/*.css`. Automatic class
detection is disabled with `source(none)` so prose documents do not mutate
compiled theme output by mentioning class names.

Before Tailwind runs, `marpx --theme <name>` regenerates
`themes/src/_generated/<name>-design-tokens.css` from
`designs/<name>/DESIGN.md` with `@google/design.md`. In watch mode, the matching
`DESIGN.md` files are watched and the generated CSS is refreshed when the design
tokens change.

Registered Tailwind sources:

- `decks/**/*.md`
- `fixtures/**/*.md`
- `.agents/skills/**/*.md`

Design documents are not class-scanning sources. They are token sources. Each
theme entry imports only its matching generated token CSS.

Useful commands:

- `npm run design:lint`
- `npm run design:tokens`
- `npm run design:tokens:check`
- `marpx --theme`

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
