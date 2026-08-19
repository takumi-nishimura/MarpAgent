# Advanced slide layouts

Use when the content benefits from a grid, multiple peer columns, a visual interpretation, metrics, or a sequence. Examples show syntax, not required card counts or factual results.

### multi-column variant

The validator sums top-level bullets across columns. Around two concise bullets per column is a useful starting point, not a separate hard limit. Use `.gap-box` when a per-column takeaway helps the audience.

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

Judge grid density by rendered readability and the information each card carries. Do not collapse card markup onto one line to evade a source-line heuristic. If content is too dense, reduce or split it; if the heuristic is misleading, retain the finding and explain the rendered evidence.

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
