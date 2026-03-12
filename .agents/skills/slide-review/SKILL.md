---
name: slide-review
description: Validate a MarpAgent slide deck and remediate all findings until clean.
argument-hint: <deck-name>
---

Validate and remediate `decks/$ARGUMENTS/slide.md`.

## Steps

1. Run validation with a report:
   ```bash
   npx marpx decks/$ARGUMENTS/slide.md -v --report-dir out/$ARGUMENTS
   ```

2. Read `out/$ARGUMENTS/report.md`. For each finding, classify the action using the **marp-validator** skill:
   - **Split** — too much content
   - **Trim** — heading or line too long
   - **Retype** — forbidden class in use

3. Apply remediations one slide at a time. Re-validate after each change.

4. `typography-drift` → remove `.text-xs2` / `.text-xs3`; split content across two slides.

5. `long-heading` → shorten to < 48 chars; move cut detail into the slide body.

6. Final check:
   ```bash
   npx marpx decks/$ARGUMENTS/slide.md -v
   ```

## Done When

`Findings: 0`. Then delete `out/$ARGUMENTS/`.
