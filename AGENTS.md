# MarpAgent — Quick Reference for AI Agents

Detailed authoring reference is in `.agents/skills/`:

| Skill | Content |
| :---- | :------ |
| `marp-slide-types` | title / content / two-column templates + variants |
| `marp-components` | callouts, figures, Mermaid, footnotes, CSS variables |
| `marp-paper` | A-series paper authoring (header/columns/footer) |
| `marp-validator` | validator rules, hard limits, remediation |
| `theme-new` | create or adapt a theme from a URL, brand guide, or DESIGN.md |
| `/slide-author <name-or-slide.md>` | create, revise, restructure, or add pages to a deck |
| `/slide-review <name-or-slide.md>` | inspect content and renders; edit only when fixes are requested |
| `/paper-new <name>` | create a new A-series paper deck end-to-end |

## File Structure

```
decks/<name>/
├── brief.md        # Purpose, audience, constraints, sources
├── slide.md        # Working draft and finished slides (Marp Markdown)
├── assets/img/     # Deck-local images
├── assets/video/   # Deck-local videos
└── shared -> ../../assets  # Shared assets (logos, fonts, etc.)
```

## Authoring Workflow

Use `slide-author` for new and existing slide decks, including page additions.
It includes rendering, self-checking, and correction. Use `slide-review` for
findings without edits; requested fixes follow `slide-author` in the same task.
The former `slide-new`, `slide-edit`, and `slide-add` skills are replaced by
`slide-author`; see README's AI Agent Usage for migration examples.

Keep purpose, audience, constraints, and sources in a short `brief.md`. Draft the
sequence directly in `slide.md`, try important or uncertain slides with actual
assets early, then develop and revise that same file while inspecting renders.
Use `--overview` to review the sequence. Update the brief when requirements
change; page edits and reordering do not need a separate plan to synchronize.

Choose the visual structure from the point and supporting material. Do not
fill every slide with the same number of bullets, cards, or summary boxes, or
force layout variety. Follow the user's references and preserve evidence,
qualifications, and intentional human edits.

New regular slides use one direct `.body` wrapper below the heading, as shown in
`template/layouts.md`. Choose the material's width and top/middle placement from
its reading task; short prose, a comparison, and a figure with interpretation
need different compositions. Keep explanations and tables near the heading by
default; short content alone is not a reason for middle placement. Inspect the
heading/body gap, unused space, hierarchy, and material size as well as clipping.
Preserve deliberate legacy layouts.

Do not create or synchronize `outline.md` by default. If a legacy outline has
unique requirements, read them before editing; preserve the file unless its
removal is requested. Honor an explicitly requested outline deliverable. The
deprecated `--outline` command remains available for legacy eight-section briefs.

## Shared Media

- Keep one-off media in the deck-local `assets/` directory.
- When another deck reuses that media, keep the original deck as the owner and add a named relative symlink for each reused file, such as `assets/img/from-source-example.png`, in the consuming deck.
- Reference cross-deck media through that file symlink, not through a raw `../other-deck/` path or a symlink to the owner's complete `assets/` directory.
- Keep symlink targets inside the repository. Before changing or deleting owned media, search for consuming symlinks and references.
- Promote media to the repository-level `assets/` directory only when no single deck is the clear owner or the media is a stable repository-wide resource.
- On Windows, verify that Git checked out links as symlinks before editing or committing reused media.

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
| `<!-- _scroll: true -->` | Scroll this slide's body vertically in HTML presentation; keep header, first heading, footer, and pagination fixed, and synchronize with its presenter window |
| `<!-- hide: true -->` or `<!-- _hide: true -->` | Omit only this slide from the rendered deck; later slides keep their inherited directives, and page numbers count only visible slides |

Use `_scroll` for an intentionally long appendix/table, not as a default layout.
Static exports show the initial viewport; validation reports
`scroll-export-overflow` and checks the full scrollable body for other defects.

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
| `npm run marpx -- decks/<name>/slide.md -v` | Validate slide.md (`--lint` is a deprecated alias) |
| `npm run marpx -- decks/<name>/slide.md -v --autofix` | Apply safe autofixes, then validate |
| `npm run marpx -- decks/<name>/slide.md -v --autofix --dry-run` | Show the autofix diff without writing |
| `npm run marpx -- decks/<name>/slide.md -v --report-dir out/<name>` | Validate with report |
| `npm run marpx -- decks/<name>/slide.md` | Serve with live reload |
| `npm run marpx -- decks/<name>/slide.md --screenshot <page>` | Screenshot the slide showing displayed page `<page>` to `/tmp` (headless) |
| `npm run marpx -- decks/<name>/slide.md -p` | Single-shot preview (opens browser) |
| `npm run marpx -- decks/<name>/slide.md --overview` | Thumbnail overview (opens browser) |
| `npm run marpx -- decks/<name>/slide.md --pdf` | Export to PDF |
| `npm run marpx -- decks/<name>/slide.md --pptx` | Export to PPTX |
| `npm run marpx -- decks/<name>/slide.md --html` | Export to standalone HTML (open from the deck dir so `assets/`/`shared/` resolve) |
| `npm run marpx -- decks/<name>/slide.md --images [png\|jpeg]` | Export each slide as an image (default: png) |
| `npm run marpx -- decks/<name>/slide.md --pdf --output <path>` | Export to a chosen path (also `--pptx`, `--html`, `--images`, `--screenshot`) |
| `npm run marpx -- --theme` | Build all themes |
| `npm run marpx -- --theme lab` | Build lab theme only |
| `npm run marpx -- --theme-new <name> --source-url <url>` | Scaffold a new theme |
| `npm run marpx -- --theme -w` | Watch-build themes |

## Records

`docs/records/README.md` is the canonical spec for issue (ISS), decision (ADR), and exploration (XR) records.

- Create deferred work with `uv run .github/records.py new issue "<title>"`; it writes `docs/issues/ISS-NNNN-<slug>.md`. Never hand-assign IDs.
- Close an issue in place: set `status: closed`, `resolution` (`completed|abandoned|duplicate|superseded`), and `resolved`. Do not move or delete issue files.
- Record adoption decisions as ADRs (`new adr`) and trials or benchmarks as XRs (`new xr`). Reference issues from ADR/XR `issues:`, not the reverse.
- Reference records from commits with `Fixes ISS-NNNN` or `Refs ISS-NNNN`.
- Run `uv run .github/records.py validate` after changing any record or the record tooling.
