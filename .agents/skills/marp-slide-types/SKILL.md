---
name: marp-slide-types
description: Slide type templates for MarpAgent (lab theme). Use when authoring or editing any slide.md — provides copy-paste patterns for title, content, and two-column types including agenda, three-column, and feature-grid variants.
user-invocable: false
---

Three formal layout types. Every slide uses exactly one.

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
| Three peer columns | `two-column` + `three-column variant` |
| 2xN card grid | `two-column` + `feature-grid variant` |

If the outline says `Layout hint: content (...)`, keep the `content` base type and apply the named variant.
If the outline says `Layout hint: title` or the slide is clearly the opening cover, use `title`.
Use the `three-column` and `feature-grid` variants only when the outline or user request explicitly calls for that denser structure.

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

## two-column

When to use: comparisons, figure + text, before/after, feature lists.

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

### three-column variant

Bullet budget: the validator sums top-level bullets across all three columns, so keep each column to ≤ 2 bullets and put the takeaway in `.gap-box`. Same rule for `feature-grid`.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

<div class="col gap-cols">
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

## Layout Primitives

| Class / Element | Purpose |
| :-------------- | :------ |
| `.col` | Flex row container for two-column layout |
| `.centered` | Centers content vertically and horizontally |
| `.fit` | Scale element to fit available space |
| `style="flex: N"` | Override column width ratio inside `.col` |
