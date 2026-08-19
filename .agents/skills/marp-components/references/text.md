# Text components

Read the section needed for the component being authored. Preserve existing text and citations when making a layout-only change.

## Callouts

The built-in GFM alert labels are `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and `[!CAUTION]`, mapped to the corresponding lowercase theme class. Use an uppercase tag on the first blockquote line:

```markdown
> [!NOTE]
> Supplementary information.
```

For content such as nested fenced code that does not survive blockquote escaping, use the equivalent HTML container with blank lines around Markdown:

```markdown
<div class="note">

Supplementary information.

</div>
```

Custom labels may render without theme styling. Prefer an existing suitable type; extending shared callout CSS belongs to a requested reusable component change, not every slide containing a new label. Callout body text is real content for validation. Wrap source prose at sensible boundaries without inserting cosmetic forced breaks in the rendered slide.

## Citations and presenter notes

```markdown
A source-backed claim.<sup>[1]</sup>

<div class="footnote">

[1] Author, Title, Venue, Year.

</div>
```

Use the theme's footnote treatment for citations, including a common citation block below columns when appropriate. For a needed column-local note, preserve readable theme typography and verify placement; do not copy a fixed `font-size: 0.4em` workaround. Do not hide substantive content in footnote blocks to escape the validator's counts.

Presenter-only notes can use an ordinary HTML comment within the slide body:

```markdown
<!-- Speaker note: explain the uncertainty in this estimate. -->
```

Notes do not count as visible body prose; keep the slide understandable at the level required by the presentation brief.

## Summary and emphasis

```markdown
<div class="summary-box self-center">

The key takeaway.

</div>
```

`summary-box` fits its content; add `self-center` only when centering the box itself is useful. Use Markdown strong, emphasis, and code for their intended meaning. Theme color/size treatments supplement that meaning rather than replacing it.

## Japanese wrapping and scoped CSS

BudouX adds phrase-boundary break opportunities at render time and skips code/pre/style/script content. A short `<span class="nobr">…</span>` keeps a run together; avoid enclosing long prose that then cannot fit. Reserve `<br>` for semantic breaks such as address lines. Source newlines and rendered forced breaks are different decisions.

For a justified local style, place `<style scoped>` after the slide separator/directives and inspect the result. Prefer existing theme variables and placement utilities; do not override font sizes merely to pass validation.
