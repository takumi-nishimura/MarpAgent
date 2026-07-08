# A-series paper authoring notes

A-series paper canvas. One slide = the whole page; do not add `---` separators
inside the body.

Use `theme: lab` with an explicit `size:` in `paper.md`. Paper layout is
selected by the `.paper-header` / `.paper-columns` structure, not by a separate
theme or slide class.

## Orientation

- Portrait: `size: a4-portrait` in frontmatter, three `<div class="paper-col">` blocks.
- Landscape: change to `size: a4-landscape`, use four `<div class="paper-col">` blocks.

Export the PDF at A4 and scale it at print time when a larger physical sheet is
needed. A4 to A0 is a 400% linear enlargement.

## Structure

`<header>` band on top, `<div class="paper-columns">` body with one
`<section class="paper-section">` per topic per column, `<footer>` band at the
bottom. The first `## h2` inside each section becomes its title bar.

## Highlight card (optional)

For a single headline number, wrap the Results section with the `highlight`
class and add a `<div class="paper-stat">` for the big number. Omit when the
contribution is qualitative (protocol, framework, taxonomy).

```markdown
<section class="paper-section highlight">

## Results

<div class="paper-stat">

**+38%** depth-discrimination accuracy

</div>

Supporting copy and tables go here.

</section>
```

## References and contact

References belong in `<div class="paper-refs">` inside `<footer>`, contact in
`<div class="paper-contact">`. Do not add a body card for either.

## Commands

```bash
npx marpx <this-deck>/paper.md        # live preview
npx marpx <this-deck>/paper.md -v     # validate
npx marpx <this-deck>/paper.md --pdf  # export PDF for printing
```

This file is informational and is not rendered. Delete it once you no longer
need the reminder.
