# MarpAgent Theme Contract

This document defines the engineering contract between deck authors, agent
skills, theme CSS, Tailwind build inputs, and the validator. Visual identity
tokens and rationale live in `designs/<name>/DESIGN.md`.

## Source Of Truth

Theme source lives in `themes/src/`. Compiled CSS in `themes/*.css` is generated
from that source and must be regenerated with `marpx --theme` after theme source
changes. `npm test` rebuilds every theme to a temporary path and fails when the
result differs from the tracked `themes/<name>.css`.

| File | Role |
| :--- | :--- |
| `designs/README.md` | repo-level design index and default pointer |
| `designs/<name>/DESIGN.md` | visual identity, design tokens, and design rationale |
| `themes/src/_generated/<name>-design-tokens.css` | generated Tailwind v4 `@theme` tokens from `designs/<name>/DESIGN.md` |
| `themes/src/<name>.css` | Marp theme entry point for a design |
| `themes/src/_shared/_safelist.css` | the complete list of Tailwind-generated utilities and always-emitted Tailwind variables |
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

Tailwind compiles `themes/src/*.css` into `themes/*.css`. Each theme entry
imports Tailwind with `source(none)` and registers no file globs, so no Markdown
file (deck, fixture, template, skill, or README) contributes utility
candidates. The compiled CSS depends only on tracked theme sources and is the
same in this repository and in any downstream repository that merges it,
whatever decks exist there.

The complete set of Tailwind-generated utilities is the `@source inline(...)`
safelist in `themes/src/_shared/_safelist.css`:

| Utility | Why it is safelisted |
| :------ | :------------------- |
| `text-xs`, `text-sm`, `text-xl` | adds Tailwind's paired line-height to the theme's em-based `.text-*` sizes |
| `self-start`, `self-center`, `self-end` | adds `align-self` to the theme's margin-based `.self-*` placement |

All other author-facing classes (layout components, callouts, typography,
colors, placement) are hand-written in `themes/src/_shared/` and do not depend
on Tailwind candidate detection.

### Guaranteed CSS variables

Tailwind emits a theme variable only when a utility or theme rule uses it, so
variable availability is also made explicit. Every compiled theme defines these
variables, and deck-local styles (`style:`, `<style>`, inline `style="..."`) may
reference them:

- every design token in `designs/<name>/DESIGN.md`, such as `--color-tertiary`
  or `--spacing-md`. Each entry imports its generated token CSS with
  `theme(static)`. The paper template uses
  `--paper-accent: var(--color-tertiary)`.
- Tailwind's font-size scale `--text-xs`, `--text-sm`, `--text-base`,
  `--text-lg`, `--text-xl`, and `--text-2xl` through `--text-9xl`, with their
  `--text-*--line-height` companions. An `@theme static` block in
  `_safelist.css` declares them with Tailwind's default values, for example
  `font-size: var(--text-lg)`.
- the compatibility and component variables listed under Token Boundary and in
  `.agents/skills/marp-components/references/theme-variables.md`. The
  hand-written theme CSS defines them.

Other Tailwind default theme variables, such as its color palette, font
families, or `--spacing`, are emitted only when a theme rule uses them. Deck
styles should not depend on them.

### Deck author policy

Decks may use only classes that the compiled theme defines (the components and
utilities documented in this contract and in `.agents/skills/`) and classes the
deck defines itself in a `style:` directive or `<style>` block. Other Tailwind
utilities, such as `flex`, `mt-4`, or `grid-cols-2`, are not available: there is
no per-deck Tailwind build, and serve, preview, validation, and PDF export use
the tracked compiled CSS. To make a utility available, add it to the safelist,
run `marpx --theme`, document it here, and commit the rebuilt `themes/*.css`.

`tests/unit/theme-css.test.js` checks that the compiled themes are fresh, that
no prose-derived utilities are present, that every design token and the full
text scale are defined, and that every class and every `var(--...)` used in
fixtures, example decks, templates, skills, and the README exists in every
compiled theme. The validator does not yet warn when a deck uses a class that
the compiled theme does not define.

Before Tailwind runs, `marpx --theme <name>` regenerates
`themes/src/_generated/<name>-design-tokens.css` from
`designs/<name>/DESIGN.md` with `@google/design.md`. In watch mode, the matching
`DESIGN.md` files are watched and the generated CSS is refreshed when the design
tokens change.

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

Template layout labels such as `two-column` are not theme primitives. The
`two-column` template is authored with the `.col` class below.

| Class | Purpose |
| :---- | :------ |
| `.col` | flexible row for two or more columns |
| `.centered` | body-area vertical centering for agenda/closing slides |
| `.fit` | shrink-to-content block with max-width guard |
| `.summary-box` | fit-to-content call-to-action or takeaway box |
| `.box` | content-placement wrapper outside `.col` |
| `.fill` | body-level layout fills remaining height above the footer safe area |
| `.place-*` | content placement inside `.col > div` or `.box` |
| `.self-*` | self-placement for fit-to-content components |
| `.col.with-summary` | column layout whose per-column `.gap-box` sits at the bottom |
| `.gap-box` | per-column conclusion box inside `.col.with-summary` |
| `.feature-grid` | 2xN compact card grid |
| `.col.visual` | figure/text variant of the `.col`-based template |
| `.metric-grid` | compact numeric or KPI cards |
| `.timeline` | horizontal process or step sequence with directional arrows; `ol` adds simple numeric markers |

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

Discouraged authoring escapes:

- `.text-xs2`
- `.text-xs3`
- `<small>`
- tiny inline `font-size` values

The theme may keep legacy render utilities for compatibility. The validator
judges the rendered size rather than these names: `text-too-small` fails text
below the readable floor wherever it comes from, including scoped `<style>`
overrides and transforms. The source heuristic `typography-drift` names the
escapes only when rendering is unavailable.

## Validation Contract

The validator owns density limits. Component templates should help authors stay
inside those limits without shrinking text:

- split dense content before reducing type size;
- count top-level bullets across columns;
- count callout body text as body text;
- keep multi-column and `feature-grid` slides to roughly two top-level bullets
  per column/card.
