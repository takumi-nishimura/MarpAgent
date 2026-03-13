---
name: marp-slide-types
description: Slide type templates for MarpAgent (lab theme). Use when authoring or editing any slide.md — provides copy-paste patterns for title, content, and two-column types including agenda, three-column, and feature-grid variants.
user-invocable: false
---

Three formal layout types. Every slide uses exactly one.

## title

When to use: opening slide, closing slide (thank-you / contact info only). Do NOT use for summary or recap slides — use the content summary variant instead.

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

### close variant

Same `<!-- _class: title -->`. Use a shorter h1:

```markdown
---

<!-- _paginate: skip -->
<!-- _class: title -->

# Thank you!

<div class="author">

Closing note or URL

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

Declare `--bg-gray-5` in frontmatter `style:` first (see marp-components skill).

```markdown
---

<!-- _header: Section Name -->

<style scoped>
.gap-cols {
  display: flex;
  align-items: stretch;
  gap: 0.8em;
}
.gap-cols > div {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
}
.gap-cols ul,
.gap-cols ol {
  font-size: var(--text-sm);
  line-height: 1.35;
  margin: 0.2em 0 0;
  padding-left: 1.2em;
}
.gap-box {
  background: var(--bg-gray-5);
  padding: 0.3em 0.3em;
  text-align: center;
  font-weight: bold;
  font-size: var(--text-sm);
}
.gap-cols > div > .gap-box {
  margin-top: auto;
  margin-top: 1em;
}
</style>

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

2×N CSS grid of feature cards. Declare `--bg-gray-5` in frontmatter `style:` first.

```markdown
---

<!-- _header: Section Name -->

<style scoped>
.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5em 0.5em;
  margin-top: 0.2em;
  font-size: var(--text-xs);
}
.feature-grid > div {
  background: var(--bg-gray-5);
  padding: 0.3em 0.5em;
}
.feature-grid strong {
  font-size: var(--text-sm);
}
</style>

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
