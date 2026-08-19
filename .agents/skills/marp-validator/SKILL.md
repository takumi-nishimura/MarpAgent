---
name: marp-validator
description: Run and interpret MarpAgent content and visual-overflow checks, then guide proportionate slide or paper repairs.
user-invocable: false
---

# Deck validation

Run from the repository root using the supported Node version in `package.json`. `--report-dir` retains findings and screenshots for a review; use a fresh or verified run-owned directory.

```sh
npm run marpx -- decks/<name>/slide.md -v --report-dir out/<review-run>
```

For a final claim that visual validation passed, require the actual visual check rather than accepting the heuristic fallback:

```sh
npm run marpx -- decks/<name>/slide.md -v --strict-visual --report-dir out/<review-run>
```

The same commands accept `paper.md`. If tooling is unavailable, report partial validation and the reason; do not describe `Findings: 0` from fallback as a verified render. Use `--format json` or `sarif` only when structured results are useful. Read [rule interpretation](references/rules.md) for thresholds, counting limits, and remediation choices.

Fix the cause while preserving meaning and the requested format: trim or split dense material, rebalance paper columns, repair layout, or resize a figure as appropriate. Do not shrink body typography or rewrite source formatting merely to defeat the counter. If a fixed slide/page count makes the tradeoff material, resolve that choice with the user rather than discarding content.

Compare findings by rule, slide identity/content, and severity, accounting for slide renumbering. A stable count can hide a new issue. Recheck after relevant edits and inspect the rendered result; overflow detection is not a complete assessment of overlap, horizontal clipping, missing assets, narrative, or scientific correctness.

Report the findings, whether visual measurement actually ran, the relevant artifacts, and unresolved limits. Keep confirmed heuristic false positives visible with supporting render evidence rather than claiming zero findings. Do not delete an existing report directory to make completion look clean.
