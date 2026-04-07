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

- Node.js >= 20
- `npx marpx` (bundled via `npm install`)

```bash
npm install
```

## Quick Start

```bash
# 1. Create a deck
npx marpx -n decks/my-talk

# 2. Fill in decks/my-talk/brief.md (8 sections)

# 3. Generate outline
npx marpx decks/my-talk/brief.md --outline

# 4. Author decks/my-talk/slide.md

# 5. Validate
npx marpx decks/my-talk/slide.md -v
```

## Commands

| Command | Description |
| :------ | :---------- |
| `npx marpx -n decks/<path>` | Scaffold a new deck |
| `npx marpx <brief.md> --outline` | Generate outline |
| `npx marpx <brief.md> --outline --output <outline.md>` | Generate outline to an explicit path |
| `npx marpx <slide.md>` | Serve with live reload |
| `npx marpx <slide.md> <page>` | Serve and open at displayed page |
| `npx marpx <slide.md> --screenshot <page>` | Screenshot a slide to `/tmp` |
| `npx marpx <slide.md> -p` | Single-shot preview |
| `npx marpx <slide.md> --overview` | Thumbnail overview |
| `npx marpx <slide.md> --pdf` | Export to PDF |
| `npx marpx <slide.md> -v` | Validate |
| `npx marpx <slide.md> -v --report-dir out/<name>` | Validate with report |
| `npx marpx --theme` | Build all themes |
| `npx marpx --theme lab` | Build a single theme |
| `npx marpx --theme -w` | Watch-build themes |
| `npm test` | Run unit tests |

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
├── themes/             # lab theme (Tailwind CSS v4)
├── src/                # CLI tools (outline generator, validator)
├── scripts/            # Test runner
└── .agents/skills/     # AI agent authoring skills
```

## Theme

The `lab` theme is built on Tailwind CSS v4 and provides:

- Five color schemes: Dracula, One Dark Pro, Nord, Neogaia, GitHub Light
- Slide layouts: title, content, two-column
- Callouts: `.note`, `.tip`, `.important`, `.warning`, `.caution`
- Typography scale: `.text-xs` through `.text-xl5`
- Laser pointer effect during presentation
- Mermaid diagram support with MathJax

```bash
npx marpx --theme lab   # build theme
npx marpx --theme -w    # watch mode
```

## AI Agent Usage (Claude Code)

Skills in `.agents/skills/` provide authoring guidance to AI coding agents:

| Skill | Type | Description |
| :---- | :--- | :---------- |
| `marp-slide-types` | reference (auto) | Slide type templates |
| `marp-components` | reference (auto) | Callouts, figures, Mermaid, footnotes |
| `marp-validator` | reference (auto) | Validator rules and hard limits |
| `/slide-new <name>` | task | Create a new deck end-to-end |
| `/slide-add <slide.md>` | task | Add slides to an existing deck |
| `/slide-review <name>` | task | Validate and remediate a deck |

See `AGENTS.md` for a quick command and directive reference.
