# MarpAgent — Quick Reference for AI Agents

Detailed authoring reference is in `.agents/skills/`:

| Skill | Content |
| :---- | :------ |
| `marp-slide-types` | title / content / two-column templates + variants |
| `marp-components` | callouts, figures, Mermaid, footnotes, CSS variables |
| `marp-poster` | A0 poster authoring (poster theme, header/columns/footer) |
| `marp-validator` | validator rules, hard limits, remediation |
| `/slide-new <name>` | create a new deck end-to-end |
| `/slide-add <slide.md>` | add slides to an existing deck |
| `/slide-review <name>` | validate and remediate a deck |
| `/poster-new <name>` | create a new A0 poster end-to-end |

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
to keep it on one line. Applies to lab and poster themes (see `marp-components`).

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
| `npm run marpx -- -n decks/<path> --poster` | Scaffold a new A0 poster deck |
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
| `npm run marpx -- --theme -w` | Watch-build themes |

## Research Vault (External Repository)

The Obsidian research vault at `/Users/hapticslab/Documents/nishi/lab/notes/` contains literature notes, research memos, synthesis pages, and project notes. Use it when authoring decks to ground slides in existing research.

### Key directories

| Folder | Content |
| :----- | :------ |
| `10_Literature/` | Literature notes (`@AuthorShortTitle2024.md`). Each has `description` (1-line Japanese summary) and sections: 概要, 手法, 主要な知見 |
| `15_Synthesis/` | Cross-cutting theme pages synthesizing knowledge across the vault |
| `20_Research/` | Personal research thoughts and design memos |
| `30_Projects/` | Project-scoped notes (`{YYYY}_{MM}_{PascalCaseName}/`) |
| `50_Profile/` | CV, skills, publications, activities |

### How to use

- Treat the vault as a Markdown file tree first. Use `rg` / `rg --files` to find relevant notes:
  - `rg -n "<keyword>" /Users/hapticslab/Documents/nishi/lab/notes --glob "*.md"`
  - `rg --files /Users/hapticslab/Documents/nishi/lab/notes | rg "<topic|project|citekey>"`
- Use `fzf` only for interactive local exploration, not as a required agent workflow.
- When writing `brief.md`, populate the `## References` section with vault note paths (e.g., `10_Literature/@SmithFuzzyControl2024.md`) so the link between deck and source material is explicit.
- Literature notes' `description` field gives a quick 1-line summary for scanning relevance.
- For project-scoped research, start from `30_Projects/<project>/` and any project index note before following older cross-links.
