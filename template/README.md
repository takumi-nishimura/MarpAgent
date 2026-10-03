# Slide templates

`marpx -n` copies `brief.md` and `slide.md`. The starter keeps the first content
page open so the material can determine its layout.

[`layouts.md`](layouts.md) is a renderable set of composition recipes. Copy the
needed page body into the deck, keeping the destination's frontmatter and
directives. These are independent examples, not a required deck sequence.

| Page | Relationship | Adaptation |
| :--- | :----------- | :--------- |
| 1 — Comparison table | Alternatives share the same decision criteria | Put criteria in rows and alternatives in columns. Keep units and conditions comparable; say when information is missing. |
| 2 — Main material and context | A table or figure needs an interpretation beside it | Use the wider column for evidence and the narrower one for implications, conditions, or a recommendation. Adjust the 8:4 split when the material needs it. |
| 3 — Process and outputs | Ordered work has an action and a review outcome | Keep stage, action, and output on shared column boundaries. Use as many rows as the actual process needs. |

The examples use repository workflow facts so they can be rendered without
placeholder images or fabricated business metrics. Replace their subject matter
with the user's material. To put a figure in the main column, use a `figure`
with a deck-local image and a caption carrying its source and conditions.

For business explanation decks, preserve the information needed to compare or
decide. A table can carry more useful detail than a row of independent cards.
Allow unequal text lengths and column widths. Use backgrounds, callouts, or
metric cards when the content needs grouping or emphasis; layout utilities
themselves add no decorative surface.

## Composition rules

- Use `grid grid-cols-12` with column spans for unequal widths, `grid-cols-2`
  or `grid-cols-3` for genuine peers, and `flex` for an aligned row or stack.
- Choose gaps from the shared scale. Start with `gap-4` or `gap-6` and inspect
  the render; whitespace is not a substitute for missing evidence.
- Put structural utilities on plain wrapper `div` elements. Existing `.col`,
  `.box`, `figure`, headings, and tables have their own layout or margins;
  wrap them instead of combining competing layout instructions on one element.
- Preserve blank lines around Markdown inside HTML containers. Do not compress
  the source to make density hints disappear.
- Align comparable numbers to the right with Markdown's `---:` table syntax.
  Use `tabular-nums` on a table wrapper when its font supports tabular digits.
  `table-fixed` belongs on an HTML `table`, not its wrapper, when explicit
  column sizing is needed.
- Use the documented classes in the [theme contract](../docs/theme-contract.md).
  Arbitrary Tailwind classes and responsive variants are not compiled for each
  deck. Use scoped CSS for a justified one-off need; add reusable patterns to
  the shared framework.

## Inspect the recipes

```bash
npm run marpx -- template/layouts.md --overview
npm run marpx -- template/layouts.md -v
npm run marpx -- template/layouts.md --pdf --output /tmp/marpagent-layouts.pdf
```

CI renders this same file in the fixture gate. The class-availability checks
cover it alongside the skills, and browser tests exercise the composition
utilities across all shipped themes. Those checks establish working layout and
readable fit; the argument, evidence, and suitability for an audience still
need review.
