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

## Per-Slide Directives

| Directive | Purpose |
| :-------- | :------ |
| `<!-- _paginate: skip -->` | Hide page number (title/close slides) |
| `<!-- _class: title -->` | Apply title layout |
| `<!-- _header: <text> -->` | Set slide header text |

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

- The `obsidian:obsidian-cli` plugin is globally enabled. Use `obsidian search "<query>"` to find relevant notes, `obsidian read "<path>"` to read them.
- Alternatively: `rg -l "<keyword>" /Users/hapticslab/Documents/nishi/lab/notes/ --include="*.md"`
- When writing `brief.md`, populate the `## References` section with vault note paths (e.g., `10_Literature/@SmithFuzzyControl2024.md`) so the link between deck and source material is explicit.
- Literature notes' `description` field gives a quick 1-line summary for scanning relevance.

## Commands

| Command | Description |
| :------ | :---------- |
| `npx marpx -n decks/<path>` | Scaffold a new deck |
| `npx marpx -n decks/<path> --poster` | Scaffold a new A0 poster deck |
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
