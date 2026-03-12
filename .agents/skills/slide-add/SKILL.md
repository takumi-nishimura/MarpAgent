---
name: slide-add
description: Add one or more slides to an existing MarpAgent deck.
argument-hint: <path/to/slide.md>
---

Add slides to `$ARGUMENTS`.

## Steps

1. Read `$ARGUMENTS` to identify the insertion point and the active `<!-- _header: ... -->` value of neighboring slides.

2. Determine the slide type:
   - Use the type passed as a second argument if provided
   - Otherwise infer: comparison/visual split → `two-column`; everything else → `content`
   - Apply the matching template from the **marp-slide-types** skill

3. If the slide uses `var(--bg-gray-5)` (three-column, feature-grid, summary-box):
   - Check frontmatter `style:` for the declaration
   - If missing, add: `--bg-gray-5: color-mix(in srgb, var(--color-deck-gray) 5%, transparent);`
   - See **marp-components** skill for details

4. Insert the slide(s). Preserve `<!-- _header: ... -->` on all neighboring slides.

5. Validate:
   ```bash
   npx marpx $ARGUMENTS -v
   ```
   Fix any new findings. Confirm no regressions on previously clean slides.

## Done When

Slide count increased by the expected amount AND validator finding count unchanged (or zero).
