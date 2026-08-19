# MarpAgent

Structured slide authoring with Marp + automated validation. Write a brief, generate an outline, author slides in Markdown, and catch overflow before it reaches the audience.

## Overview

```
brief.md → outline.md → slide.md → HTML / PDF / PPTX
```

- **brief.md** — define audience, duration, core message, and required sections
- **outline.md** — auto-generated slide plan with layout hints
- **slide.md** — Marp Markdown using the `lab` theme
- **Validator** — catches overflow, dense bullets, long headings, and font shrinking

## Prerequisites

- mise with shell activation enabled
  (`eval "$(mise activate zsh)"` in your zsh startup file)
- `.mise.toml` pins `node = "25.6.0"` and adds this repository root to `PATH`,
  so `marpx decks/...` works without `./`
- Use `./marpx ...` as the fallback when the current shell has not loaded mise
- Use `npm run marpx --` for automation and CI
- Avoid `npx marpx` in this checkout because the package's own bin is not
  linked into `node_modules/.bin`

```bash
npm install
```

## Quick Start

```bash
# 1. Create a deck
marpx -n decks/my-talk

# 2. Fill in decks/my-talk/brief.md (8 sections)

# 3. Generate outline
marpx decks/my-talk/brief.md --outline

# 4. Author decks/my-talk/slide.md

# 5. Live preview while editing
marpx decks/my-talk/slide.md

# 6. Validate
marpx decks/my-talk/slide.md -v

# 7. Single-shot preview (optional)
marpx decks/my-talk/slide.md -p

# 8. Open thumbnail overview (optional)
marpx decks/my-talk/slide.md --overview
```

## Commands

| Command | Description |
| :------ | :---------- |
| `marpx -n decks/<path>` | Scaffold a new deck |
| `marpx -n decks/<path> --paper` | Scaffold a new A-series paper deck |
| `marpx <brief.md> --outline` | Generate outline |
| `marpx <brief.md> --outline --output <outline.md>` | Generate outline to an explicit path |
| `marpx <slide.md>` | Serve with live reload |
| `marpx <slide.md> <page>` | Serve and open at displayed page |
| `marpx <slide.md> --screenshot <page>` | Screenshot a slide to `/tmp` |
| `marpx <slide.md> -p` | Single-shot preview |
| `marpx <slide.md> --overview` | Thumbnail overview |
| `marpx <slide.md> --pdf` | Export to PDF |
| `marpx <slide.md> --lint` | Lint with deck validator rules |
| `marpx <slide.md> --lint --autofix` | Apply safe autofixes, then lint again |
| `marpx <slide.md> -v` | Validate |
| `marpx <slide.md> -v --strict` | Validate and fail if visual check falls back |
| `marpx <slide.md> -v --format sarif` | Emit SARIF JSON for code-scanning pipelines |
| `marpx <slide.md> -v --report-dir out/<name>` | Validate with report |
| `marpx --doctor` | Run environment diagnostics |
| `marpx --theme` | Build all themes |
| `marpx --theme lab` | Build a single theme |
| `marpx --theme-new <name> --source-url <url>` | Scaffold a new theme |
| `marpx --theme -w` | Watch-build themes |
| `npm test` | Run unit tests |
| `npm run quality:gate` | Run unit tests + fixture validation gate |
| `npm run quality:gate:strict` | Enforce visual checks + strict e2e policy |
| `npm run test:e2e` | Run Playwright CLI smoke tests |

For interactive authoring, use `marpx ...`. `.mise.toml` adds the repository
root to `PATH` when mise is active, and the repo-local wrapper runs the npm
script through `mise exec`, so it keeps the Node.js 25 runtime pinned by this
project while still letting the shell complete paths such as
`decks/example/slide.md`. If the current shell has not loaded mise yet, use
`./marpx ...` from the repository root.

## File Structure

```
MarpAgent/
├── decks/              # Your slide decks
│   └── <name>/
│       ├── brief.md
│       ├── outline.md
│       ├── slide.md
│       ├── assets/
│       └── shared -> ../../assets
├── assets/             # Shared assets (logos, fonts)
├── themes/             # Marp entries and surfaces built with Tailwind CSS v4
├── src/                # CLI tools (outline generator, validator)
├── scripts/            # Test runner
└── .agents/skills/     # AI agent authoring skills
```

### Media ownership and reuse

Keep presentation-specific images and videos under the deck that owns them. When another deck reuses a file, add a named relative symlink for that file in the corresponding local media directory instead of copying it, linking the owner's complete `assets/` directory, or using a raw `../other-deck/` path. For example, from the repository root:

```bash
mkdir -p decks/consumer-deck/assets/img
ln -s ../../../source-deck/assets/img/example.png \
  decks/consumer-deck/assets/img/from-source-example.png
```

The consuming deck can then use a stable path such as `assets/img/from-source-example.png`. Add another symlink only when it reuses another file. Before renaming or deleting owned media, search the repository for symlinks and Markdown references that consume it.

Use the repository-level `assets/` directory only for stable resources with no single owning deck, such as shared logos and fonts. On Windows, enable symlink support before checkout and verify that Git did not materialize a link as an ordinary file or copied directory.

## Theme

MarpAgent themes are built on Tailwind CSS v4 from design-level `DESIGN.md`
token sources. Available themes:

- `lab` — default research presentation design
- `muji` — quiet, minimal MUJI-inspired design

Common capabilities:

- Five color schemes: Dracula, One Dark Pro, Nord, Neogaia, GitHub Light
- Slide layouts: title, content, multi-column, visual col,
  metric grid, timeline, placement utilities
- Callouts: `.note`, `.tip`, `.important`, `.warning`, `.caution`
- Typography scale: `.text-xs` through `.text-xl5`
- Laser pointer effect during presentation
- Mermaid diagram support with MathJax

See `designs/README.md` for the design index, `designs/<name>/DESIGN.md` for
each visual identity, and `docs/theme-contract.md` for the engineering contract
shared by CSS, templates, skills, Tailwind, and the validator.

`designs/<name>/DESIGN.md` is the source of truth for each design's tokens.
`marpx --theme` regenerates the matching
`themes/src/_generated/<name>-design-tokens.css` files before compiling the
tracked theme CSS files.

To create another visual identity, start from the scaffold command and then
edit the generated `DESIGN.md` as the token source of truth:

```bash
marpx --theme-new <name> --source-url <url> --no-build
```

The scaffold creates `designs/<name>/DESIGN.md`, `themes/src/<name>.css`, and
`fixtures/<name>-slide.md`. The `theme-new` agent skill describes the full
extract-adapt-validate workflow for URL, brand-guide, and existing DESIGN.md
sources.

Use `theme: lab` or `theme: muji` for slide decks and A-series paper layouts.
Canvas size is an explicit frontmatter concern: `16:9`, `4:3`, `a4-portrait`,
`a4-landscape`, or a custom pixel size such as `400x200`. Paper layout is
selected by the `.paper-header` / `.paper-columns` structure, not by a separate
theme or slide class.

### Mermaid sizing

Mermaid diagrams are rendered to SVG before the slide is styled. Changing
`svg text { font-size: ... }` with scoped CSS changes the visible text only;
it does not rerun Mermaid layout, so node boxes and edge routes keep their
original dimensions.

To make a Mermaid diagram larger, scale the rendered SVG/container instead:

````markdown
<div style="width: 90%; --mermaid-width: 115%; --mermaid-max-width: none; --mermaid-overflow: visible">

```mermaid
flowchart TD
  A[リアルタイム協調エージェント]
  B[人間基準での較正]
  C[未知ユーザーへの適応]
  A --> B --> C
```

</div>
````

Use `--mermaid-width`, `--mermaid-max-width`, `--mermaid-max-height`, and
`--mermaid-overflow` on a wrapper when the default diagram size does not fit.
Do not rely on post-render text font-size changes for node sizing.

For node label line breaks, use `<br/>` or `\n` inside a quoted Mermaid label.
Explicit line breaks are measured before layout, so the node box height grows
with the line count and the width follows the longest visual line:

````markdown
```mermaid
flowchart TD
  A["Long first line<br/>Short second line"] --> B[Output]
```
````

### Title logo sizing

Title slides default to height-based logo sizing so wide wordmarks remain
legible. Override `--logo-title-background-size` in deck frontmatter only when
you need a different title logo height:

```yaml
style: |
  section {
    --logos-dark: url(shared/logos/haptics_lab/logo_gray.svg);
    --logo-title-background-size: auto 50px;
  }
```

```bash
marpx --theme lab   # build theme
marpx --theme -w    # watch mode
```

## A-Series Paper Layouts

For dense one-page research outputs, `theme: lab` can render a single A-series
paper canvas instead of a slide sequence.

```bash
# Scaffold a paper deck (A4 portrait)
marpx -n decks/my-paper --paper

# Edit decks/my-paper/paper.md, then preview / validate / export
marpx decks/my-paper/paper.md        # live preview
marpx decks/my-paper/paper.md -v     # validate
marpx decks/my-paper/paper.md --pdf  # export PDF for printing
```

- **Portrait:** `size: a4-portrait` in the front matter
- **Landscape:** `size: a4-landscape`
- **Columns:** controlled by the number of `<div class="paper-col">` blocks
  (three for portrait, four for landscape)
- **Cards:** `<section class="paper-section">` with an `## h2` title bar; add
  `highlight` for a key-result card
- Callouts, figures, tables, code, and Mermaid all work inside cards

Export at A4 and scale at print time when a larger physical sheet is needed.
The validator skips the per-slide density heuristics for A-series paper outputs
(a dense full page is expected) but still flags visual overflow. See
`decks/example-paper/paper.md` for a worked example and the `marp-paper` skill
for authoring details.

## AI Agent Usage (Claude Code)

Skills in `.agents/skills/` provide authoring guidance to AI coding agents:

| Skill | Type | Description |
| :---- | :--- | :---------- |
| `marp-slide-types` | reference (auto) | Slide type templates |
| `marp-components` | reference (auto) | Callouts, figures, Mermaid, footnotes |
| `marp-paper` | reference (auto) | A-series paper authoring |
| `marp-validator` | reference (auto) | Validator rules and hard limits |
| `theme-new` | task | Create or adapt a theme from a URL, brand guide, or DESIGN.md |
| `/slide-new <name>` | task | Create a new deck end-to-end |
| `/slide-add <slide.md>` | task | Add slides to an existing deck |
| `/slide-review <name>` | task | Validate and remediate a deck |
| `/paper-new <name>` | task | Create a new A-series paper deck end-to-end |

See `AGENTS.md` for a quick command and directive reference.
