---
name: theme-new
description: Create or adapt a MarpAgent theme from a URL, brand guide, existing DESIGN.md, or visual brief. Use when adding a design token source, theme CSS entry, and smoke fixture for a new MarpAgent visual identity.
---

# Theme New

## Overview

Create a new MarpAgent visual design while keeping `DESIGN.md` as the token
source of truth. The generated theme should reuse shared slide and A-series
paper components, with theme-specific choices expressed through design tokens.

## Workflow

1. Inspect the source material.
   - If the user provides a URL, browse it first and extract the visual system:
     colors, typography, spacing, shape, component tone, and examples.
   - If the source is another `DESIGN.md`, treat that document as the design
     reference, but adapt it to MarpAgent's required token schema.
   - Summarize and adapt the design; do not copy long source prose into the repo.

2. Scaffold the theme.

   ```bash
   npm run marpx -- --theme-new <name> --source-url <url> --no-build
   ```

   Use `--no-build` while source tokens are still being edited. Omit it only
   when the scaffold is already final enough to compile. Use `--force` only
   after checking the existing files and confirming overwrite is intended.

3. Edit `designs/<name>/DESIGN.md`.
   - Keep Google design.md frontmatter and section structure intact.
   - Keep all compatibility tokens required by shared CSS unless the shared
     theme contract is being changed in the same work.
   - Replace scaffold notes and `lab`-derived rationale with source-specific
     rationale.
   - Make `DESIGN.md` the only source of literal theme values such as colors,
     typography sizes, spacing, and radii.

4. Edit `themes/src/<name>.css` only for mapping and component behavior.
   - Import `./_generated/<name>-design-tokens.css`.
   - Do not add literal colors, `rgba(...)`, or hard-coded brand values.
   - Prefer shared imports from `themes/src/_shared/` before adding new CSS.
   - Keep slide sizes as canvas families: `16:9`, `4:3`, `a4-portrait`,
     `a4-landscape`, and custom pixel sizes handled by the existing runtime.

5. Validate the theme.

   ```bash
   npm run marpx -- --theme <name>
   npm run design:lint
   npm run design:tokens:check
   npm test
   npm run marpx -- fixtures/<name>-slide.md -v
   ```

   If the theme changes shared behavior, also run:

   ```bash
   npm run validate:fixtures
   npx playwright test
   ```

6. Review generated artifacts.
   - Ensure `themes/src/_generated/<name>-design-tokens.css` is updated.
   - Ensure `themes/<name>.css` is updated when the theme is compiled.
   - Keep the smoke fixture focused on stable theme primitives, not deck-specific
     content.

## Boundaries

- Do not modify deck templates or existing default theme selection unless the
  user explicitly asks.
- Do not introduce a separate poster theme; use A-series canvas sizes and paper
  layout components.
- Do not use deck-local CSS as a substitute for reusable theme components.
- Do not shrink content with `.text-xs2`, `.text-xs3`, `<small>`, or tiny inline
  font sizes to make a fixture pass validation.
