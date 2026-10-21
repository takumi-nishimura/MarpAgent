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
| `src/deck-validator.js` | rendered readability checks and source hints |

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
| `grid`, `grid-cols-2`, `grid-cols-3`, `grid-cols-12` | plain equal-column or twelve-track grids |
| `col-span-3`, `col-span-4`, `col-span-5`, `col-span-6`, `col-span-7`, `col-span-8`, `col-span-9`, `col-span-12` | unequal widths within a twelve-track grid |
| `flex`, `flex-row`, `flex-col`, `flex-wrap`, `flex-1`, `shrink-0` | plain rows, stacks, and flexible sizing |
| `gap-2`, `gap-4`, `gap-6`, `gap-8`; the same sizes for `gap-x-*` and `gap-y-*` | shared spacing between items; Tailwind's quarter-rem spacing scale |
| `items-start`, `items-center`, `items-end`, `items-stretch` | alignment on the cross axis |
| `justify-start`, `justify-center`, `justify-end`, `justify-between`, `content-start` | alignment within available space |
| `min-w-0`, `min-h-0`, `w-full`, `h-full`, `max-w-full`, `max-h-full` | container sizing and intrinsic-size guards |
| `table-fixed`, `tabular-nums` | explicit HTML table layout and numeric typography |
| `text-xs`, `text-sm`, `text-xl` | adds Tailwind's paired line-height to the theme's em-based `.text-*` sizes |
| `self-start`, `self-center`, `self-end` | adds `align-self` to the theme's margin-based `.self-*` placement |

All other author-facing classes (layout components, callouts, typography,
colors, placement) are hand-written in `themes/src/_shared/` and do not depend
on Tailwind candidate detection.

Layout utilities do not choose a color, surface, border, or font size. Use them
on plain wrapper elements to compose the existing content components. Do not
mix `grid` or `flex` on a container already controlled by `.col`, `.box`, or
another layout component. Unlayered element styles (for example a figure's
width or a heading's margin) retain precedence over layered Tailwind utilities;
put sizing on a plain wrapper rather than assuming it overrides the component.
`h-full` needs a parent with a definite height; `.fill` on a body-level wrapper
is the existing way to use the remaining slide height.

[`template/layouts.md`](../template/layouts.md) is the executable recipe source
for comparison tables, evidence with context, and process rows.
[`template/README.md`](../template/README.md) explains how to adapt it. Skills
reference these recipes instead of maintaining another copy of their markup.
Choose the structure from the content relationship; a recipe is not a quota
for columns, cards, or slides.

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
- Tailwind's `--spacing` scale, emitted by the shared gap and sizing utilities.
  It is `0.25rem`; gap values therefore scale with the rendered root text size.
- the compatibility and component variables listed under Token Boundary and in
  `.agents/skills/marp-components/references/theme-variables.md`. The
  hand-written theme CSS defines them.

Other Tailwind default theme variables, such as its color palette or font
families, are emitted only when a theme rule uses them. Deck
styles should not depend on them.

### Deck author policy

Decks may use only classes that the compiled theme defines (the components and
utilities documented in this contract and in `.agents/skills/`) and classes the
deck defines itself in a `style:` directive or `<style>` block. Other Tailwind
utilities, arbitrary values, and responsive variants are not available: there is
no per-deck Tailwind build, and serve, preview, validation, and PDF export use
the tracked compiled CSS. To make a utility available, add it to the safelist,
run `marpx --theme`, document it here, and commit the rebuilt `themes/*.css`.

`tests/unit/theme-css.test.js` checks that the compiled themes are fresh, that
no prose-derived utilities are present, that every design token and the full
text scale are defined, and that every class and every `var(--...)` used in
fixtures, example decks, templates, skills, and the README exists in every
compiled theme. The validator reports undefined or statically unknown classes
as non-blocking hints (`--hints`), including original source lines and slide/page
identity. It inventories active compiled CSS and deck-local selectors; name
presence does not establish computed applicability. See
[layout adjustments and class diagnostics](layout-adjustments.md) for the
adjustment vocabulary, override rules, diagnostic fields, and coverage limits.

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
Compose plain wrappers with the supported Tailwind utilities, then add content
components as needed. Reusable components belong in the theme and are referenced
by class name from templates; a deck-specific exception may use scoped CSS.

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
| `.body` | opt-in remaining-area composition with caption-aware media sizing |
| `.figure-natural` | keep authored media dimensions inside an opted-in `.body` |
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

### Remaining body area and figures

Use one direct `.body` child on a regular slide to opt into remaining-area
layout. The section reserves the actual header height, the top gap, all
top-level headings and introductory text, and the bottom safe area. A heading
that wraps to another line reduces the body by that line's height. This
contract does not estimate a heading's height or change the composition at
runtime. Title, paper, and `_scroll` slides keep their existing layout systems.

```markdown
## Result and interpretation

<div class="body col visual" style="--visual-left: 2; --visual-right: 1">
<div>
<figure>
<img src="assets/img/result.png" alt="Describe the result" />
<figcaption>Source, conditions, and qualifications</figcaption>
</figure>
</div>
<div class="place-middle">

The figure supplies the evidence. Explain its implication here.

</div>
</div>
```

`.body` is a column flex container; `.body.col` is a row whose columns stretch
to the available height. `.box` and `.col > div` keep the existing `.place-*`
controls: top/middle/bottom/spread vertically and left/center/right horizontally.
An explicit parent placement takes precedence over a `.fit` component's default
auto margins; deliberate child `.self-*` placement still takes precedence.
Use `.body.box` for one content area. Use a nested `.box.fill` or `.col.fill`
when another block, such as a column heading, precedes the area that must grow.
An anonymous nested wrapper does not establish the height needed by a figure
or `h-full`. The height chain must run through the direct `.body`, stretching
columns, and any nested `.fill` wrappers. Avoid `h-full` beside a heading or
caption: it requests the parent's entire height before reserving those siblings.

Within that chain, each `figure` shares available height with its sibling
figures. Its direct `img`, `video`, or `svg` children share the height left after
the natural caption height and gaps. Images and videos use `object-fit: contain`;
SVG keeps its authored `viewBox` and `preserveAspectRatio`. A second caption line
reduces the media area instead of pushing the caption below the body. Stacking
media in one figure also reserves its final caption. Text keeps its font size
and natural height. Oversized text/captions remain visible to rendered clipping
and overlap diagnostics; the theme does not hide or scroll excess content.

| Variable | Default | Scope |
| :------- | :------ | :---- |
| `--body-top-gap` | `10px` | space below a header, or above the first content without one |
| `--body-bottom-safe` | `48px` | reserved space above the slide bottom/padding for footnotes, footer, and pagination |
| `--body-gap` | `0.5em` | vertical gaps in the body and its column boxes |
| `--col-gap` | `1rem` | column gaps; `.col.visual` accepts its existing `--visual-gap` override |
| `--figure-gap` | `0.5em` | gaps between direct media and caption inside fitting figures |
| `--visual-left`, `--visual-right` | `1.15`, `0.85` | existing first/last column width weights |

Set ratios on the `.col.visual` wrapper and gaps on the smallest relevant
wrapper. These controls are independent of `.place-*`. For more columns use
explicit `style="flex: N"` weights on children, or the supported grid utilities
inside a `.fill` wrapper. Do not combine competing `grid`/`flex` display utilities
with `.col` or `.box` on the same element.

When constraints compete, first establish that height chain, then choose the
column ratio that gives the labels and caption enough width. Adjust the body
or figure gap if needed. To allocate more height to one stacked figure, set its
`style="flex: 2"` weight. To limit a whole media/caption group, set the figure's
`style="flex: none; height: 280px"`; a bare media `height: 100%` would leave no
caption allowance. Increase `--body-bottom-safe` for a taller footnote/footer.
If the required text itself is too tall, revise or split the slide after a
render; reducing the media cannot make that text fit.

Existing `.fill`-only decks retain their header margins, bottom reserve, and
natural figure behavior. No deck rewrite is required. Opt in one slide at a
time by adding `.body` to its direct wrapper (for example,
`class="box fill"` becomes `class="body box"`, or `class="col visual fill"`
becomes `class="body col visual"`) and inspect the render. The new defaults
change media height allocation and reserve `48px`, rather than the legacy
`.fill` reserve of `1.25em`.

For intentionally fixed media inside a new body, add `.figure-natural` to
that figure. Its media keep their authored inline width/height and ordinary
flow, so the author remains responsible for fitting the group. Explicit inline
`object-fit: cover`, `object-position`, SVG viewport settings, and deliberate
crop remain authored choices. A fitting figure still honors inline crop;
`.figure-natural` is needed when the inline dimensions themselves must be fixed.
These overrides do not erase source attribution or caption qualifications.

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

The shipped themes import Noto Sans JP from Google Fonts. When that service is
unavailable, the browser uses installed fonts from the theme's fallback list;
glyph widths and validator measurements can differ. For repeatable offline
exports, install the same font version on every rendering machine or provide
deck-local font files with `@font-face`, and keep the browser version fixed.
The remote import remains for existing decks; it does not make the rendering
environment hermetic.

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

An opted-in `<!-- _scroll: true -->` slide keeps its original canvas size and
fixed header, first top-level heading, footer, and pagination. The plugin adds
`data-marpagent-scroll="true"` to the slide and one direct
`.marpagent-scroll-body` child. Shared scroll styles provide a focusable
vertical viewport without reducing font sizes. The scroll controller
synchronizes the current body's normalized position within the native
Bespoke presentation session, including presenter windows.

Rendered validation visits successive body positions. Vertical content beyond
the initial viewport yields a non-blocking `scroll-export-overflow` warning
because PDF/PPTX/images and printing show that viewport. Horizontal overflow
still fails as `content-clipped`. Regular slides retain their existing layout.

The validator checks rendered clipping, collisions, and readable type sizes.
Source density rules are hints, not quotas for bullet or card counts. Preserve
the information needed to understand a comparison; revise or split when the
render shows an actual readability problem, respecting fixed slide constraints.
Do not shrink body text or compress Markdown to evade a finding.

The fixture gate renders `template/layouts.md` along with the regression decks.
Browser tests measure unequal columns, gaps, and alignment in every shipped
theme; class-availability tests ensure the documented templates use emitted CSS.
