---
name: marp-poster
description: A0 poster authoring for MarpAgent (poster theme). Use when authoring or editing a poster.md — covers the A0 portrait/landscape canvas, the header/columns/footer structure, section cards, and how posters differ from slide decks.
user-invocable: false
---

A poster is **one full-page A0 canvas**, not a sequence of slides. The whole
poster lives in a single Marp slide (no `---` separators in the body). Use the
`poster` theme, not `lab`.

## When to use

Conference / lab poster sessions printed at A0 (841 × 1189 mm). For normal
talks use the slide workflow (`marp-slide-types`) instead.

## Front matter

```yaml
---
marp: true
theme: poster
size: a0            # portrait (default). Landscape: size: a0-landscape
paginate: false
style: |
  section {
    --accent: #0969da;   # section bars, borders, footer tint, links
  }
---
```

| `size:` value | Page |
| :------------ | :--- |
| `a0` / `a0-portrait` | 841 × 1189 mm (portrait) |
| `a0-landscape` | 1189 × 841 mm (landscape) |

## Structure

One `<header>` band, one `<div class="poster-columns">` body, one `<footer>`
band — in that order, inside a single slide.

```markdown
<header class="poster-header">
<div class="poster-logo">

![logo](shared/logos/marp-logo.svg)

</div>
<div class="poster-title">

# Poster Title

<p class="poster-authors">Author One, Author Two</p>
<p class="poster-affil">Lab, Institution</p>

</div>
<div class="poster-logo">

![logo](shared/logos/marp-logo.svg)

</div>
</header>

<div class="poster-columns">
<div class="poster-col">

<section class="poster-section">

## Section Heading

- Point one
- Point two

</section>

</div>
<div class="poster-col"> ... </div>
<div class="poster-col"> ... </div>
</div>

<footer class="poster-footer">
<div class="poster-refs">

**References** [1] ... [2] ...

</div>
<div class="poster-contact">

📧 you@example.com

</div>
</footer>
```

## Columns

**Column count = number of `<div class="poster-col">` blocks.** No directive
needed — write three for portrait, four for landscape. Sections stack top-down
inside each column; keep columns roughly balanced in height.

## Section cards

| Class | Effect |
| :---- | :----- |
| `poster-section` | Bordered card; its first `## h2` becomes the title bar |
| `poster-section highlight` | Key-result card (orange border + tinted fill) |
| `poster-stat` | Big centred statement/number, e.g. inside a highlight card |

**Placement rules:**
- When the headline number IS the Results, fuse them: make the Results section itself the highlight card (`<section class="poster-section highlight">` with a `poster-stat` plus supporting copy/table). Do not create a separate "Key Result" card alongside Results.
- References belong in `<div class="poster-refs">` inside `<footer class="poster-footer">`, not a body card — even if the brief lists "References" as a required section. Same for author contact (`<div class="poster-contact">`).

## Reused components

Callouts (`.note` / `.tip` / `.important` / `.warning` / `.caution`), figures
(`![w:100%](...)`, `<figure>` + `<figcaption>`), tables, code blocks, and
Mermaid diagrams all work inside `poster-section` cards — see `marp-components`.
Color words (`.blue`, `.red`, …), `**strong**`, and `*emphasis*` markers carry
over from the lab theme.

## Commands

```bash
npx marpx -n decks/<name> --poster   # scaffold a poster deck
npx marpx decks/<name>/poster.md     # live preview
npx marpx decks/<name>/poster.md -v  # validate (A0 overflow check)
npx marpx decks/<name>/poster.md --pdf  # export A0 PDF for printing
```

## Validation

Posters skip the slide-density heuristics (a dense full page is expected). The
validator still runs the **visual overflow** check: if content exceeds the A0
page, it reports `visual-overflow`. Fix by trimming content, shortening a
column, or moving a card to another column — never by shrinking the font below
readability. See `marp-validator`.
