---
name: marp-slide-types
description: Choose and author MarpAgent slide.md layouts from the content, evidence, and audience. Covers lab/shared-theme structures and variants; paper.md uses marp-paper.
user-invocable: false
---

# Slide layouts

Decide what the audience needs to understand on this page and which material supports it, then choose the visual structure and read only its example. Preserve the user's design and active theme; these patterns use lab/shared components, so verify support before applying them to another theme.

## Content before layout

- Give each page a clear role in the argument. Use a specific, supported heading when it helps; a section title, question, or demonstration may be more appropriate than a conclusion. Do not turn a tentative observation into a certain claim just to make the heading punchier.
- Inspect real figures, data, examples, and screenshots before fitting text around them. Make the relevant observation visible with framing, labels, or annotation. Keep units, conditions, uncertainty, and source attribution needed to interpret it; do not substitute a decorative illustration for evidence.
- Match the user's terminology, voice, and reference decks. Write concrete sentences and remove redundant headings or repeated takeaways. Spoken presentations and reading decks need different amounts of context.
- Let relationships determine form: a comparable set may need a table, a process a sequence, a result a figure, and a decision a short statement. Bullets, columns, cards, and callouts are useful when that relationship calls for them. Do not force three points, equal text lengths, a summary box on every page, or a prescribed mix of layouts.
- Preserve visual consistency while allowing content to take different amounts of space. Do not change a useful repeated structure merely to increase variety. Judge the rendered page and its neighbors, not a template quota.

## Layout references

| Content | Template label | Reference |
|---|---|---|
| Opening cover | `title` | [Basic layouts](references/basic-layouts.md) |
| Explanation, agenda, recap, closing | `content` with the appropriate variant | [Basic layouts](references/basic-layouts.md) |
| Comparison or figure and text | `two-column` using `.col` | [Basic layouts](references/basic-layouts.md) |
| Several peer columns or cards | `two-column` + `multi-column` / `feature-grid` | [Advanced layouts](references/advanced-layouts.md) |
| Media and interpretation | `two-column` + `visual` | [Advanced layouts](references/advanced-layouts.md) |
| Metrics or chronology | `content` + `metric-grid` / `timeline` | [Advanced layouts](references/advanced-layouts.md) |
| Alignment and placement | Existing theme utilities | [Placement](references/placement.md) |

The three base types are descriptive template labels, not interchangeable CSS classes. `two-column` uses `.col`; `content (summary variant)` remains a content slide. The title layout is intended for an opening cover; a recap usually needs a normal content slide.

Choose a denser variant when the content relationship and readable result justify it, even if the user has not named its CSS class; preserve an explicitly fixed layout. Prefer existing components to copied scoped CSS. Respect slide count and content constraints when deciding to split.

Evaluate rendered information density, not just Markdown line counts. Do not collapse source lines, hide content in excluded blocks, or shrink body text to evade a heuristic. See [marp-validator](../marp-validator/SKILL.md) when an actual finding needs interpretation.
