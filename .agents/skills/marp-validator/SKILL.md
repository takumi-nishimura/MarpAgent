---
name: marp-validator
description: Run and interpret MarpAgent rendered-slide checks and source hints, then guide proportionate slide or paper repairs.
user-invocable: false
---

# Deck validation

Run from the repository root using the supported Node version in `package.json`. `--report-dir` retains findings and screenshots for a review; use a fresh or verified run-owned directory.

```sh
npm run marpx -- decks/<name>/slide.md -v --report-dir out/<review-run>
```

For a final claim that validation passed, require the rendered check rather than accepting the heuristic fallback:

```sh
npm run marpx -- decks/<name>/slide.md -v --strict --report-dir out/<review-run>
```

The same commands accept `paper.md`. The summary's `Visual check:` line says whether the deck was rendered and measured (`measured`) or not (`skipped (<reason>)`). If it was skipped, report partial validation and the reason; do not describe `Findings: 0` from fallback as a verified render. Use `--format json` or `sarif` only when structured results are useful. Read [rule interpretation](references/rules.md) for what each finding measures and how to respond.

Only `error` findings fail validation. They are defects measured on the rendered slide, such as `content-clipped`, text colliding with other text or media (`text-overlap`), text rendered below the readable size floor (`text-too-small`), or media the deck references that do not load (`missing-asset`, also checked on disk when rendering is skipped). A rendered `edge-crowding` warning means content sits in the safe margin at the slide edge; fix it when it is cheap and the result reads better, and report it otherwise. Fix the cause while preserving meaning and the requested format: resize or move the listed element, trim or split material, rebalance paper columns, or repair layout. Do not shrink body typography merely to make content fit. If a fixed slide/page count makes the tradeoff material, resolve that choice with the user rather than discarding content.

Source-heuristic hints (`--hints`) are counts of bullets, characters, and classes in the Markdown source. They are not failures and often do not match the rendered result. Use them only as prompts to look at the rendered slide; do not cut or restructure content just to silence a hint.

Compare findings by rule, slide identity/content, and severity, accounting for slide renumbering. A stable count can hide a new issue. Recheck after relevant edits and inspect the rendered result; the rendered check does not assess media overlapping media or text against non-text boxes, remote media, narrative, or scientific correctness. Its size floor catches only text that cannot be read, so still judge whether text is comfortably readable.

Report the errors, whether the rendered check actually ran, the relevant artifacts, and unresolved limits. Do not delete an existing report directory to make completion look clean.
