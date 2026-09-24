# Rule interpretation

The current implementation is `src/deck-validator.js`, with rendered measurement in `src/visual-overflow.js`, the media file check in `src/media-assets.js`, and CLI fallback/strict behavior in `scripts/validate-deck.js`. Check these sources if the runtime report differs from this reference. The policy is recorded in `docs/decisions/ADR-0001-make-rendered-measurement-the-authority-for-deck-validation.md`.

## Severity and exit codes

| Severity | Meaning | Exit code |
|---|---|---|
| `error` | A visible defect measured on the rendered slide (`content-clipped`, `text-overlap`, `text-too-small`), or a referenced media file that is definitely missing (`missing-asset`) | 1 |
| `warning` | A design risk measured on the render (`edge-crowding`), or a source heuristic reported because rendering was unavailable | 0 (use `--strict` to fail when rendering is unavailable) |
| `info` (hint) | A source heuristic reported alongside a successful render; hidden unless `--hints` is passed | 0 |

The CLI exits 2 for an execution failure, including a strict run whose render failed.

## Rendered findings

| Rule | What is measured | Likely response |
|---|---|---|
| `content-clipped` (error) | Visible text lines or media (`img`, `svg`, `video`, `canvas`, `iframe`, `object`) extend past the slide canvas. Trailing margins, empty boxes, and parts already cropped by an `overflow` container do not count. Text is allowed 2px of rounding; media also up to 2% of its size on one edge. | Resize or move the listed element; for text, trim, rebalance, or split. The message names each element, the edge, and the overflow in slide pixels. |
| `edge-crowding` (warning) | Unclipped content lies within the safe margin of the slide edge: 20px at a 720px-tall canvas (the theme's pagination inset), scaled with canvas height. Text is checked at the bottom, left, and right; media only at the bottom, since media boxes often include transparent side margins. The top edge, absolutely positioned content, header/footer, and footnote blocks (any class containing `footnote`) are exempt. | Leave breathing room: trim or rebalance so the last line or figure clears the margin, or move the element inward. It does not fail validation. |
| `text-overlap` (error) | Text whose glyphs intersect text from another block, or media from another block, by more than 2px on both axes. Each text line is measured on its glyph box: the line fragment narrowed to the actual ascent and descent of the characters on that line (canvas text metrics for the rendered font), so lines stacked with a tight line-height do not count unless the glyphs meet. Media are measured where they paint: `object-fit`/`object-position` letterboxing is removed and an inline SVG counts only its drawn shapes; media also allow 2% of their size. Lines of the same block (paragraph, list item, table cell, ruby group) are never compared. Not measured: `header`/`footer` bands and the pagination number, math (KaTeX, MathJax, MathML), text inside nested SVG, decorations marked `aria-hidden="true"`, and parts cropped by an `overflow` container. For text on media, these are intended overlays: a caption or overlay inside the same `figure`, media inline in the text's own block, text drawn on its own background box (callout, card, badge) that contains it, and absolutely positioned media. Absolutely positioned text, including footnote blocks, is still checked against the flow. One finding per slide names each colliding pair with the overlap depth (the smaller side of the intersection). | Separate the pair: trim or split the slide so the flow ends above the footnote block or figure, or move the positioned element. Do not shrink text or line spacing to make room, and do not mark real content `aria-hidden` to silence the finding. |
| `text-too-small` (error) | Visible text whose rendered font size, including scoped `<style>` overrides, transforms, and `zoom`, is below the readable floor. Body text needs 12px and secondary text 8px on the 1280×720 reference canvas. Secondary text is footnotes (any class containing `footnote`), citation markers and other `sup`/`sub`, KaTeX sub- and superscripts, ruby annotations, captions (`figcaption`, `caption`, any class containing `caption`), and `header`/`footer` (including a paper's header and footer bands). Other canvases scale both floors by `min(width / 1280, height / 720)`: a 16:9 slide by its height, an A4 portrait page (794×1123) by its width to 7.4px and 5px. Text inside nested SVG (Mermaid, fitted headings) and the pagination number are not measured. One finding per slide lists the smallest runs with their size. | Raise the text to the floor: remove the font-size override, transform, or tiny utility class. If the slide then overflows, split it or move detail to speaker notes; do not shrink other text or move body text into a footnote or caption block to reach the lower floor. |
| `missing-asset` (error) | Local media that the slide references do not load. The file check (`source: files`) resolves every Markdown image (including `![bg ...]` and size keywords such as `![w:300](...)`), the `src`/`poster`/`data` of `img`, `video`, `audio`, `source`, `object`, and `embed`, and CSS `url(...)` in `<style>`, `style` attributes, directive comments, and the front matter relative to the deck file, and reports each file that is not found or is a broken symlink (naming the link target). It runs even when rendering is skipped. The rendered check (`source: render`) adds an `img` that finished with `naturalWidth === 0` (failed to decode) and a `video`/`audio` with a media error or no usable source (failed to load), after waiting for image decode and video metadata. One finding per slide lists each reference once with its reason. Front-matter references are reported on the first slide; hidden slides, code, and speaker notes are ignored. | Restore the file or fix the path; for a broken cross-deck symlink, repoint it at the owner's file (see Shared Media in `AGENTS.md`). Replace an undecodable file with a valid export. |

Remote media (`http(s)://` and protocol-relative `//` URLs) are not checked: the file check never fetches them, and a remote image or video that fails in the render is ignored, so the result does not depend on the network. `data:` URLs are skipped too. Check remote media yourself if the deck relies on them.

The rendered check uses Marp's bare template, so every slide is laid out and measured. `text-overlap` covers text against text and media; it does not compare media with media or text with non-text boxes (borders, backgrounds), so inspect screenshots for those. The size floors mark text that cannot be read, not a recommended size: text above them can still be too small for the room, so judge the rendered slide.

## Source-heuristic hints

These count Markdown source, not the rendered result. They ignore theme font size, canvas size, and column layout, and they count a Japanese character the same as an ASCII character. After a successful render they are only hints; `overflow-risk` and `typography-drift` are dropped entirely because the rendered measurement (`content-clipped`, `text-too-small`) answers them directly.

| Rule | Current trigger |
|---|---|
| `long-heading` | Heading length > 48 |
| `dense-bullets` | ≥ 9 top-level bullets, including sums across columns |
| `figure-text-density` | A visual plus ≥ 6 top-level bullets or prose lines |
| `comparison-overpacked` | Table ≥ 5 columns × 3 data rows, or `.col` with ≥ 10 top-level bullets |
| `typography-drift` | Fallback only: `.text-xs2`, `.text-xs3`, `<small>`, or a matched tiny inline font-size. It cannot see `<style>` blocks. |
| `overflow-risk` | Fallback only: ≥ 12 bullets, ≥ 10 prose lines, ≥ 600 counted characters, heading ≥ 70, or a prose line ≥ 140 characters |

Do not alter formatting or move meaningful content into excluded blocks to silence a hint. When a hint points at a slide, judge the rendered slide; leave the content alone if it reads well.

## Paper and fallback coverage

The paper detector recognizes `a4-portrait` and `a4-landscape`. Paper decks skip the source hints; the rendered check still applies to the full page, with the text size floors scaled to the canvas as described above.

Without a browser, validation falls back to source heuristics as warnings and prints `Visual check: skipped (<reason>)`. The `missing-asset` file check still runs and still fails the run. A paper can then show `Findings: 0` without any layout measurement. Use `--strict` before claiming validation succeeded, and report unavailable checks instead of converting fallback into a success claim.

For paper clipping, rebalance columns or shorten a card while keeping one page. For a fixed slide count, preserve the user's constraint and discuss a concrete content tradeoff if it cannot be met readably.
