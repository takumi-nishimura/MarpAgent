# Rule interpretation

The current implementation is `src/deck-validator.js`, with visual measurement in `src/visual-overflow.js` and CLI fallback/strict behavior in `scripts/validate-deck.js`. Check these sources if the runtime report differs from this reference. Thresholds are source-based heuristics, not universal design limits.

## Current slide findings

All findings below currently have `warning` severity, including overflow. The CLI exits 1 when any finding exists, 0 when none exist, and 2 for an execution failure. A high content threshold is not a distinct `error` severity in the current implementation.

| Rule | Current trigger | Likely response |
|---|---|---|
| `long-heading` | Heading length > 48 | Shorten without losing the claim; ≥ 70 also contributes to `overflow-risk` |
| `dense-bullets` | ≥ 9 top-level bullets, including sums across columns | Group or split ideas while respecting requested slide count |
| `figure-text-density` | A visual plus ≥ 6 top-level bullets or prose lines | Let the figure carry more explanation; move secondary detail when appropriate |
| `comparison-overpacked` | Table ≥ 5 columns × 3 data rows, or exact `.col` detection with ≥ 10 top-level bullets | Reduce comparison dimensions or split |
| `typography-drift` | `.text-xs2`, `.text-xs3`, `<small>`, or a matched tiny font-size pattern | Restore readable type and simplify content |
| `overflow-risk` | ≥ 12 bullets, ≥ 10 prose lines, ≥ 600 counted characters, heading ≥ 70, or a prose line ≥ 140 characters | Inspect the content and render before selecting a repair |
| `visual-overflow` | Measured content exceeds the slide's vertical viewport | Repair the actual overflow; figure-only overflow may need resizing rather than splitting |

Code/style/script/comments, certain footnote blocks, and structural HTML are excluded from some counts; tables are excluded from character counts. The character total includes more than ordinary prose, such as counted headings/bullets, and the HTML/class recognizers are not a complete DOM model. Do not alter formatting or move meaningful content into excluded blocks to game these limitations.

Visual detection replaces `overflow-risk` only for slides where it reports measured overflow in the current implementation. A successful measurement with no overflow does not automatically clear every heuristic warning. Rendered evidence may justify classifying a warning as a false positive, but the finding should remain visible in the report.

## Paper and visual coverage

The current paper detector recognizes `a4-portrait` and `a4-landscape`. It skips slide-density heuristics, including typography drift; visual overflow still needs to run. Other A-series labels do not automatically enter paper mode.

In default mode, missing browser/render support can fall back to heuristics. A paper can then show `Findings: 0` without any effective layout measurement. Use `--strict-visual` before claiming visual validation succeeded, and report unavailable checks instead of converting fallback into a success claim.

Pixel overflow is one signal. Inspect labels, clipping, collisions, citations, media identity, and narrative as relevant. For paper overflow, rebalance columns or shorten a card while keeping one page. For a fixed slide count, preserve the user's constraint and discuss a concrete content tradeoff if it cannot be met readably.
