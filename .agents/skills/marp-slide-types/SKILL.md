---
name: marp-slide-types
description: Slide type templates for MarpAgent (lab theme). Use when authoring or editing any slide.md — provides copy-paste patterns for title, content, and column types including agenda, multi-column, feature-grid, visual, metric-grid, and timeline variants.
user-invocable: false
---

Three formal template layout types. Every slide uses exactly one. These names
are outline/template labels, not necessarily CSS classes: `two-column` renders
with the theme's `.col` primitive.

## Quick Chooser

Use this mapping when another skill says "apply the matching template":

| Need | Template |
| :--- | :------- |
| Opening cover slide | `title` |
| Standard single-column explanation | `content` |
| Agenda slide | `content` + `agenda variant` |
| In-section recap | `content` + `summary variant` |
| Final recap / next steps | `content` + `closing variant` |
| Comparison / figure + text / before-after | `two-column` |
| Three or more peer columns | `two-column` + `multi-column variant` |
| 2xN card grid | `two-column` + `feature-grid variant` |
| Figure/media + interpretation | `two-column` + `visual variant` |
| Numeric evidence / KPIs | `content` + `metric-grid variant` |
| Process / chronology | `content` + `timeline variant` |

If the outline says `Layout hint: content (...)`, keep the `content` base type and apply the named variant.
If the outline says `Layout hint: title` or the slide is clearly the opening cover, use `title`.
Use the `multi-column`, `feature-grid`, `metric-grid`, and `timeline` variants only when the outline or user request explicitly calls for that denser structure.

## title

When to use: opening slide. Do NOT use for summary or recap slides — use the content summary variant instead.

```markdown
---

<!-- _paginate: skip -->
<!-- _class: title -->
<!-- _header: YYYY-MM-DD -->

# Presentation Title

<div class="author">

Subtitle or author info here

</div>
```

## content

When to use: single-column slides — bullet lists, prose, code, diagrams, tables.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

- Bullet point one
- Bullet point two
- Bullet point three
```

### agenda variant

Uses `.centered` to vertically and horizontally center the list below the heading.

```markdown
---

<!-- _header: Agenda -->

## Agenda

<div class="centered">

1. Section One
2. Section Two
3. Section Three

</div>
```

### summary variant

```markdown
---

<!-- _header: Summary -->

## Summary

1. Key point one
2. Key point two
3. Key point three
```

### closing variant

When to use: final slide of a deck — summarizes key takeaways and optionally includes a call to action (recap, next steps, conclusions).

```markdown
---

<!-- _paginate: skip -->
<!-- _header: Summary -->

## Key Takeaways

<div class="centered">

1. **First point** — brief description
2. **Second point** — brief description
3. **Third point** — brief description

</div>
```

With call to action:

```markdown
---

<!-- _paginate: skip -->
<!-- _header: Summary -->

## Key Takeaways

1. **First point** — brief description
2. **Second point** — brief description
3. **Third point** — brief description

<div class="summary-box">

Next step or call to action here.

</div>
```

## two-column template

When to use: comparisons, figure + text, before/after, feature lists. This is
an outline/template label; the authored slide uses `.col`, not a
`.two-column` class.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

<div class="col">
<div>

**Left column heading**

- Left bullet one
- Left bullet two

</div>
<div>

**Right column heading**

- Right bullet one
- Right bullet two

</div>
</div>
```

To adjust column width ratios, add `style="flex: N"`:

```markdown
<div class="col">
<div style="flex: 1.3;">

Wider left column

</div>
<div>

Narrower right column

</div>
</div>
```

To place content without scoped CSS, add placement utilities to column boxes.
`.fill` makes a body-level layout use the remaining slide body height above the
footer safe area. `.place-top`, `.place-middle`, `.place-bottom`, and
`.place-spread` control vertical placement. `.place-left`, `.place-center`,
and `.place-right` control horizontal placement.

```markdown
<div class="col fill">
<div class="place-middle">
<div>

Text content centered within its column.

</div>
</div>
<div class="place-middle place-center">
<figure>
<img src="assets/img/example.png" />
</figure>
</div>
</div>
```

```markdown
<div class="box place-middle place-center" style="height: 280px;">
<img src="assets/img/example.png" />
</div>
```

Use `.box` outside `.col` when an ordinary wrapper should place its own
children.

### multi-column variant

Bullet budget: the validator sums top-level bullets across columns, so keep
each column to ≤ 2 bullets and put the takeaway in `.gap-box` when a per-column
conclusion is useful. Same rule for `feature-grid`.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

<div class="col with-summary">
<div>

### Column One

- Bullet one
- Bullet two

<div class="gap-box">Summary for col 1</div>

</div>
<div>

### Column Two

- Bullet one
- Bullet two

<div class="gap-box">Summary for col 2</div>

</div>
<div>

### Column Three

- Bullet one
- Bullet two

<div class="gap-box">Summary for col 3</div>

</div>
</div>
```

### feature-grid variant

2×N CSS grid of feature cards.

Density rule: the validator counts source-body lines, not rendered rows. The block-form `<div>` + `**Heading**` + sub-bullet shown below is fine up to ~4 cards. For 5+ cards, collapse each card to a single source line — `<div>**Heading** — body sentence.</div>` — so card count, not source layout, drives the body-line budget.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

Short intro sentence.

<div class="feature-grid">
<div>

**Feature A**

- Detail one
- Detail two

</div>
<div>

**Feature B**

- Detail one
- Detail two

</div>
</div>
```

### visual variant

Use `.col.visual` for figure/media + interpretation. It extends the standard
`.col` primitive used by the `two-column` template instead of introducing a
separate layout primitive. Adjust ratios with CSS variables rather than scoped
CSS.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

<div class="col visual" style="--visual-left: 1.15; --visual-right: 0.85;">
<figure>
<img src="assets/img/example.png" />
<figcaption>Caption</figcaption>
</figure>
<div>

**Interpretation**

- Point one
- Point two

</div>
</div>
```

## content variants for compact structure

### metric-grid variant

Use for a small set of numbers or result tiles. Keep each card to one number
or label plus one short interpretation line.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

<div class="metric-grid">
<div><strong>92%</strong><span>Short interpretation.</span></div>
<div><strong>3.1x</strong><span>Short interpretation.</span></div>
<div><strong>12 ms</strong><span>Short interpretation.</span></div>
</div>
```

### timeline variant

Use for a process or chronology. The theme renders directional arrows between
steps, so keep each step to one short sentence. Use `ol.timeline` when the
steps need simple numeric markers, and `ul.timeline` when arrows alone carry
the sequence.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

<ol class="timeline">
<li><strong>Frame</strong> the problem.</li>
<li><strong>Prototype</strong> the workflow.</li>
<li><strong>Validate</strong> with the target deck.</li>
</ol>
```

## Layout Primitives

| Class / Element | Purpose |
| :-------------- | :------ |
| `.col` | Flex row container for two or more columns |
| `.centered` | Centers content vertically and horizontally |
| `.fit` | Scale element to fit available space |
| `style="flex: N"` | Override column width ratio inside `.col` |
| `.col.with-summary` | Column layout whose per-column `.gap-box` sits at the bottom |
| `.box` | Flex container for placing content outside `.col` |
| `.fill` | Body-level layout fills remaining height above the footer safe area |
| `.place-top` / `.place-middle` / `.place-bottom` / `.place-spread` | Vertical placement inside `.col > div` or `.box` |
| `.place-left` / `.place-center` / `.place-right` | Horizontal placement inside `.col > div` or `.box` |
| `.self-start` / `.self-center` / `.self-end` | Place a fit-to-content component itself |
| `.col.visual` | Figure/text variant of the `.col`-based template |
| `.metric-grid` | Compact numeric or KPI cards |
| `.timeline` | Horizontal process or step sequence with directional arrows; `ol` adds simple numeric markers |
