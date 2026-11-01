---
name: slide-author
description: Create or edit MarpAgent slide.md presentations, including new decks, local revisions, restructuring, and page additions. Use slide-review for findings-only requests.
argument-hint: <deck-name-or-path/to/slide.md> [request]
---

# Author a slide deck

Resolve the target and requested outcome from the arguments or conversation. Work in `decks/<name>/slide.md` or the supplied `slide.md` path. New decks, revisions, and additions share this workflow; match the amount of work to the request. Findings-only requests use [slide-review](../slide-review/SKILL.md). A new single-page `paper.md` uses [paper-new](../paper-new/SKILL.md).

## Establish context and scope

Read the supplied sources, actual figures/data, relevant brief, and reference slides. Identify the audience, intended outcome, delivery format, time, and genuine constraints. Follow the user's voice and design. Ask only for missing information that materially changes the result; state consequential assumptions and flag unsupported claims. Honor a requested outline or approval stage; otherwise continue to the requested finished draft.

| Target state | Action |
| --- | --- |
| New deck | Inspect the destination, then scaffold only if it has no existing deck or template files. Write a short `brief.md` with purpose, audience, constraints, and source/asset references. |
| Existing deck | Read affected slides and their neighbors, then edit the current `slide.md`. A local figure change needs a local edit; a request to rethink the story can need broader changes. |
| Page addition | Resolve the new content and insertion point; choose and state a coherent position if unspecified. Insert in the same file and preserve unrelated slides. |

For a new destination:

```sh
npm run marpx -- -n decks/<name>
```

Never re-scaffold or use `--force` to overwrite an existing deck as part of this workflow. Keep human-edited `slide.md` as the current presentation. An existing deck without a brief can be edited without creating one. Update the brief for changed requirements or sources, not to mirror page order or wording. Read any unique requirements in a legacy `outline.md` and preserve it; create or synchronize an outline only when requested. A target page count is a hard limit only when specified as one.

## Develop and revise in place

For new decks or structural revisions, sketch rough headings and material in `slide.md`, then try important or uncertain pages with actual assets before extending their treatment. Expand, trim, reorder, combine, or split within that file. For a local revision or insertion, proceed directly to the affected pages and check their transitions and cross-references.

Use [marp-slide-types](../marp-slide-types/SKILL.md) to choose a structure from the content and evidence, and [marp-components](../marp-components/SKILL.md) only for components being used. Preserve claims, terminology, sources, qualifications, units, comparison conditions, theme, and intentional human edits. Do not invent evidence, force equal bullet counts/cards, or change layouts merely for variety.

For layout work, inspect default behavior, then supported theme parameters/utilities, before adding justified page-specific CSS. Record why an inline size, wrapper, or parameter is added or kept; preserve deliberate crop/scroll and emphasis. For shared layout/theme comparisons, use the [representative baselines and comparison method](../../../fixtures/layout-baselines/README.md) with matching browser and verified font conditions.

Follow repository media ownership: keep one-off assets with their owning deck and reuse another deck's media through named relative file symlinks. Check consumers before changing owned assets. Preserve local/inherited directives, headers, pagination, media paths, and presenter notes when inserting or moving slides. If a required cut or split changes meaning or violates a fixed constraint, resolve that concrete tradeoff from the user's priorities or ask for the missing decision.

## Inspect, correct, and deliver

Rendering, self-checking, and correction are part of authoring; they do not require a separate review task. Use [marp-validator](../marp-validator/SKILL.md) and inspect the affected renders and neighbors. For a new deck or structural change, inspect the whole sequence; `--overview` is useful for that. Check reasoning, evidence, figure labels, readable density, and the requested balance of spoken explanation and standalone reading.

Compare findings by rule and affected content after renumbering; unchanged totals can hide a regression. Correct introduced problems and report pre-existing ones separately. Preserve evidence when trimming or splitting, and readable body type when resizing figures. Recheck after meaningful corrections; stop repeating passed checks when no new relevant changes were made. A validator pass does not establish narrative, scientific support, or figure readability; disclose unavailable rendering rather than claiming visual success.

Replace scaffold placeholders, resolve or disclose missing source material, and remove temporary drafting comments or convert them into intentional speaker notes. Export the requested formats and summarize substantive changes, actual checks, and remaining limitations. For additions, state the insertion and resulting page-count change. Start a persistent preview only when needed or requested, and clean up task-owned previews and disposable check artifacts while retaining requested outputs and evidence.
