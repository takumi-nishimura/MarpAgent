# Evaluation Fixtures

These fixtures intentionally cover common deck-generation edge cases.
`scripts/ci-validate-fixtures.js` holds the expected rendered errors and
source-heuristic hints for each fixture, including the hints expected only when
rendering is unavailable.

## Slide fixtures (validator rules)

- `overflow-heavy-slide.md`: 20 bullets → rendered `content-clipped` error and `edge-crowding` warning (hint: `dense-bullets`)
- `dense-bullets-slide.md`: 9 top-level bullets → hint `dense-bullets`
- `figure-heavy-slide.md`: Image (`fig.png`, a placeholder that must stay present so the fixture has no `missing-asset` error) + 6 bullets → hint `figure-text-density`
- `long-japanese-slide.md`: Long heading + body → hint `long-heading` (`overflow-risk` only when rendering is unavailable)
- `comparison-slide.md`: 5-column table → hint `comparison-overpacked`
- `tiny-text-slide.md`: `<small>` tag, rendered at 20.8px → no finding after a render (`typography-drift` only when rendering is unavailable)
- `scoped-small-text-slide.md`: scoped `<style>` sets the body to 10px → rendered `text-too-small` error (no source hint: the heuristic cannot see `<style>`)
- `text-overlap-slide.md`: the closing sentence runs into the footnote block → rendered `text-overlap` error (no source hint)
- `clean-slide.md`, `paginate-skip-slide.md`, `muji-slide.md`, `toshiba-slide.md`: no findings (negative tests)

## Brief fixtures (outline generation)

- `good-brief.md`: A compact, well-structured input brief for `src/outline.js` tests.
