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

## Remaining-area layout and exports

`body-layout-slide.md` demonstrates the opt-in `.body` contract with a single
figure, unequal evidence/explanation columns, stacked figures, and a result
with supplementary text. It uses only synthetic `body-layout-media.svg` artwork.
There are no position offsets, empty spacer elements, or slide-specific rules.

`tests/e2e/body-layout.spec.js` measures heading/caption boundaries, remaining
height, media containment, alignment, oversized text diagnostics, and explicit
crop/inline size preservation. `layout-compatibility.spec.js` checks existing
`.fill` layouts and title margins across all three themes. `body-exports.spec.js`
exports these same four compositions to HTML, PNG, and PDF and checks print
geometry, canvas dimensions, and page count.

```sh
npm run test:e2e -- tests/e2e/body-layout.spec.js tests/e2e/layout-compatibility.spec.js tests/e2e/body-exports.spec.js --project=chromium --workers=1
npm run marpx -- fixtures/body-layout-slide.md -v --strict
```

The export test keeps the standalone HTML's relative asset beside the output.
For normal authoring, open exported HTML from its deck directory so relative
media resolve. The `.body` defaults and migration rules are documented in
`docs/theme-contract.md`; existing `.fill`-only source does not need rewriting.

## Brief fixtures (outline generation)

- `good-brief.md`: A compact, well-structured input brief for `src/outline.js` tests.

## Representative layout baselines

[`layout-baselines/slide.md`](layout-baselines/slide.md) is a generic 14-slide
benchmark scaffold for #54 / ISS-0046. Stable case IDs and single-condition
boundary pairs are in [`cases.json`](layout-baselines/cases.json); conditions,
review records and comparison instructions are in
[`README.md`](layout-baselines/README.md). It reuses `template/layouts.md` and
the existing composition E2E test. These are current defaults to inspect, not
an already improved design or a new visual quality score. Existing deliberate
overflow/overlap fixtures remain the negative controls.
