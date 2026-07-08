---
name: slide-add
description: Add one or more slides to an existing MarpAgent deck.
argument-hint: <path/to/slide.md>
---

Add slides to `$ARGUMENTS`.

Expected inputs:

- First argument: path to the target `slide.md`
- Optional second argument: one of `title`, `content`, `two-column`, `agenda`, `summary`, `closing`, `multi-column`, `feature-grid`, `visual`, `metric-grid`, `timeline`

If the user does not specify an exact insertion point, infer the most relevant neighboring slide from the request and state the assumption in your response.

## Steps

1. Read `$ARGUMENTS` to identify the insertion point and the active `<!-- _header: ... -->` value of neighboring slides.

2. Determine the slide type:
   - Use the optional second argument if provided
   - Map `agenda`, `summary`, and `closing` to the `content` base type with that variant
   - Map `multi-column`, `feature-grid`, and `visual` to the `two-column` base type with that variant
   - Map `metric-grid` and `timeline` to the `content` base type with that variant
   - Otherwise infer: comparison/figure-text visual column → `two-column`; everything else → `content`
   - Apply the matching template from the **marp-slide-types** skill

3. If the slide uses multi-column, feature-grid, summary-box, or placement patterns, use the built-in theme classes from **marp-slide-types**. Do not add scoped component CSS unless the user asks for a one-off custom layout.

4. Insert the slide(s).
   - Preserve the existing `<!-- _header: ... -->` values on neighboring slides
   - Give the new slide the section header that keeps the local flow coherent

5. Validate:
   ```bash
   npm run marpx -- $ARGUMENTS -v
   ```
   Fix any new findings. Confirm no regressions on previously clean slides.

## Done When

Slide count increased by the expected amount AND validator finding count unchanged (or zero).
