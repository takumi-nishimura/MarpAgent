# Rule interpretation

The current implementation is `src/deck-validator.js`, with rendered measurement in `src/visual-overflow.js` and CLI fallback/strict behavior in `scripts/validate-deck.js`. Check these sources if the runtime report differs from this reference. The policy is recorded in `docs/decisions/ADR-0001-make-rendered-measurement-the-authority-for-deck-validation.md`.

## Severity and exit codes

| Severity | Meaning | Exit code |
|---|---|---|
| `error` | A visible defect measured on the rendered slide | 1 |
| `warning` | A design risk measured on the render (`edge-crowding`), or a source heuristic reported because rendering was unavailable | 0 (use `--strict` to fail when rendering is unavailable) |
| `info` (hint) | A source heuristic reported alongside a successful render; hidden unless `--hints` is passed | 0 |

The CLI exits 2 for an execution failure, including a strict run whose render failed.

## Rendered findings

| Rule | What is measured | Likely response |
|---|---|---|
| `content-clipped` (error) | Visible text lines or media (`img`, `svg`, `video`, `canvas`, `iframe`, `object`) extend past the slide canvas. Trailing margins, empty boxes, and parts already cropped by an `overflow` container do not count. Text is allowed 2px of rounding; media also up to 2% of its size on one edge. | Resize or move the listed element; for text, trim, rebalance, or split. The message names each element, the edge, and the overflow in slide pixels. |
| `edge-crowding` (warning) | Unclipped content lies within the safe margin of the slide edge: 20px at a 720px-tall canvas (the theme's pagination inset), scaled with canvas height. Text is checked at the bottom, left, and right; media only at the bottom, since media boxes often include transparent side margins. The top edge, absolutely positioned content, header/footer, and footnote blocks (any class containing `footnote`) are exempt. | Leave breathing room: trim or rebalance so the last line or figure clears the margin, or move the element inward. It does not fail validation. |

The rendered check uses Marp's bare template, so every slide is laid out and measured. It does not yet detect overlapping elements or rendered text that is too small to read; inspect screenshots for those.

## Source-heuristic hints

These count Markdown source, not the rendered result. They ignore theme font size, canvas size, and column layout, and they count a Japanese character the same as an ASCII character. After a successful render they are only hints; `overflow-risk` is dropped entirely because the rendered measurement answers it directly.

| Rule | Current trigger |
|---|---|
| `long-heading` | Heading length > 48 |
| `dense-bullets` | ≥ 9 top-level bullets, including sums across columns |
| `figure-text-density` | A visual plus ≥ 6 top-level bullets or prose lines |
| `comparison-overpacked` | Table ≥ 5 columns × 3 data rows, or `.col` with ≥ 10 top-level bullets |
| `typography-drift` | `.text-xs2`, `.text-xs3`, `<small>`, or a matched tiny inline font-size |
| `overflow-risk` | Fallback only: ≥ 12 bullets, ≥ 10 prose lines, ≥ 600 counted characters, heading ≥ 70, or a prose line ≥ 140 characters |

Bullet-like lines inside fenced code blocks (`` ``` `` or `~~~`) are not counted, and `--lint --autofix` leaves fenced code and inline code spans byte-identical.

Do not alter formatting or move meaningful content into excluded blocks to silence a hint. When a hint points at a slide, judge the rendered slide; leave the content alone if it reads well.

## Paper and fallback coverage

The paper detector recognizes `a4-portrait` and `a4-landscape`. Paper decks skip the source hints; the rendered check still applies to the full page.

Without a browser, validation falls back to source heuristics as warnings and prints `Visual check: skipped (<reason>)`. A paper can then show `Findings: 0` without any layout measurement. Use `--strict` before claiming validation succeeded, and report unavailable checks instead of converting fallback into a success claim.

For paper clipping, rebalance columns or shorten a card while keeping one page. For a fixed slide count, preserve the user's constraint and discuss a concrete content tradeoff if it cannot be met readably.
