---
name: slide-edit
description: Revise an existing MarpAgent slide.md presentation, including shortening, restructuring, rewriting, or replacing figures while preserving its intent, sources, and human edits.
argument-hint: <path/to/slide.md>
---

# Edit a slide deck

Resolve the target `slide.md` and requested outcome from the conversation. Work directly in that file. Match the scope: a figure adjustment needs a local edit; a request to shorten or rethink the story can require broader changes. Use [slide-add](../slide-add/SKILL.md) for a focused insertion or [slide-review](../slide-review/SKILL.md) for a report-only review.

## Understand the current deck

Read the affected slides, their neighbors, the brief if present, and relevant sources or assets. Inspect existing renders when layout matters. Preserve the user's claims, terminology, citations, theme, and intentional edits. Establish the current findings before changes when needed to distinguish regressions from existing problems.

Treat `slide.md` as the current presentation. The brief records purpose and constraints; do not rebuild a human-edited deck from it. A legacy outline may contain useful intent, but do not force the slides back to its old page plan. Preserve that file and do not create or synchronize an outline unless explicitly requested. An existing deck without a brief can be edited without creating one.

## Revise and inspect

Make the smallest coherent change that achieves the request. For a structural revision, move, combine, or remove pages in `slide.md` and work from rough content there. Prototype a materially changed or uncertain page with actual assets before propagating its treatment across the deck. For local edits, proceed directly to the affected page.

Use [marp-slide-types](../marp-slide-types/SKILL.md) to choose the form that makes the evidence and reasoning easiest to follow, and [marp-components](../marp-components/SKILL.md) only as needed. Replace generic wording with concrete statements supported by the supplied material. Retain qualifications, units, comparison conditions, and sources when cutting text. Follow reference decks and the user's voice; do not impose equal bullet counts, a new card system, or layout variety as an end in itself.

Check transitions and cross-references after moving or splitting pages. Check local versus inherited directives, displayed page numbers, media paths, and presenter notes. Reuse owned media through the repository's file-symlink convention. Update the brief only for changed requirements or source context, not for a new slide order.

If the requested cut would remove necessary evidence or violate a fixed constraint, make the tradeoff explicit. Ask for a decision only when it cannot be resolved from the user's priorities; continue independent edits where possible.

## Verify and deliver

Use [marp-validator](../marp-validator/SKILL.md) for validation and inspect the changed renders and their neighbors. For structural edits, also inspect the whole sequence, using `--overview` when useful. Compare findings by rule and affected content after renumbering. Fix introduced problems and distinguish pre-existing findings from new ones.

Remove temporary drafting comments or turn them into intentional speaker notes. Export when requested, then summarize the substantive changes and actual checks, including any unresolved source or rendering limitations. Do not describe a deck as visually or scientifically sound solely because the validator passes.
