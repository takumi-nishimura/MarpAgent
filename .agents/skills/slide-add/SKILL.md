---
name: slide-add
description: Add slides to an existing MarpAgent presentation while preserving its structure, style, and existing content.
argument-hint: <path/to/slide.md>
---

# Add slides

Resolve the target `slide.md`, requested content, and insertion point from the arguments or conversation. Read the deck and relevant brief/outline. If no exact insertion point is given, choose a coherent position and state the assumption; ask only if the choice materially changes the user's plan.

Before editing, establish the affected slides' content and current validation findings. Preserve neighboring headers, local directives, pagination, media links, and intentional existing content. Use [marp-slide-types](../marp-slide-types/SKILL.md) to select a layout appropriate to the content or an explicit variant hint. Read [marp-components](../marp-components/SKILL.md) only for the elements being added.

Insert the requested slides and update a maintained outline when the addition would leave it misleading. Use built-in theme components instead of duplicating their CSS. Do not change unrelated slides or the global theme to accommodate one addition.

Validate the resulting deck using [marp-validator](../marp-validator/SKILL.md) and visually inspect the additions and affected neighbors. Compare findings by rule and actual slide content, accounting for renumbering; unchanged totals can hide a new regression. Fix newly introduced problems and report pre-existing ones separately.

Finish with the requested content inserted, the expected slide-count change, preserved neighboring content, and no unexplained new findings. Report the actual insertion and any limits of the checks performed.
