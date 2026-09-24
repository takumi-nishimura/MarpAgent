---
name: marp-paper
description: Author or edit a single-page MarpAgent paper.md handout or poster using header, columns, section cards, and footer.
user-invocable: false
---

# Paper canvas

A paper is one full-page canvas, with no `---` separators in the body. Use the requested compatible theme and explicit `size: a4-portrait` or `size: a4-landscape`; layout comes from the paper structure, not a separate poster theme. The current paper-mode detector recognizes these two sizes, not arbitrary A-series labels. Keep the size value on its own line without a trailing YAML comment because the current detector reads that comment as part of the value.

Read [structure examples](references/structure.md) when adding or changing frontmatter, columns, cards, result emphasis, or footer content. For a new document, use [paper-new](../paper-new/SKILL.md); for a talk with multiple slides, use [marp-slide-types](../marp-slide-types/SKILL.md).

Keep a `.paper-header` band, a `.paper-columns` body containing `.paper-col` blocks, and a `.paper-footer`, in that order. Start with three columns for portrait or four for landscape and adjust to the actual content. Sections stack inside each column; balance reading order and height.

Use `.paper-section.highlight` and `.paper-stat` only for a supported headline result, integrated with Results rather than repeated in a competing card. A qualitative contribution does not need a numeric highlight. Put references and contact details in the footer's `.paper-refs` and `.paper-contact`, not extra body cards.

Use [marp-components](../marp-components/SKILL.md) for selected figures, diagrams, or callouts. Keep source evidence, labels, and citations legible; do not invent authors, metrics, or contact details to fill a template.

Validate with [marp-validator](../marp-validator/SKILL.md) and inspect the rendered full page. Paper mode skips the source hints, so a measured rendered check (`Visual check: measured`) is especially important. Rebalance or shorten content rather than silently creating multiple pages or shrinking type below readability.

When exporting, report actual page size. A4 can be enlarged for printing (A4 to A0 is 400% linear scaling), but that does not make an A4 PDF natively A0 or improve the resolution of embedded raster images.
