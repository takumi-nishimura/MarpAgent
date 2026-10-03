# Advanced slide layouts

Use when the content benefits from a grid, multiple peer columns, a visual interpretation, metrics, or a sequence. Examples show syntax, not required card counts or factual results.

### multi-column variant

Use when there are several genuine peers to compare or explain. Let the material determine the number of columns and their density; do not invent another item to fill a row. The validator's source hint sums top-level bullets across columns, but rendered readability determines whether the page works.

Use `.col.with-summary` and a `.gap-box` inside each column only when distinct per-column conclusions help. The plain columns below need no repeated summary boxes.

```markdown
---

<!-- _header: Section Name -->

## Read the material before choosing its treatment

<div class="col">
<div>

### Figure

Inspect the labels, scale, and observation to make visible.

</div>
<div>

### Data

Check units and comparison conditions before deciding on a chart.

</div>
<div>

### Example

Choose a concrete case that the audience can follow.

</div>
</div>
```

### feature-grid variant

2×N CSS grid of feature cards. Use for independent items with a shared level of importance; a causal chain or continuous explanation usually needs another form. Do not wrap every paragraph in a card.

Judge grid density by rendered readability and the information each card carries. Do not collapse card markup onto one line to evade a source-line heuristic. If content is too dense, reduce or split it; if the heuristic is misleading, retain the finding and explain the rendered evidence.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

<div class="feature-grid">
<div>

**Live preview**

Inspect a page while editing its Markdown.

</div>
<div>

**Overview**

See the sequence of rendered pages together.

</div>
</div>
```

### visual variant

Use `.col.visual` for figure/media + interpretation. It extends the standard
`.col` primitive used by the `two-column` template instead of introducing a
separate layout primitive. Adjust ratios with CSS variables rather than scoped
CSS. Give the figure enough space for its labels; use the text to direct
attention to an observation rather than restating every visible detail.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

<div class="col visual" style="--visual-left: 1.15; --visual-right: 0.85;">
<figure>
<img src="assets/img/example.png" alt="Describe the actual figure" />
<figcaption>Source and conditions needed to interpret the figure</figcaption>
</figure>
<div>

**What to notice**

Name the supported observation and its relevant limitation.

</div>
</div>
```

## content variants for compact structure

### metric-grid variant

Use for a small set of sourced numbers whose units and meaning remain clear
at this size. A result involving distributions, trends, or uncertainty may need
a chart instead. Do not turn qualitative points into invented metrics. The
bracketed values below are placeholders to replace with verified quantities.

```markdown
---

<!-- _header: Section Name -->

## Slide Heading

<div class="metric-grid">
<div><strong>[value + unit]</strong><span>Measure, condition, and source.</span></div>
<div><strong>[value + unit]</strong><span>Measure, condition, and source.</span></div>
</div>
```

### timeline variant

Use for a process or chronology with a real ordering. Use a diagram when
branches or feedback are central. The theme renders directional arrows between
steps, so keep labels concise without removing necessary conditions. Use
`ol.timeline` for numeric markers, and `ul.timeline` when arrows alone carry
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
