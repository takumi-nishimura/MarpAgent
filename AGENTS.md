# MarpAgent — Quick Reference for AI Agents

Detailed authoring reference is in `.agents/skills/`:

| Skill | Content |
| :---- | :------ |
| `marp-slide-types` | title / content / two-column templates + variants |
| `marp-components` | callouts, figures, Mermaid, footnotes, CSS variables |
| `marp-validator` | validator rules, hard limits, remediation |
| `/slide-new <name>` | create a new deck end-to-end |
| `/slide-add <slide.md>` | add slides to an existing deck |
| `/slide-review <name>` | validate and remediate a deck |

## File Structure

```
decks/<name>/
├── brief.md        # Presentation design doc (8 sections)
├── outline.md      # Auto-generated slide outline
├── slide.md        # Slide content (Marp Markdown)
├── assets/img/     # Deck-local images
├── assets/video/   # Deck-local videos
└── shared -> ../../assets  # Shared assets (logos, fonts, etc.)
```

## Frontmatter

```yaml
---
marp: true
theme: lab
class: normal
paginate: true
transition: slide
style: |
    section {
      --logos-dark: url(shared/logos/<logo>.svg);
    }
---
```

## Per-Slide Directives

| Directive | Purpose |
| :-------- | :------ |
| `<!-- _paginate: skip -->` | Hide page number (title/close slides) |
| `<!-- _class: title -->` | Apply title layout |
| `<!-- _header: <text> -->` | Set slide header text |

## Commands

| Command | Description |
| :------ | :---------- |
| `npx marpx -n decks/<path>` | Scaffold a new deck |
| `npx marpx decks/<name>/brief.md --outline` | Generate outline from brief.md |
| `npx marpx decks/<name>/slide.md -v` | Validate slide.md |
| `npx marpx decks/<name>/slide.md -v --report-dir out/<name>` | Validate with report |
| `npx marpx decks/<name>/slide.md` | Serve with live reload |
| `npx marpx decks/<name>/slide.md --screenshot <page>` | Screenshot a slide to `/tmp` (headless) |
| `npx marpx decks/<name>/slide.md -p` | Single-shot preview (opens browser) |
| `npx marpx decks/<name>/slide.md --overview` | Thumbnail overview (opens browser) |
| `npx marpx decks/<name>/slide.md --pdf` | Export to PDF |
| `npx marpx --theme` | Build all themes |
| `npx marpx --theme lab` | Build lab theme only |
| `npx marpx --theme -w` | Watch-build themes |
