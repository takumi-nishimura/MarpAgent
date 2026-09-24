---
id: ISS-0026
title: "Forward termination signals from marpx to its child scripts"
type: issue
status: closed
date: "2026-09-24"
authors:
  - claude-code
scope:
  - bin/marpx.js
  - tests/e2e/cli-smoke.spec.js
tags:
  - bug
  - dx
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


# Forward termination signals from marpx to its child scripts

## Problem

`runScript` in `bin/marpx.js` spawns the mode script (`marp-serve.js`, `preview-overview.js`, `validate-deck.js`, and so on) as a child process but does not forward `SIGTERM` or `SIGINT` to it. When `marpx` itself is terminated, for example when the `overview smoke` test in `tests/e2e/cli-smoke.spec.js` kills its process, the child keeps running. On 2026-09-24, 43 leftover overview and `marp --watch` processes from earlier test runs were running on the development machine, spread across the main checkout and several worktrees.

## Goal

Terminating `marpx` terminates the script it started, and the test suite leaves no servers running.

## Acceptance criteria

- [x] `runScript` (and `runMarp`) forward `SIGINT` and `SIGTERM` to the child and exit with the child's status afterwards.
- [x] A unit or e2e test starts `marpx <deck> --overview`, sends `SIGTERM` to `marpx`, and asserts the overview process is gone.
- [x] The `overview smoke` test leaves no process behind, checked by listing processes after the test or by killing the process group.

## Out of scope

- Changing how the overview renders (see ISS-0025).

## Notes

Found by the ISS-0025 worker; the leftovers were cleaned up manually on 2026-09-24.

Implemented 2026-09-24: `bin/marpx.js` gained a `forwardChildSignals` helper
(same shape as `src/preview-runtime.js`) used by both `runScript` and `runMarp`.
Registering the signal handlers keeps `marpx` alive until the child exits, so
the existing `exit` handler still reports the child's status. The theme watch
mode already forwarded to its children and is unchanged. In
`tests/e2e/cli-smoke.spec.js`, `marpx` is now spawned with `detached: true` so
its whole tree shares a process group; a new test sends `SIGTERM` to `marpx`
and asserts the group empties (covering `preview-overview.js` and its
`marp --watch` grandchild), and `overview smoke` asserts no group members are
left behind after teardown. A `SIGKILL` process-group backstop in `finally`
guarantees cleanup even if forwarding regresses. SIGINT verified manually
(`marpx` exited 130, no leftovers).
