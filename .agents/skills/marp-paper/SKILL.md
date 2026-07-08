---
name: marp-paper
description: A-series paper authoring for MarpAgent. Use when authoring or editing a paper.md deck — covers the A4 portrait/landscape canvas, header/columns/footer structure, section cards, and how paper layouts differ from slide decks.
user-invocable: false
---

A paper deck is **one full-page A-series canvas**, not a sequence of slides. The
whole page lives in a single Marp slide with no `---` separators in the body.
Use `theme: lab` with an explicit `size:`. Paper layout is selected by the
`.paper-header` / `.paper-columns` structure, not by a separate Marp theme or
slide class.

## When to use

Dense one-page research outputs, including print-oriented handouts and large
conference sheets that will be scaled at print time. For normal talks use the
slide workflow (`marp-slide-types`) instead.

## Front matter

```yaml
---
marp: true
theme: lab
size: a4-portrait  # Landscape: size: a4-landscape
paginate: false
style: |
  section {
    --paper-accent: var(--color-tertiary);  # section bars, borders, footer tint
  }
---
```

| `size:` value | Page |
| :------------ | :--- |
| `a4-portrait` | 210 x 297 mm |
| `a4-landscape` | 297 x 210 mm |

Export at A4 and scale the PDF at print time when a larger physical sheet is
needed. A4 to A0 is a 400% linear enlargement.

## Structure

One `<header>` band, one `<div class="paper-columns">` body, one `<footer>`
band — in that order, inside a single slide.

```markdown
<header class="paper-header">
<div class="paper-logo">

![logo](shared/logos/marp-logo.svg)

</div>
<div class="paper-title">

# Paper Title

<p class="paper-authors">Author One, Author Two</p>
<p class="paper-affil">Lab, Institution</p>

</div>
<div class="paper-logo">

![logo](shared/logos/marp-logo.svg)

</div>
</header>

<div class="paper-columns">
<div class="paper-col">

<section class="paper-section">

## Section Heading

- Point one
- Point two

</section>

</div>
<div class="paper-col"> ... </div>
<div class="paper-col"> ... </div>
</div>

<footer class="paper-footer">
<div class="paper-refs">

**References** [1] ... [2] ...

</div>
<div class="paper-contact">

Email: you@example.com

</div>
</footer>
```

## Columns

**Column count = number of `<div class="paper-col">` blocks.** No directive is
needed. Use three columns for portrait, four for landscape. Sections stack
top-down inside each column; keep columns roughly balanced in height.

## Section cards

| Class | Effect |
| :---- | :----- |
| `paper-section` | Bordered card; its first `## h2` becomes the title bar |
| `paper-section highlight` | Key-result card with stronger border and tinted fill |
| `paper-stat` | Big centered statement/number, e.g. inside a highlight card |

**Placement rules:**
- When the headline number IS the Results, fuse them: make the Results section itself the highlight card (`<section class="paper-section highlight">` with a `paper-stat` plus supporting copy/table). Do not create a separate "Key Result" card alongside Results.
- References belong in `<div class="paper-refs">` inside `<footer class="paper-footer">`, not a body card — even if the brief lists "References" as a required section. Same for author contact (`<div class="paper-contact">`).

## Reused components

Callouts (`.note` / `.tip` / `.important` / `.warning` / `.caution`), figures
(`![w:100%](...)`, `<figure>` + `<figcaption>`), tables, code blocks, and
Mermaid diagrams all work inside `paper-section` cards — see `marp-components`.
Color words (`.blue`, `.red`, ...), `**strong**`, and `*emphasis*` markers carry
over from the lab theme.

## Commands

```bash
npm run marpx -- -n decks/<name> --paper   # scaffold a paper deck
npm run marpx -- decks/<name>/paper.md     # live preview
npm run marpx -- decks/<name>/paper.md -v  # validate
npm run marpx -- decks/<name>/paper.md --pdf  # export PDF for printing
```

## Validation

A-series paper decks skip the slide-density heuristics because a dense full page
is expected. The validator still runs the **visual overflow** check: if content
exceeds the page, trim content, shorten a column, or move a card to another
column. Do not shrink typography below readability. See `marp-validator`.
