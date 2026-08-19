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
| `.place-top` / `.place-middle` / `.place-bottom` / `.place-spread` | Vertical placement inside `.col > div` or `.box` |
| `.place-left` / `.place-center` / `.place-right` | Horizontal placement inside `.col > div` or `.box` |
| `.self-start` / `.self-center` / `.self-end` | Place a fit-to-content component itself |
| `.col.visual` | Figure/text variant of the `.col`-based template |
| `.metric-grid` | Compact numeric or KPI cards |
| `.timeline` | Horizontal process or step sequence with directional arrows; `ol` adds simple numeric markers |
