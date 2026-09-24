---
id: ISS-0016
title: Cache Mermaid SVG renders across Marp renders
type: issue
status: open
date: '2026-09-23'
updated: '2026-09-23'
authors:
- claude-code
scope:
- scripts/mermaid-plugin.js
tags:
- feature
- perf
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Cache Mermaid SVG renders across Marp renders

## Problem

`scripts/mermaid-plugin.js:9-16` spawns a new Node process running `src/mermaid-render.js` synchronously for each ```` ```mermaid ```` fence on every render. A three-node diagram takes about 0.5 s (measured 2026-09-23). The work repeats:

- On every save in serve (`marp --server --watch`) and `--overview`, for every diagram in the deck.
- Several times per `-v`: the in-process render for page resolution, `renderToHtml` for the visual check, and `marp --images` for `--report-dir`.

A deck with 10 diagrams spends about 5 s per render on Mermaid alone, even when no diagram changed.

## Goal

Unchanged diagrams are not re-rendered, within one process or across processes.

## Acceptance criteria

- [ ] Rendered SVG is cached by a key covering the diagram source, the `beautiful-mermaid` and MathJax versions, and a hash of `src/mermaid-render.js` / `src/mermaid-patch.js`.
- [ ] The cache persists across processes (e.g. under `node_modules/.cache/marpagent-mermaid/` or `.cache/`, already gitignored) with bounded size or age.
- [ ] Failed renders are not cached.
- [ ] Re-rendering a deck with unchanged diagrams spawns no Mermaid subprocess (verified by a test that counts spawns or stubs `execFileSync`).
- [ ] Setting an environment variable (e.g. `MARP_AGENT_MERMAID_CACHE=0`) disables the cache.

## Out of scope

- Replacing `beautiful-mermaid` or moving rendering in-process.

## Files

- `scripts/mermaid-plugin.js`
- `tests/unit/mermaid-render.test.js`
