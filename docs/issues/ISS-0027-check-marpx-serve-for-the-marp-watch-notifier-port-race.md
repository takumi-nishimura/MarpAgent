---
id: ISS-0027
title: "Check marpx serve for the Marp watch-notifier port race"
type: issue
status: open
date: "2026-09-24"
authors:
  - claude-code
scope:
  - scripts/marp-serve.js
tags:
  - bug
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---


# Check marpx serve for the Marp watch-notifier port race

## Problem

ISS-0025 found that Marp CLI 4.2.3 in `--watch` mode starts a WebSocket notifier. It chooses a free port starting at 37717 during the first conversion but binds it later without handling errors. Two `marp --watch` processes starting at the same time can therefore choose the same port, and the later one crashes with `EADDRINUSE`. The overview no longer uses `marp --watch`, but `scripts/marp-serve.js` still runs `marp --server --watch`. It has not been checked whether serve can hit the same race, for example when two decks are served at once, or when serve and a Marp watch process start together.

## Goal

Know whether `marpx <deck>` (serve) can crash from this race, and prevent it if it can.

## Acceptance criteria

- [ ] A reproduction attempt is recorded in Notes: two `marpx <deck>` serve processes started together, and serve started together with another `marp --watch`, repeated enough times to be meaningful.
- [ ] If the race reproduces, serve no longer crashes, for example by avoiding the notifier or by retrying on `EADDRINUSE`, and a test covers concurrent starts.
- [ ] If it does not reproduce, Notes explain why (for example, `--server` mode uses a different notifier path) and the issue is closed as completed with that evidence.

## Out of scope

- Replacing Marp's server mode.

## Notes

Follow-up from ISS-0025.
