# Placement utilities

Use existing theme primitives before considering scoped layout CSS. Preserve readable type; `.fit` is not permission to shrink body text until a validator passes.

## Layout Primitives

| Class / Element | Purpose |
| :-------------- | :------ |
| `.col` | Flex row container for two or more columns |
| `.centered` | Centers content vertically and horizontally |
| `.fit` | Center a content-width inline block, capped at the available width; does not scale text |
| `style="flex: N"` | Override column width ratio inside `.col` |
| `.col.with-summary` | Column layout whose per-column `.gap-box` sits at the bottom |
| `.box` | Flex container for placing content outside `.col` |
| `.fill` | Body-level layout fills remaining height above the footer safe area |
| `.body` | Opt-in remaining-area wrapper with caption-aware figures; direct child of a regular slide |
| `.figure-natural` | Keep authored inline media dimensions inside a new body |
| `.place-top` / `.place-middle` / `.place-bottom` / `.place-spread` | Vertical placement inside `.col > div` or `.box` |
| `.place-left` / `.place-center` / `.place-right` | Horizontal placement inside `.col > div` or `.box` |
| `.self-start` / `.self-center` / `.self-end` | Place a fit-to-content component itself |
| `.col.visual` | Figure/text variant of the `.col`-based template |
| `.metric-grid` | Compact numeric or KPI cards |
| `.timeline` | Horizontal process or step sequence with directional arrows; `ol` adds simple numeric markers |

For remaining-area media, add `.body` to the direct wrapper and use `.fill`
only for nested growing areas. `.body.col` stretches its column boxes, so
`.place-top/middle/bottom` align their content within the same height. Use
`.place-left/center/right` for the other axis. These controls do not change
column ratios: use the existing `--visual-left/right` on `.col.visual`, or
`style="flex: N"` on individual columns. `--col-gap` (or `--visual-gap` on
`.col.visual`) controls the space between columns; `--body-gap` controls
the space between a column's content blocks.

A fitting figure fills its media area; place a `.figure-natural` group when
its authored dimensions must remain fixed and the whole group must sit at
the top, middle, or bottom. A nested `.box.fill` establishes remaining height
below a column heading. Avoid `h-full` alongside a heading or caption because
it uses the entire parent height before accounting for those siblings.
Existing `.fill`-only layouts keep their old behavior. See
`docs/theme-contract.md` for the body variables and migration contract.
