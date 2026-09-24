---
id: ISS-0016
title: Cache Mermaid SVG renders across Marp renders
type: issue
status: closed
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
resolution: completed
resolved: "2026-09-24"
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

- [x] Rendered SVG is cached by a key covering the diagram source, the `beautiful-mermaid` and MathJax versions, and a hash of `src/mermaid-render.js` / `src/mermaid-patch.js`.
- [x] The cache persists across processes (e.g. under `node_modules/.cache/marpagent-mermaid/` or `.cache/`, already gitignored) with bounded size or age.
- [x] Failed renders are not cached.
- [x] Re-rendering a deck with unchanged diagrams spawns no Mermaid subprocess (verified by a test that counts spawns or stubs `execFileSync`).
- [x] Setting an environment variable (e.g. `MARP_AGENT_MERMAID_CACHE=0`) disables the cache.

## Out of scope

- Replacing `beautiful-mermaid` or moving rendering in-process.

## Files

- `scripts/mermaid-plugin.js`
- `tests/unit/mermaid-render.test.js`

## Notes

- 2026-09-24: Added a disk cache around `renderMermaidSync` in `scripts/mermaid-plugin.js`. Cache files are `<sha256>.svg` under `node_modules/.cache/marpagent-mermaid/`; the key hashes the diagram source plus a fingerprint of sha256(`src/mermaid-render.js`), sha256(`src/mermaid-patch.js`), and the `beautiful-mermaid` / `mathjax` versions (resolved by walking up from `require.resolve`, since `beautiful-mermaid` does not export its `package.json`). Writes go through a per-process temp file + rename so concurrent readers never see a partial file, and `pruneCache` bounds the directory at 256 entries / 30 days, evicting oldest mtime first (hits refresh mtime for LRU). `MARP_AGENT_MERMAID_CACHE=0` disables the cache entirely; `MARP_AGENT_MERMAID_CACHE_DIR` redirects it, which tests use to keep `node_modules` untouched. Failed renders throw before `writeCache`, so they are never cached. `execFileSync` is now invoked via the `child_process` module object so tests can stub it and count spawns.
