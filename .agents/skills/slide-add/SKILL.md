---
name: slide-add
description: Add one or more slides to an existing MarpAgent deck.
argument-hint: <path/to/slide.md>
---

Add slides to `$ARGUMENTS`.

Expected inputs:

- First argument: path to the target `slide.md`
- Optional second argument: one of `title`, `content`, `two-column`, `agenda`, `summary`, `closing`, `three-column`, `feature-grid`

If the user does not specify an exact insertion point, infer the most relevant neighboring slide from the request and state the assumption in your response.

## Steps

1. Read `$ARGUMENTS` to identify the insertion point and the active `<!-- _header: ... -->` value of neighboring slides.

2. Determine the slide type:
   - Use the optional second argument if provided
   - Map `agenda`, `summary`, and `closing` to the `content` base type with that variant
   - Map `three-column` and `feature-grid` to the `two-column` base type with that variant
   - Otherwise infer: comparison/visual split → `two-column`; everything else → `content`
   - Apply the matching template from the **marp-slide-types** skill

3. If the slide uses `var(--bg-gray-5)` (three-column, feature-grid, summary-box):
   - Check frontmatter `style:` for the declaration
   - If missing, add: `--bg-gray-5: color-mix(in srgb, var(--color-deck-gray) 5%, transparent);`
   - See **marp-components** skill for details

4. Insert the slide(s).
   - Preserve the existing `<!-- _header: ... -->` values on neighboring slides
   - Give the new slide the section header that keeps the local flow coherent

5. Validate:
   ```bash
   npx marpx $ARGUMENTS -v
   ```
   Fix any new findings. Confirm no regressions on previously clean slides.

## Done When

Slide count increased by the expected amount AND validator finding count unchanged (or zero).
