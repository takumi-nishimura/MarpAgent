---
name: poster-new
description: Create a new MarpAgent A0 poster end-to-end — scaffold, author the single-page poster, validate.
disable-model-invocation: true
argument-hint: <deck-name>
---

Create a new A0 poster at `decks/$ARGUMENTS`.

A poster is one full-page A0 canvas, not a slide sequence. Follow the
**marp-poster** skill for all structure and class details.

## Steps

1. Scaffold:
   ```bash
   npx marpx -n decks/$ARGUMENTS --poster
   ```
   This creates a single `poster.md` (A0 portrait) plus `assets/` and `shared`.
   No `brief.md` / `outline.md` — a poster does not use that pipeline.

2. **Confirm orientation and sections with the user.** Default is A0 portrait
   with three columns. Ask whether they want landscape (`size: a0-landscape`,
   four columns) and which sections the poster needs (e.g. Introduction,
   Method, Results, Conclusion, References). Revise the placeholder structure
   until they approve.

3. Author `decks/$ARGUMENTS/poster.md`:
   - Keep the `<header>` band, `<div class="poster-columns">` body, and
     `<footer>` band — one slide, no `---` separators in the body.
   - One `<div class="poster-col">` per column; one
     `<section class="poster-section">` per topic.
   - If the work has a single headline result (e.g. a percentage, RMSE, or
     n-vs-baseline number), add a `poster-section highlight` + `poster-stat`
     block — the scaffold does NOT include one by default. Fuse it with the
     Results section per **marp-poster** placement rules. If the contribution
     is qualitative (protocol, framework, taxonomy), skip the highlight card
     entirely.
   - The sibling `README.md` written by the scaffold is informational only;
     delete it once the author no longer needs the reminder.
   - Replace placeholder text instead of appending to it.

4. Validate and fix:
   ```bash
   npx marpx decks/$ARGUMENTS/poster.md -v
   ```
   On `visual-overflow`: trim a card, rebalance columns, or move a card to
   another column. Never shrink the font below readability. Repeat until clean.

5. Optional — export for printing (run only when the user asks for a PDF):
   ```bash
   npx marpx decks/$ARGUMENTS/poster.md --pdf
   ```

## Done When

`Findings: 0` reported by the validator, and the poster reviews well in a
single-shot preview. PDF export is a separate request, not part of the
success contract.
