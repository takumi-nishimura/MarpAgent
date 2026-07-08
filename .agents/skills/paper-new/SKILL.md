---
name: paper-new
description: Create a new MarpAgent A-series paper deck end-to-end — scaffold, author the single-page paper, validate.
disable-model-invocation: true
argument-hint: <deck-name>
---

Create a new A-series paper deck at `decks/$ARGUMENTS`.

A paper deck is one full-page A-series canvas, not a slide sequence. Follow the
**marp-paper** skill for all structure and class details.

## Steps

1. Scaffold:
   ```bash
   npm run marpx -- -n decks/$ARGUMENTS --paper
   ```
   This creates a single `paper.md` (A4 portrait) plus `assets/` and `shared`.
   No `brief.md` / `outline.md` — a paper deck does not use that pipeline.

2. **Confirm orientation and sections with the user.** Default is A4 portrait
   with three columns. Ask whether they want landscape (`size: a4-landscape`,
   four columns) and which sections the page needs (e.g. Introduction, Method,
   Results, Conclusion, References). Revise the placeholder structure until
   they approve.

3. Author `decks/$ARGUMENTS/paper.md`:
   - Keep the `<header>` band, `<div class="paper-columns">` body, and
     `<footer>` band — one slide, no `---` separators in the body.
   - One `<div class="paper-col">` per column; one
     `<section class="paper-section">` per topic.
   - If the work has a single headline result (e.g. a percentage, RMSE, or
     n-vs-baseline number), add a `paper-section highlight` + `paper-stat`
     block — the scaffold does NOT include one by default. Fuse it with the
     Results section per **marp-paper** placement rules. If the contribution is
     qualitative (protocol, framework, taxonomy), skip the highlight card
     entirely.
   - The sibling `README.md` written by the scaffold is informational only;
     delete it once the author no longer needs the reminder.
   - Replace placeholder text instead of appending to it.

4. Validate and fix:
   ```bash
   npm run marpx -- decks/$ARGUMENTS/paper.md -v
   ```
   On `visual-overflow`: trim a card, rebalance columns, or move a card to
   another column. Never shrink the font below readability. Repeat until clean.

5. Optional — export for printing (run only when the user asks for a PDF):
   ```bash
   npm run marpx -- decks/$ARGUMENTS/paper.md --pdf
   ```

## Done When

`Findings: 0` reported by the validator, and the paper deck reviews well in a
single-shot preview. PDF export is a separate request, not part of the success
contract.
