---
name: slide-review
description: Review MarpAgent deck content and rendered layout, report actionable findings, and fix them when remediation is requested.
argument-hint: <deck-name>
---

# Review a deck

Resolve `decks/<name>/slide.md` or the explicit deck path. Match the review scope: a report-only request does not authorize editing slides; when fixes are requested, complete them within the agreed content and design constraints. Do not turn a review of a claim into a redesign of the whole deck.

Read the deck and relevant brief/source material, then use [marp-validator](../marp-validator/SKILL.md):

```sh
npm run marpx -- decks/<name>/slide.md -v --report-dir out/<review-run>
```

Use a fresh report directory or a verified directory belonging to this review. Read the findings and actual rendered slides: the validator does not check scientific support, narrative, every collision, or asset meaning. Distinguish pre-existing problems, introduced regressions, and confirmed heuristic false positives.

For authorized fixes, group related corrections into coherent passes. Trim or split dense text while preserving the claim; resize an oversized figure without shrinking body text; correct the layout primitive or source link when that is the cause. If splitting conflicts with a fixed slide count or changes meaning, resolve the concrete tradeoff rather than blindly applying the same remedy to every finding.

Revalidate and reread affected slides after meaningful edits. Stop repeating a check when it has passed and no new relevant changes were made. If an environment failure or unresolved content decision prevents completion, report the actual state; do not claim a clean rendered deck from `Findings: 0` alone.

Deliver actionable findings or the repaired deck, relevant validation/visual evidence, and remaining limitations. Retain the requested report and screenshots. Do not delete the entire `out/<name>/` directory as a success step; remove only disposable artifacts created by this run when cleanup is appropriate.
