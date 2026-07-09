---
name: slide-new
description: Create a new MarpAgent slide deck end-to-end — scaffold, fill brief, generate outline, author slides, validate.
disable-model-invocation: true
argument-hint: <deck-name>
---

Create a new deck at `decks/$ARGUMENTS`.

## Steps

1. Scaffold:
   ```bash
   npm run marpx -- -n decks/$ARGUMENTS
   ```
   The scaffold creates placeholder `brief.md` and `slide.md` files. Before outline approval, treat `slide.md` as an untouched scaffold artifact, not authored content.

2. Fill `decks/$ARGUMENTS/brief.md` — all 8 sections, no placeholders:
   Audience, Duration, Core Message, Audience Action, Required Sections, Must-Use Assets, Forbidden Patterns, References.

3. **Review brief with the user.** Present the completed brief and ask for feedback before proceeding. Revise until the user approves.
   Stop here until the user responds. Do not generate `outline.md` yet.

4. Generate outline:
   ```bash
   npm run marpx -- decks/$ARGUMENTS/brief.md --outline
   ```
   The generator dedupes any Title/Agenda the brief already lists and carries layout-variant hints (`[multi-column]`, `(closing variant)`, `using the feature-grid variant`, …) through to the outline's `Layout hint:` field — no manual sweep needed.

5. **Review outline with the user.** Present the slide plan (titles, layout hints, flow) and discuss:
   - Are the sections in the right order?
   - Should any slides be added, removed, or merged?
   - Are the layout choices appropriate?

   Revise `outline.md` based on feedback before proceeding.
   Stop here again until the user approves the outline.

6. Read `decks/$ARGUMENTS/outline.md`. Each slide has a layout hint such as `title`, `content`, `content (agenda variant)`, `content (summary variant)`, `content (closing variant)`, or `two-column`. These are template labels, not theme class names. Apply the matching template from the **marp-slide-types** skill.
   - `title` maps to the opening cover slide template
   - `content (...)` keeps the `content` base type and applies the named variant
   - `two-column` maps to the standard `.col` template unless the outline or user explicitly asks for `multi-column` or `feature-grid`
   - Multi-column, feature-grid, and summary-box styles are built into the theme — do not paste scoped component CSS into `slide.md`.

7. Author `decks/$ARGUMENTS/slide.md`:
   - One slide per `---` separator
   - Carry `<!-- _header: ... -->` consistently within each section
   - Replace the scaffold placeholder content instead of appending to it

8. Validate and fix:
   ```bash
   npm run marpx -- decks/$ARGUMENTS/slide.md -v
   ```
   On `visual-overflow`, `overflow-risk`, `dense-bullets`, `figure-text-density`, or `comparison-overpacked`: split the slide. Never shrink text. Repeat until clean.

## Done When

`Findings: 0` reported by the validator.
