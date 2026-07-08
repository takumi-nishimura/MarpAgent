# MarpAgent — Quick Reference for AI Agents

Detailed authoring reference is in `.agents/skills/`:

| Skill | Content |
| :---- | :------ |
| `marp-slide-types` | title / content / two-column templates + variants |
| `marp-components` | callouts, figures, Mermaid, footnotes, CSS variables |
| `marp-paper` | A-series paper authoring (header/columns/footer) |
| `marp-validator` | validator rules, hard limits, remediation |
| `theme-new` | create or adapt a theme from a URL, brand guide, or DESIGN.md |
| `/slide-new <name>` | create a new deck end-to-end |
| `/slide-add <slide.md>` | add slides to an existing deck |
| `/slide-review <name>` | validate and remediate a deck |
| `/paper-new <name>` | create a new A-series paper deck end-to-end |

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

## Japanese Line Breaks

Japanese text is auto-wrapped at phrase boundaries by Google BudouX during
render. Do not hand-tune line breaks; wrap a run in `<span class="nobr">…</span>`
to keep it on one line. Applies to lab slide and paper layouts (see `marp-components`).

## Per-Slide Directives

| Directive | Purpose |
| :-------- | :------ |
| `<!-- _paginate: skip -->` | Hide page number (title/close slides) |
| `<!-- _class: title -->` | Apply title layout |
| `<!-- _header: <text> -->` | Set slide header text |

## Mermaid Sizing

Mermaid SVGs are laid out before slide CSS is applied. Scoped CSS that changes
`svg text { font-size: ... }` only changes visible text; node boxes do not
resize. Scale the rendered SVG/container instead, e.g.
`style="--mermaid-width: 115%; --mermaid-max-width: none; --mermaid-overflow: visible"`.

## Commands

| Command | Description |
| :------ | :---------- |
| `npm run marpx -- -n decks/<path>` | Scaffold a new deck |
| `npm run marpx -- -n decks/<path> --paper` | Scaffold a new A-series paper deck |
| `npm run marpx -- decks/<name>/brief.md --outline` | Generate outline from brief.md |
| `npm run marpx -- decks/<name>/slide.md -v` | Validate slide.md |
| `npm run marpx -- decks/<name>/slide.md -v --report-dir out/<name>` | Validate with report |
| `npm run marpx -- decks/<name>/slide.md` | Serve with live reload |
| `npm run marpx -- decks/<name>/slide.md --screenshot <page>` | Screenshot a slide to `/tmp` (headless) |
| `npm run marpx -- decks/<name>/slide.md -p` | Single-shot preview (opens browser) |
| `npm run marpx -- decks/<name>/slide.md --overview` | Thumbnail overview (opens browser) |
| `npm run marpx -- decks/<name>/slide.md --pdf` | Export to PDF |
| `npm run marpx -- --theme` | Build all themes |
| `npm run marpx -- --theme lab` | Build lab theme only |
| `npm run marpx -- --theme-new <name> --source-url <url>` | Scaffold a new theme |
| `npm run marpx -- --theme -w` | Watch-build themes |
