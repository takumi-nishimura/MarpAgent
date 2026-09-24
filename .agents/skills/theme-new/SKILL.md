---
name: theme-new
description: Create or adapt a reusable MarpAgent theme from a visual reference, brand guide, or DESIGN.md, preserving shared slide and paper components.
---

# New theme

Inspect the supplied reference: browse a provided URL or read the brand guide/DESIGN.md, then identify the colors, typography, spacing, shapes, and visual tone needed for this theme. Distinguish observed choices from adaptations; do not copy long source prose or silently redesign an unrelated deck.

Inspect existing target files before scaffolding. Use `--force` only for an intended, reviewed overwrite that preserves unrelated work.

```sh
npm run marpx -- --theme-new <name> --no-build
```

Add `--source-url <url>` when a URL is the reference; it records provenance and does not extract the design for you. The scaffold creates `designs/<name>/DESIGN.md`, `themes/src/<name>.css`, and `fixtures/<name>-slide.md`.

Make `DESIGN.md` the source of literal brand values. Preserve its required frontmatter, structure, and shared-component compatibility tokens; replace scaffold rationale with source-specific decisions. The CSS entry imports `./_generated/<name>-design-tokens.css` and maps tokens to behavior, reusing `themes/src/_shared/` before introducing local components. Do not duplicate brand colors, typography, spacing, or radii in CSS or generated files.

Build and verify the result:

```sh
npm run marpx -- --theme <name>
npm run design:lint
npm run design:tokens:check
npm run marpx -- fixtures/<name>-slide.md -v --strict
```

Inspect the rendered fixture and any relevant paper layout, plus the generated token CSS and compiled theme. Keep smoke content focused on stable theme primitives. If shared CSS/runtime behavior changes, run the affected unit tests and `validate:fixtures`/Playwright checks; a theme-token edit does not require unrelated test cycles after its relevant checks pass. Report pre-existing failures separately from regressions.

Preserve default theme selection and deck templates unless their change is requested. Use supported canvas sizes and shared paper components rather than inventing a separate poster theme. Do not use deck-local CSS or unreadably small type to make the fixture pass. Deliver the design source, CSS, generated artifacts, fixture, and actual validation status.
