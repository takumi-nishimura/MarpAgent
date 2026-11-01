---
name: slide-review
description: Review MarpAgent slide.md content and rendered layout and report actionable findings without editing the deck by default. Apply corrections only when requested, using slide-author.
argument-hint: <deck-name-or-path/to/slide.md> [review-scope]
---

# Review a deck

Resolve `decks/<name>/slide.md` or the explicit deck path and requested review scope. Review without editing the deck by default, including when the request simply says "review" or "check". Run validation without `--autofix`; findings do not authorize repairs. When the user also requests fixes, continue with the correction path below within that scope.

Read the deck and relevant brief/source material, then use [marp-validator](../marp-validator/SKILL.md):

```sh
npm run marpx -- decks/<name>/slide.md -v --strict
```

Read the findings and actual rendered slides: the validator does not check scientific support, narrative, every collision, or asset meaning. Distinguish pre-existing problems, introduced regressions, and confirmed heuristic false positives. Use `--report-dir` when retained diagnostic evidence is needed, choosing a fresh or verified run-owned directory.

Review `slide.md` as the current presentation and the brief as its purpose and constraints. Do not score compliance with an obsolete outline or regenerate one to match the slides. Read a legacy outline for unique requirements if needed; preserve it unless asked to change it.

Check the whole sequence as well as individual pages, using `--overview` when useful. Look for a missing reasoning step, duplicated point, unsupported heading, lost qualification, or a figure whose important observation is hard to find. Check whether wording and density fit the audience and delivery format. Use [marp-slide-types](../marp-slide-types/SKILL.md) for content-driven layout guidance. Repeated bullet or card patterns matter when they obscure the content; repetition itself and a consistent visual style are not errors. Report concrete pages, effects on the audience, and proportionate remedies rather than a generic “AI-like” score.

Record visual concerns by page or stable case ID, target region, image, observed effect, candidate remedy, confidence and verification state. Keep measured defects separate from unverified concerns and preferences. Inspect figure labels and legends in the image; zero validator errors do not establish their readability. For a shared layout/theme comparison, use the [baseline comparison method and review template](../../../fixtures/layout-baselines/README.md), preserving the source, images, font/browser conditions and adjustment reasons.

## When corrections are requested

Use [slide-author](../slide-author/SKILL.md) in the same task for the authorized corrections, preserving the review scope, existing sources, and intentional edits. Its editing and verification workflow applies to local fixes as well as structural changes; do not require another review task or a separate reviewer. Complete the corrections, inspect changed pages and neighbors, and report remaining findings. An environment failure or unresolved content decision remains an explicit limit, not a verified clean deck.

Deliver actionable findings in the response with concrete pages/regions, their effect, evidence, and proportionate remedies. Save a separate review document only when requested. Retain requested reports and screenshots; clean up only task-owned previews and disposable artifacts. Do not delete an existing report directory as a success step.
