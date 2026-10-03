---
name: slide-add
description: Add slides to an existing MarpAgent presentation while preserving its structure, style, and existing content.
argument-hint: <path/to/slide.md>
---

# Add slides

Resolve the target `slide.md`, requested content, and insertion point from the arguments or conversation. Read the deck, relevant brief, and source material. If no exact insertion point is given, choose a coherent position and state the assumption; ask only if the choice materially changes the user's plan. Use [slide-edit](../slide-edit/SKILL.md) when the request also needs broader restructuring or revision.

Before editing, establish the affected slides' content and current validation findings. Preserve neighboring headers, local directives, pagination, media links, and intentional existing content. Use [marp-slide-types](../marp-slide-types/SKILL.md) to select a layout from the new page's role and supporting material, following explicit design constraints. Read [marp-components](../marp-components/SKILL.md) only for the elements being added.

Draft the additions directly in `slide.md`, try their actual assets, and revise them with the neighboring transitions in view. Keep the brief for changed requirements or sources. Do not create or synchronize `outline.md` unless the user explicitly requires that deliverable; read any unique intent in a legacy outline and preserve the file. Use built-in theme components instead of duplicating their CSS. Do not change unrelated slides or the global theme to accommodate one addition.

Validate the resulting deck using [marp-validator](../marp-validator/SKILL.md) and visually inspect the additions and affected neighbors. Compare findings by rule and actual slide content, accounting for renumbering; unchanged totals can hide a new regression. Fix newly introduced problems and report pre-existing ones separately.

Finish with the requested content inserted, the expected slide-count change, preserved neighboring content, and no unexplained new findings. Remove temporary drafting notes; ordinary comments can become presenter notes. Report the actual insertion and any limits of the checks performed.
