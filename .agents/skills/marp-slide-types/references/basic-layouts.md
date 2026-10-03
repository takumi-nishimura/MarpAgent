# Basic slide layouts

Read only the relevant example. These demonstrate syntax, not required slide sequences, wording, or point counts. Replace illustrative text and media paths with the requested content. Preserve the deck's theme, headers, and pagination conventions.

For shared comparison criteria, evidence with an interpretation, or aligned process rows, start with the [composition recipes](composition.md). The plain grid utilities let the material determine column widths without choosing a card style.

## title

Use for an opening cover. A recap usually uses a normal content slide so its actual conclusion has room.

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

Use for a point best shown in a single area: a statement, figure, code sample, diagram, table, or a list when the items are a real set. Start with the material the audience needs, not empty bullet slots.

```markdown
---

<!-- _header: Drafting -->

## Try the actual figure before filling the page

Place it at a readable size first. Then add the observation the audience
should notice and the context needed to interpret it.
```

### agenda variant

Use when a roadmap helps the audience navigate a longer talk; omit it when the opening already makes the sequence clear. `.centered` centers the list below the heading. List the actual sections, without padding to a target count.

```markdown
---

<!-- _header: Agenda -->

## Agenda

<div class="centered">

1. The question and the evidence
2. What to try next

</div>
```

### summary variant

Use to consolidate an argument that needs a recap. State the conclusion and its important boundary rather than repeating every earlier bullet.

```markdown
---

<!-- _header: Summary -->

## Keep the figure and its explanation together

Revise the page with the actual material in place.
Keep conditions and source attribution when shortening the explanation.
```

### closing variant

End with the conclusion, open question, or next action that fits this talk. A second recap and a callout are optional, not required closing elements.

```markdown
---

<!-- _paginate: skip -->
<!-- _header: Next step -->

## Try the central page first

<div class="centered">

Bring one figure and the question it should answer to the next review.

</div>
```

## two-column template

Use for a meaningful pair: comparison, figure and interpretation, or before/after.
Use a table when several shared comparison dimensions need aligned rows. This
template uses `.col`, not a `.two-column` class. The two sides need not have the
same number of sentences or bullets.

```markdown
---

<!-- _header: Revision -->

## The same file carries the rough and finished page

<div class="col">
<div>

**Rough page**

Put the working heading and source figure in `slide.md`.
Note the unresolved question beside them while drafting.

</div>
<div>

**Revised page**

Refine the heading and annotation after inspecting the render.

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
