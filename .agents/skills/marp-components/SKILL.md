---
name: marp-components
description: Add or adjust MarpAgent slide and paper components, including callouts, media, diagrams, citations, and text treatment.
user-invocable: false
---

# Content components

Use the component needed for the requested content. These examples target lab/shared theme components; preserve the active theme and check compatibility before introducing an override.

- For figures, video, or Mermaid sizing, read [media](references/media.md).
- For callouts, citations, notes, or text wrapping, read [text components](references/text.md).
- For logo and theme-variable overrides, read [theme variables](references/theme-variables.md).
- For columns and placement, use [marp-slide-types](../marp-slide-types/SKILL.md); for the one-page canvas, use [marp-paper](../marp-paper/SKILL.md).

Use existing component classes rather than adding their CSS to every deck. Keep reusable brand values in the theme design source; scoped CSS is for a justified local behavior or requested custom layout, not bypassing readability rules.

Use `.text-xl5` for hero numbers, `.text-xl` for emphasis, `.text-sm` for captions/dense tables, and `.text-xs` for genuine fine print. Do not use `.text-xs2`, `.text-xs3`, `<small>`, or tiny inline sizes to make body content fit. A paper may skip that heuristic but still needs readable type.

Japanese prose is wrapped by BudouX. Avoid manual `<br>`/`<wbr>` for cosmetic line wrapping; use semantic breaks when needed and `<span class="nobr">…</span>` for a short run that must remain together. Do not confuse Markdown source wrapping with forced rendered breaks.

Preserve research-source attribution and repository media ownership. Inspect the rendered component after changes: a reachable image may be the wrong figure, and a zero overflow count does not establish legible labels or correct content.
