# Basic slide layouts

Read only the relevant example. Replace illustrative text and media paths with the requested content. Preserve the deck's theme, headers, and pagination conventions.

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
