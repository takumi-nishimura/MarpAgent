---
name: paper-new
description: Create a single-page MarpAgent research handout or poster using the A4 portrait or landscape paper canvas.
disable-model-invocation: true
argument-hint: <deck-name>
---

# New paper canvas

Create the requested one-page research output under `decks/<name>/`. Read [marp-paper](../marp-paper/SKILL.md) for its structure. Use the supplied orientation, sections, sources, and output format. If unspecified, start with A4 portrait and an appropriate section plan, stating consequential assumptions. Pause for a design review only when requested or when a missing requirement materially changes the result.

Inspect the destination first: the scaffolder overwrites existing files. Use a new destination or preserve existing work.

```sh
npm run marpx -- -n decks/<name> --paper
```

The scaffold creates `paper.md`, an informational `README.md`, assets, and a shared-assets link. It has no brief/outline pipeline. Replace placeholder authors, text, contacts, and assets with verified content; omit unknown optional details rather than inventing them. Do not delete a README merely because the template once generated it.

Keep one canvas with header, paper columns, and footer, with no body-level slide separators. Use result emphasis only when supported: a headline metric belongs inside its Results card; a qualitative contribution needs no invented number. Preserve source attribution and readable figures.

Validate using [marp-validator](../marp-validator/SKILL.md) and inspect the entire rendered page, including captions and footer. Rebalance columns or shorten cards when necessary; do not convert the paper into a slide sequence or shrink text below readability to pass. A paper's zero heuristic findings do not demonstrate a successful visual check.

Deliver the completed page and the requested output formats, including PDF when requested for printing. State its actual page size and any enlargement instructions. Report remaining findings or unavailable checks instead of presenting an unverified render as print-ready.
