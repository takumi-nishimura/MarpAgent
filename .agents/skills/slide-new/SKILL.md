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
   npx marpx -n decks/$ARGUMENTS
   ```

2. Fill `decks/$ARGUMENTS/brief.md` — all 8 sections, no placeholders:
   Audience, Duration, Core Message, Audience Action, Required Sections, Must-Use Assets, Forbidden Patterns, References.

3. **Review brief with the user.** Present the completed brief and ask for feedback before proceeding. Revise until the user approves.

4. Generate outline:
   ```bash
   npx marpx decks/$ARGUMENTS/brief.md --outline
   ```

5. **Review outline with the user.** Present the slide plan (titles, layout hints, flow) and discuss:
   - Are the sections in the right order?
   - Should any slides be added, removed, or merged?
   - Are the layout choices appropriate?

   Revise `outline.md` based on feedback before proceeding.

6. Read `decks/$ARGUMENTS/outline.md`. Each slide has `Layout hint: content` or `Layout hint: two-column`. Apply the matching template from the **marp-slide-types** skill.
   - Title/close slides always use the `title` type.
   - If using `--bg-gray-5` (three-column / feature-grid / summary-box), declare it in frontmatter `style:` — see **marp-components** skill.

7. Author `decks/$ARGUMENTS/slide.md`:
   - One slide per `---` separator
   - Carry `<!-- _header: ... -->` consistently within each section

8. Validate and fix:
   ```bash
   npx marpx decks/$ARGUMENTS/slide.md -v
   ```
   On `overflow-risk`: split the slide. Never shrink text. Repeat until clean.

## Done When

`Findings: 0` reported by the validator.
