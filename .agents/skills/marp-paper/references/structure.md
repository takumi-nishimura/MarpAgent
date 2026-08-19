# Paper structure examples

Read for frontmatter, column/card syntax, result emphasis, and footer placement. The lab theme is the example; preserve another requested compatible theme. Example authors, contacts, and results are placeholders, not source data.

## Front matter

```yaml
---
marp: true
theme: lab
size: a4-portrait
paginate: false
style: |
  section {
    --paper-accent: var(--color-tertiary);
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
needed. Start with three columns for portrait or four for landscape; adapt the count to content and rendered readability. Sections stack
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
Mermaid diagrams all work inside `paper-section` cards — see [marp-components](../../marp-components/SKILL.md).
Color words (`.blue`, `.red`, ...), `**strong**`, and `*emphasis*` markers carry
over from the lab theme.
