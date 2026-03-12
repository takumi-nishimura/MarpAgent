# Evaluation Fixtures

These fixtures intentionally cover common deck-generation edge cases.
Each slide fixture targets one or more validator rules in `src/deck-validator.js`.

## Slide fixtures (validator rules)

- `dense-bullets-slide.md`: 9 top-level bullets → `dense-bullets`
- `figure-heavy-slide.md`: Image + 6 bullets → `figure-text-density`
- `long-japanese-slide.md`: Long heading + body → `long-heading`, `overflow-risk`
- `comparison-slide.md`: 5-column table → `comparison-overpacked`
- `tiny-text-slide.md`: `<small>` tag → `typography-drift`
- `clean-slide.md`: Well-structured slide with no findings (negative test)

## Brief fixtures (outline generation)

- `good-brief.md`: A compact, well-structured input brief for `src/outline.js` tests.
