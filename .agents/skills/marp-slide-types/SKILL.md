---
name: marp-slide-types
description: Choose and author lab/shared-theme layouts in MarpAgent slide.md presentations. Use for slide structure and layout variants; paper.md uses marp-paper.
user-invocable: false
---

# Slide layouts

Choose the layout for the content and the user's design, then read only its example. Preserve the active theme; these patterns use lab/shared components, so verify support before applying them to another theme.

| Content | Template label | Reference |
|---|---|---|
| Opening cover | `title` | [Basic layouts](references/basic-layouts.md) |
| Explanation, agenda, recap, closing | `content` with the appropriate variant | [Basic layouts](references/basic-layouts.md) |
| Comparison or figure and text | `two-column` using `.col` | [Basic layouts](references/basic-layouts.md) |
| Several peer columns or cards | `two-column` + `multi-column` / `feature-grid` | [Advanced layouts](references/advanced-layouts.md) |
| Media and interpretation | `two-column` + `visual` | [Advanced layouts](references/advanced-layouts.md) |
| Metrics or chronology | `content` + `metric-grid` / `timeline` | [Advanced layouts](references/advanced-layouts.md) |
| Alignment and placement | Existing theme utilities | [Placement](references/placement.md) |

The three base types are outline/template labels, not interchangeable CSS classes. `two-column` uses `.col`; `content (summary variant)` remains a content slide. Use the title layout for an opening cover, not as the default for every recap.

Treat an outline hint as the starting plan. Choose a denser variant when the content relationship and readable result justify it, even if the user has not named its CSS class; preserve an explicitly fixed layout. Prefer existing components to copied scoped CSS. Respect slide count and content constraints when deciding to split.

Evaluate rendered information density, not just Markdown line counts. Do not collapse source lines, hide content in excluded blocks, or shrink body text to evade a heuristic. See [marp-validator](../marp-validator/SKILL.md) when an actual finding needs interpretation.
