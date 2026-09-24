---
id: ISS-0009
title: Ground design and text-density validation in the rendered slide
type: issue
status: closed
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- src/deck-validator.js
- src/visual-overflow.js
tags:
- refactor
- validator
depends_on:
  - ISS-0019
  - ISS-0021
  - ISS-0022
  - ISS-0023
  - ISS-0024
supersedes: []
resolution: completed
resolved: "2026-09-24"
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Ground design and text-density validation in the rendered slide

## Problem

The design and text-volume checks in `src/deck-validator.js:175-323` score Markdown source text with fixed thresholds, and the results do not match what authors see on the rendered slide. The author reports that they do not trust these checks. Concrete gaps:

- **Width is counted in code units, not rendered width.** `line.length >= 140` and `totalChars >= 600` treat a Japanese character like a Latin one, although it renders about twice as wide. A 100-character Japanese line wraps more than a 140-character English line but passes.
- **Thresholds ignore canvas and theme.** The same numbers apply to 16:9, 4:3, and custom pixel canvases and to every theme's font size.
- **Source-level typography detection misses real cases.** `detectTinyTypography` runs on text with `<style>` blocks stripped (`src/deck-validator.js:198-199`), so `<style scoped>section { font-size: 14px }</style>` is never flagged. Meanwhile the `text-xs2` class is flagged even when the rendered size is acceptable.
- **The pixel check measures only vertical overflow of `section`.** `measureOverflowInBrowser` compares `scrollHeight` and `clientHeight` (`src/visual-overflow.js:87-105`). It does not detect horizontal overflow, content clipped inside `overflow: hidden` children (columns, cards, figures), overlapping elements, or rendered font sizes below a minimum.
- **Paper decks skip every design check** (`lintSlide` returns early for `paper`), so only vertical overflow is checked on the densest outputs.
- Heuristic findings can contradict the pixel check (see ISS-0007).

## Goal

Findings about density and typography come from measurements of the rendered slide, so each one corresponds to something visible. Source-text heuristics remain only as a fallback when rendering is unavailable, and are labeled as such.

## Acceptance criteria

- [ ] The rendered check reports per slide: minimum computed body font size, horizontal overflow, overflow clipped inside descendants, and a rendered text-fill metric (text line count or text-box area ratio).
- [x] `typography-drift` is decided from the computed font size against a theme-relative minimum and catches scoped `<style>` overrides.
- [ ] Density findings use rendered metrics when available; when they fall back to the source heuristic, the finding says so. The fallback counts CJK characters by display width.
- [x] Paper decks get the rendered checks that apply to a single canvas (clipping, minimum font size, horizontal overflow).
- [x] Thresholds live in one documented place, and `marp-validator/references/rules.md` explains each rule in terms of what is visible on the slide.
- [x] Fixtures in `fixtures/` gain expected results for the new checks, and `scripts/ci-validate-fixtures.js` enforces them.

## Out of scope

- Narrative and content-quality review (handled by the `slide-review` skill).
- Inline rule suppression and severity configuration (not yet requested).

## Notes

This is an umbrella issue. On 2026-09-23 the author confirmed the main complaint: the judgments are too strict, do not match their design sense, and produce many false positives. XR-0001 measured this on the author's accepted decks, and ADR-0001 (accepted 2026-09-24) sets the policy: rendered measurement is authoritative, and source heuristics are non-blocking hints. The work is split into:

- ISS-0019: phase 1, render-measured clipping as the only blocking finding (done).
- ISS-0021: overlapping text.
- ISS-0022: rendered minimum font size in place of `typography-drift`.
- ISS-0023: warn when rendered content crowds the slide edge.
- ISS-0024: report media that fail to load.

The remaining criteria here (horizontal and ancestor clipping, paper coverage, CJK-width fallback, documented thresholds) are covered by ISS-0019 or will be closed with the follow-ups.

Closed on 2026-09-24 after its implementation issues landed: ISS-0019 (clipping), ISS-0021 (overlap), ISS-0022 (rendered minimum font size, which replaces `typography-drift` after a render), ISS-0023 (edge crowding), and ISS-0024 (missing assets). Paper decks get the same rendered checks scaled to their canvas. Thresholds and exemptions are documented in `.agents/skills/marp-validator/references/rules.md`, and `scripts/ci-validate-fixtures.js` checks the expected errors, warnings, and hints for each fixture.

Two criteria are left unticked on purpose, following ADR-0001, which the author accepted:

- Rendered density: no text-fill metric is reported. Density is not a visible defect under ADR-0001, so density findings stay non-blocking source hints. Overflow clipped inside descendants is excluded as an intentional crop.
- Fallback CJK width: the source hints were not recalibrated. ADR-0001 lists "retuning heuristic thresholds" as a non-goal, and after a render the hints never fail validation.
