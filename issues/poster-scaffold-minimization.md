---
title: "--poster scaffold: drop authoring HTML comments and conditional highlight placeholder"
status: open
created: 2026-06-21
updated: 2026-06-21
labels: [refactor, dx]
---

## Problem

`npx marpx -n <dir> --poster` scaffolds `poster.md` with two artifacts that mislead authors:

1. **Authoring-instruction HTML comments inside the slide body.** These are meta-guidance for the author, not poster content. They survive into the rendered poster unless explicitly stripped, and at least one empirical executor flagged this as an unclear point ("does 'replace placeholder' apply to the meta-comment?"). The skill now tells authors to delete them; the cleaner fix is for the scaffold to not emit them in the first place — put the guidance in a sibling `README.md` or in `poster-new/SKILL.md` instead.
2. **Mandatory highlight/stat placeholder.** The scaffold ships with a `<section class="poster-section highlight">` + `<div class="poster-stat">` card, regardless of whether the work has a single headline number. For qualitative contributions (protocols, frameworks, taxonomies), this card has no natural content and authors either fabricate a number or struggle to delete a structural-looking card without breaking the layout.

The skill currently patches both by telling authors to delete the comments and to use `highlight` only when applicable. Either or both could be fixed by the scaffold.

## Goal

The scaffolded `poster.md` is closer to the minimum viable poster: required structure only. Authoring guidance lives outside the rendered content. The highlight card is opt-in, not opt-out.

## Acceptance criteria

- [ ] Scaffolded `poster.md` contains no `<!-- author guidance -->`-style HTML comments inside the slide body. (Comment-style frontmatter directives like `<!-- _paginate: skip -->` are fine — these are Marp directives, not author guidance.)
- [ ] Authoring guidance previously embedded in the scaffold body moves to a sibling `decks/<name>/README.md` *or* is dropped in favor of the `marp-poster` skill content.
- [ ] Scaffolded `poster.md` does NOT include a `poster-section highlight` / `poster-stat` block by default. A separate `--poster --with-highlight` flag (or similar) opts in, OR the skill instructs authors to add it when applicable.
- [ ] Existing tests still pass; new tests cover the slimmer scaffold output.

## Out of scope

- Slide-deck scaffolding (`npx marpx -n` without `--poster`). Same critique might apply but is a separate issue.
- Theme-level changes.

## Files

- `bin/marpx.js` or whichever module implements `-n --poster` (locate via `rg -l "poster" bin/ src/`)
- Scaffold template files (likely under `templates/` or inlined)
- Tests for scaffold output

## Notes

Surfaced by empirical-prompt-tuning of `.agents/skills/poster-new` on 2026-06-21. After this landed: `poster-new/SKILL.md` step 3 dropped the "Delete scaffold authoring-instruction HTML comments" bullet (the scaffold no longer emits them) and inverted the highlight guidance from "use it when applicable" to "add it when applicable — the scaffold does NOT include one by default." A sibling `README.md` is now scaffolded with the authoring notes that used to live as HTML comments inside `poster.md`.
