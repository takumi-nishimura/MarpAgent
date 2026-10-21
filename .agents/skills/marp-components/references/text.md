# Text components

Read the section needed for the component being authored. Preserve existing text and citations when making a layout-only change.

## Code and line highlighting

Use a language-tagged fence for source code. Core 5 uses Shiki; specify the lines that support the explanation with a comma-separated list or ranges, counted from the first line inside the fence:

````markdown
```js {2,4-5}
function average(values) {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  const count = values.length;
  return total / count;
}
```
````

Highlight only the relevant lines and update the indices after editing the code. Let the active theme supply colors through `--marp-shiki-*`; `.hljs-*` overrides no longer apply. Keep the code short enough to read without shrinking its font. See [the runnable Core 5 examples](../../../../template/core5-components.md) for code, math, and both Mermaid rendering paths.

## Callouts

Use a callout for a distinct note, exception, or warning that benefits from a visual boundary. Ordinary explanation can remain plain text beside a table or figure; a colored container is not required for every point or takeaway.

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

For new lab slides, choose among three text treatments:

| Purpose | Markup | Lab appearance |
| :------ | :----- | :------------- |
| Stress a phrase within a sentence | `*emphasis*` or `_emphasis_` | narrow band below the text |
| Signal importance or a consequential caution | `**important**` | colored bold text |
| Identify the part being discussed, such as a passage in a quotation | `<mark>reference</mark>` | pale background behind the text, with space above and below |

Use `mark` to identify a relevant passage, not to assign a review status or
create another level of importance. It keeps the surrounding text color and
clones its background across natural line breaks. Do not add manual breaks or
wrap it in a no-break container just to keep the highlight together.

The `.marker` class remains supported for existing decks. Do not introduce it
in new lab prose: it adds a second spelling for a narrow-band treatment without
expressing which of the three roles is intended. Preserve existing markup when
editing another author's deck; replace it only when the intended role is clear.
Paper and other themes retain their own appearance. See
[`fixtures/lab-emphasis-slide.md`](../../../../fixtures/lab-emphasis-slide.md)
for the light and dark lab examples.

## Japanese wrapping and scoped CSS

BudouX adds phrase-boundary break opportunities at render time and skips code/pre/style/script content. A short `<span class="nobr">…</span>` keeps a run together; avoid enclosing long prose that then cannot fit. Reserve `<br>` for semantic breaks such as address lines. Source newlines and rendered forced breaks are different decisions.

For a justified local style, place `<style scoped>` after the slide separator/directives and inspect the result. Prefer existing theme variables and placement utilities; do not override font sizes merely to pass validation.
