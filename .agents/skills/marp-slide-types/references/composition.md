# Composition recipes

Use these for information-rich explanation decks where readers need to compare,
interpret evidence, or understand a process. Keep the active theme. Composition
controls the relationship between content blocks; backgrounds and emphasis are
separate choices.

Read the relevant page in the canonical, renderable
[layout recipes](../../../../template/layouts.md), with adaptation notes in
[the template guide](../../../../template/README.md):

| Reader's task | Recipe page | What to preserve |
| :------------ | :---------- | :--------------- |
| Compare alternatives | 1 — Comparison table | The same criteria in each row, aligned quantities, units, conditions, and missing-data labels |
| Interpret a result or document | 2 — Main material and context | Enough width for evidence, a nearby interpretation, source and caveats |
| Follow work through stages | 3 — Process and outputs | Reading order and shared column boundaries for stage, action, and outcome |

Copy the page body, not its frontmatter. Keep the destination's theme and
header/pagination conventions. Replace the example facts with actual material;
do not force the example's row count, point count, or text lengths. For a figure,
put the existing `figure` component inside the wider column and retain its
source and readable labels.

## Adjust the structure

- A `grid grid-cols-12 gap-6 items-start` wrapper supports `col-span-8` with
  `col-span-4`, `col-span-7` with `col-span-5`, and other supported splits.
  Make room for what needs to be read; equal width is not a default obligation.
- Use `grid-cols-2` or `grid-cols-3` for genuine peers. A shared comparison
  table aligns criteria across alternatives better than separate lists.
- Use `flex`, `flex-col`, `flex-1`, and alignment utilities on plain wrappers
  for rows or stacks. Existing `.col` and `.box` have their own layout rules;
  choose one layout system per container.
- `gap-2`, `gap-4`, `gap-6`, and `gap-8` also have `gap-x-*` / `gap-y-*`
  forms. Prefer a consistent spacing choice to manually positioning each item.
- A layout utility does not add card styling. Keep grouping or emphasis only
  where it carries meaning, and keep substantive context at a readable size.

Only the utilities in the [theme contract](../../../../docs/theme-contract.md)
are compiled. An arbitrary Tailwind class copied from a web template will not
automatically work. Web breakpoints, hover interactions, and scroll containers
also need reconsideration for a fixed slide canvas and PDF output. Inspect the
render, including real Japanese text and figures, before reusing a new pattern.
