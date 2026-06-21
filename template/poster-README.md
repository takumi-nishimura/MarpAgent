# Poster authoring notes

A0 poster (841 × 1189 mm, portrait). One slide = the whole poster — do not add
`---` separators inside the body.

## Orientation

- Portrait (default): `size: a0` in frontmatter, three `<div class="poster-col">` blocks.
- Landscape: change to `size: a0-landscape`, use four `<div class="poster-col">` blocks.

## Structure

`<header>` band on top, `<div class="poster-columns">` body with one
`<section class="poster-section">` per topic per column, `<footer>` band at the
bottom. The first `## h2` inside each section becomes its title bar.

## Highlight card (optional)

For a single headline number, wrap the Results section with the `highlight`
class and add a `<div class="poster-stat">` for the big number. Omit when the
contribution is qualitative (protocol, framework, taxonomy).

```markdown
<section class="poster-section highlight">

## Results

<div class="poster-stat">

**+38%** depth-discrimination accuracy

</div>

Supporting copy and tables go here.

</section>
```

## References and contact

References belong in `<div class="poster-refs">` inside `<footer>`, contact in
`<div class="poster-contact">`. Do not add a body card for either.

## Commands

```bash
npx marpx <this-deck>/poster.md        # live preview
npx marpx <this-deck>/poster.md -v     # validate (A0 overflow check)
npx marpx <this-deck>/poster.md --pdf  # export A0 PDF for printing
```

This file is informational and is not rendered. Delete it once you no longer
need the reminder.
