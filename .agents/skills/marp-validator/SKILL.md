---
name: marp-validator
description: Validator rules and hard limits for MarpAgent slides. Use when running validation, remediating findings, or checking whether a slide is within safe content bounds.
user-invocable: false
---

## Run Validation

```bash
npx marpx decks/<name>/slide.md -v
# With report output:
npx marpx decks/<name>/slide.md -v --report-dir out/<name>
```

## Hard Limits

| Metric | Warn | Error |
| :----- | :--- | :---- |
| Top-level bullet count | >= 9 | >= 12 |
| Text lines | — | >= 10 |
| Body characters (excl. tables) | — | >= 600 |
| Heading characters | >= 48 | >= 70 |
| Single line characters | — | >= 140 |

**Rule: Split the slide before shrinking text.**

Content excluded from counting: `<style>`, `<script>`, `<div class="footnote">` blocks, and HTML-only structural lines.

## Validator Rules

| Rule | Trigger | Remediation |
| :--- | :------ | :---------- |
| `visual-overflow` | Rendered slide content overflows viewport (pixel-accurate, supersedes `overflow-risk`) | Split slide |
| `overflow-risk` | Body > 600 chars or >= 10 text lines or >= 12 top-level bullets (heuristic fallback) | Split slide |
| `dense-bullets` | >= 9 top-level bullets | Split slide |
| `long-heading` | Heading >= 48 chars (warn) / >= 70 (error) | Shorten to < 48; move detail to body |
| `typography-drift` | `.text-xs2` or `.text-xs3` in use | Remove class; split content instead |
| `figure-text-density` | Image + >= 6 top-level bullets or text lines | Move text to next slide |
| `comparison-overpacked` | Table >= 5 cols x 3 rows, or two-column with >= 10 top-level bullets | Split into two slides |

## Remediation Classification

For each finding, apply one action:

- **Split** — too much content; divide into two slides
- **Trim** — heading or line too long; shorten the text
- **Retype** — forbidden class (`.text-xs2`, `.text-xs3`); remove it, split if needed
