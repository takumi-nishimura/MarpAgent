---
id: ISS-0027
title: "Check marpx serve for the Marp watch-notifier port race"
type: issue
status: closed
date: "2026-09-24"
authors:
  - claude-code
scope:
  - scripts/marp-serve.js
tags:
  - bug
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


# Check marpx serve for the Marp watch-notifier port race

## Problem

ISS-0025 found that Marp CLI 4.2.3 in `--watch` mode starts a WebSocket notifier. It chooses a free port starting at 37717 during the first conversion but binds it later without handling errors. Two `marp --watch` processes starting at the same time can therefore choose the same port, and the later one crashes with `EADDRINUSE`. The overview no longer uses `marp --watch`, but `scripts/marp-serve.js` still runs `marp --server --watch`. It has not been checked whether serve can hit the same race, for example when two decks are served at once, or when serve and a Marp watch process start together.

## Goal

Know whether `marpx <deck>` (serve) can crash from this race, and prevent it if it can.

## Acceptance criteria

- [x] A reproduction attempt is recorded in Notes: two `marpx <deck>` serve processes started together, and serve started together with another `marp --watch`, repeated enough times to be meaningful.
- [x] If the race reproduces, serve no longer crashes, for example by avoiding the notifier or by retrying on `EADDRINUSE`, and a test covers concurrent starts.
- [ ] If it does not reproduce, Notes explain why (for example, `--server` mode uses a different notifier path) and the issue is closed as completed with that evidence.

## Out of scope

- Replacing Marp's server mode.

## Notes

Follow-up from ISS-0025. The third acceptance criterion is the non-reproduction
branch and does not apply: the race reproduced, so the fix branch governs.

### marp-cli code reading (4.2.3, `lib/marp-cli-CBvmXjya.js`)

- The watch notifier class (`vl`, singleton `Bl`) probes a free port with
  `getPortPromise({port: 37717})` and later binds it in `start()` via
  `new WebSocketServer({port})` with no `error` listener. A concurrent second
  process that probes the same port crashes with an unhandled `EADDRINUSE`.
- The watcher constructor (`Cl`, built by `El`/`Cl.watch`) calls `Bl.start()`
  unconditionally, also when `mode === WatchMode.Notify`, i.e. in `--server`
  mode. So `marp --server --watch` starts the same standalone notifier port
  even though browsers reach it through the HTTP server's `upgrade` handler
  on `/.__marp-cli-watch-notifier__/`. The race applies to serve.
- The serve HTTP port (`PORT` env or 8080) is a separate, handled failure:
  `EADDRINUSE` there is converted to a `CLIError` ("Listen port ... is
  already used in the other process", exit code 3) and never prints the raw
  `EADDRINUSE` text.

### Reproduction (pre-fix)

Trials spawned two processes at once on separate copies of a tiny deck under
`mktemp`, `MARP_AGENT_NO_OPEN=1`, every process group killed after each trial.

- Two `marpx <deck>` serves, distinct `PORT` (isolates the notifier): 17/20
  trials crashed one serve with
  `Error: listen EADDRINUSE: address already in use :::377xx` from
  `new WebSocketServer` / `vl.start` (unhandled `'error'` event), exit 1.
- Raw `marp --server --watch` pair (what the wrapper spawned pre-fix),
  distinct `PORT`: 14/20 trials crashed one process the same way.
- Raw serve + `marp --watch` started together: 20/20 trials crashed one of
  them (the watch process here). The crash can land after the process looks
  ready — the notifier binds asynchronously.

### Fix

`scripts/marp-serve.js` now respawns the marp child (up to 5 retries, 250 ms
delay) when it exits non-zero and its output tail contains `EADDRINUSE` — the
signature only the unhandled notifier crash produces. Retry is safe even when
the output also contains the handled "Listen port" error: if the HTTP port is
still taken the retry simply exits with that error instead. Signal forwarding
now targets the current child across respawns, and a signal during the retry
gap exits the parent. `MARP_AGENT_MARP_BIN` was added as a test seam.

### Post-fix verification (same harness)

- serve + serve, distinct `PORT`, 20 trials: 14 notifier crashes, all
  recovered; 40/40 processes reached "Start server listened", zero deaths.
- serve + serve, same `PORT`, 20 trials: notifier crashes recovered; one
  process per trial exits 3 with "Listen port ..." (expected: two servers
  cannot share an HTTP port).
- serve + `marp --watch`, 20 trials: serve hit the notifier crash 20/20 and
  recovered every time; all 40 processes ready. A standalone `marp --watch`
  can still crash — it is the user's own process, outside `marpx` control
  (raw baseline crashed 20/20).

### Test

`tests/unit/marp-serve.test.js` covers concurrent starts deterministically: a
stub marp binary probes a free port via a connect check (no bind) and binds
after a marker-file barrier, so two `scripts/marp-serve.js` processes started
together are guaranteed to collide once; the test asserts both reach ready
and that the retry fired. `isNotifierPortConflict` in
`src/preview-runtime.js` is unit-tested for crash, handled-collision, mixed,
and clean outputs.

Note: `scripts/preview-overview.js` still spawns `marp --watch` without a
retry; the same race can kill the overview's watch child (ISS-0025 scope).
