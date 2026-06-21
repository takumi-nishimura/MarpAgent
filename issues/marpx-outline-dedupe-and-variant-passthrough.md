---
title: "marpx --outline: dedupe Title/Agenda and pass brief variant hints through"
status: open
created: 2026-06-21
updated: 2026-06-21
labels: [refactor, dx]
---

## Problem

The outline generator (`npx marpx <brief.md> --outline`) emits an outline that drifts from the brief in two consistent ways:

1. **Duplicate Title and Agenda.** When the brief's `Required Sections` already includes `Title` and/or `Agenda`, the generator still prepends a generic `Title` + `Agenda` pair, producing two of each in the outline.
2. **Variant hints dropped.** The brief may name a layout-variant (e.g. "three-vendor side-by-side using the three-column layout"), but the generated outline marks the slide as plain `two-column` (or plain `content`), losing the user's stated visual intent.

Both gaps were observed independently in two empirical-tuning runs of `slide-new` against different scenarios. The skill currently works around them by instructing the executor to sweep `outline.md` before showing it to the user — a Band-Aid that rots if the generator changes.

## Goal

The draft outline is faithful to the brief: no synthetic duplicates, and layout-variant hints survive end-to-end. The `slide-new` skill's pre-review sweep step becomes unnecessary.

## Acceptance criteria

- [ ] When `Required Sections` in the brief includes `Title`, the generator does NOT prepend a separate Title slide.
- [ ] Same for `Agenda` — no duplicate when the brief already lists it.
- [ ] When the brief names a recognized variant (`three-column`, `feature-grid`, `agenda variant`, `summary variant`, `closing variant`), the outline's layout-hint field carries the variant tag, not the base type.
- [ ] Existing outline fixtures regenerate identically when their briefs don't reference these features (no spurious diff).
- [ ] New fixtures cover the two new behaviors (dedupe + variant carry).

## Out of scope

- Changing the *outline schema* itself.
- Inferring layout variants from prose content (only honor explicit brief hints — bidirectional inference is a separate, larger problem).

## Files

- `bin/marpx.js` or whichever module implements `--outline` (locate via `rg -l "outline" bin/ src/`)
- Outline-generator unit tests (alongside the source)
- `decks/example/brief.md` and `decks/example/outline.md` if they exist as fixtures

## Notes

Surfaced by empirical-prompt-tuning of `.agents/skills/slide-new` on 2026-06-21. After this landed, the "Treat the result as a draft, not a final outline" sweep paragraph in `slide-new/SKILL.md` step 4 was removed and replaced with a one-liner that simply states the generator now handles dedupe + variant passthrough.
