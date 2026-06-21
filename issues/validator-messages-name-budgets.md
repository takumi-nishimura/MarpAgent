---
title: "Validator error messages should name which budget tripped"
status: open
created: 2026-06-21
updated: 2026-06-21
labels: [refactor, dx]
---

## Problem

Validator findings (`dense-bullets`, `overflow-risk`, `figure-text-density`, `comparison-overpacked`, `long-heading`, `typography-drift`) report the rule that fired but not which budget contributed or how the content broke it down. Two concrete examples surfaced during empirical skill tuning:

- A three-column slide with 4 bullets per column trips `dense-bullets` ("Slide contains 12 top-level bullet items"). The author has no signal that the count is summed *across columns* — the surface reads like a single 12-bullet list.
- A slide with a long callout body trips `overflow-risk`. The message does not mention that callout body text is counted toward body characters and the single-line cap, leading authors to think the callout is exempt.

Both gaps had to be patched in skill notes (`marp-validator`, `marp-slide-types`) as workarounds. The skill notes will rot if the tooling changes; the root fix is at the message layer.

## Goal

Each validator finding's message names the specific budget that tripped and — where relevant — the contribution per structural unit (per column, per callout, etc.). Authors should be able to remediate without reading external skill notes that explain the counting rules.

## Acceptance criteria

- [ ] `dense-bullets` on a multi-column slide includes the per-column bullet breakdown, e.g. `"13 top-level bullets (4+4+5 across 3 columns)"`.
- [ ] `overflow-risk` mentions which threshold dominated (chars / lines / bullets) instead of a generic heuristic phrase.
- [ ] `long-heading` keeps current format (it already names the char count).
- [ ] `typography-drift` names the offending class explicitly (it already does — leave as is).
- [ ] When callout content contributes to the body-character or single-line cap, the message says so (e.g. `"single line 233 chars (callout body)"`).
- [ ] No regression to existing validator unit tests; new tests cover the new message format.

## Out of scope

- Changing the *thresholds* themselves. This issue is only about message clarity.
- Rendering changes to the report output beyond the message strings.

## Files

- `src/deck-validator.js` (rule implementations and message construction)
- `test/deck-validator.test.js` (or equivalent — verify with `npm test`)

## Notes

Surfaced by empirical-prompt-tuning of `.agents/skills/` on 2026-06-21.

Skill-side notes that interact with this change (post-implementation review):

- `marp-validator/SKILL.md` "What IS counted" section — kept but tightened to *pre-emptive* targets only (the message now names the breakdown reactively, so the skill no longer needs to teach the same fact in advance).
- `marp-slide-types/SKILL.md` three-column / feature-grid bullet-budget rules — kept as pre-emptive guidance ("write within budget" still earns its keep).
- `marp-components/SKILL.md` callout 140-char wrap rule — kept as pre-emptive guidance.

The original "drop these notes" plan was over-aggressive: pre-emptive and reactive guidance are complementary, not redundant.
