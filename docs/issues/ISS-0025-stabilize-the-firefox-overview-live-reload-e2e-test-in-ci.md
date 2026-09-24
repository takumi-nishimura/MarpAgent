---
id: ISS-0025
title: "Stabilize the Firefox overview live-reload e2e test in CI"
type: issue
status: closed
date: "2026-09-24"
authors:
  - claude-code
scope:
  - tests/e2e/overview-live-reload.spec.js
  - tests/unit/preview-overview.test.js
  - scripts/preview-overview.js
  - src/overview-preview.js
tags:
  - test
  - ci
depends_on: []
supersedes: []
resolution: completed
resolved: "2026-09-24"
artifacts:
  revisions:
    - 07120e9
  manifests: []
  results: []
  commands: []
---


# Stabilize the Firefox overview live-reload e2e test in CI

## Problem

The CI quality gate (`npm run quality:gate:strict` on ubuntu-latest) fails intermittently in one test: `[firefox-overview] tests/e2e/overview-live-reload.spec.js:64 › overview follows consecutive saves in every supported browser`. The failure mode differs between runs:

- `page.goto: NS_ERROR_CONNECTION_REFUSED`
- `expect(locator).toBeVisible()` failed: element(s) not found (2500 ms)
- the 30 s test timeout

On 2026-09-24, PRs #24, #28, #29, and #30 failed in this test, and still failed after a rerun of the failed job. #25, #26, #27, and #31 passed with the same base code, and #25 passed on rerun. The chromium variant and every other test passed. Local macOS runs pass consistently. `main` last passed on c84a953 (2026-09-12).

## Goal

The test verifies the live-reload behavior reliably in CI. It must not mask a real reload regression, and it must not fail on timing alone.

## Acceptance criteria

- [x] The root cause is identified (server readiness, file-watch latency, reload polling, or Firefox-specific timing) and recorded in Notes with evidence from CI logs or a reproduction.
- [x] The fix removes the race instead of only raising timeouts or adding retries. For example, wait on an explicit readiness signal from `preview-overview.js` before `page.goto`, and wait for the reload token to change instead of using fixed sleeps. Any timeout increase is justified in Notes.
- [x] The test still fails when reloading is broken; verify this by temporarily breaking the reload in a local run.
- [x] The e2e suite passes in CI across at least three consecutive runs of the fix branch (use reruns or an empty commit), and the run links are listed in Notes.

## Out of scope

- Redesigning the overview feature.

## Notes

The overview reload behavior was last changed in af3bd11 / 71c4ab3 ("Fix overview reloads across browsers").

### Root cause (2026-09-24)

The race was in the product, not in Firefox. `scripts/preview-overview.js` ran `marp --watch`, and Marp CLI 4.2.3 always starts a watch-notifier WebSocket server in watch mode. It picks the port with `portfinder.getPortPromise({ port: 37717 })` during the first conversion and binds it only after the watcher starts, and the `WebSocketServer` has no `error` listener. When two `marp --watch` processes start together, both see 37717 as free, the later bind fails with `EADDRINUSE`, and the unhandled `error` event kills Marp. The overview then closes its HTTP server and exits.

The e2e suite starts three of these processes (the Chromium overview smoke test and both projects of the live-reload test) in two CI workers. Firefox launches more slowly, so its process is the later one and loses the port. The moment of the crash explains all three CI symptoms: before the first output the URL is never printed (30 s timeout, runs 35890314042 and 35890045708), after the URL is printed `page.goto` hits a closed port (`NS_ERROR_CONNECTION_REFUSED`, run 35888434588), and after the page loads the save is never rendered (`State: save-1` not found, run 35889719331). Whether the startups overlap depends on runner timing, which is why reruns passed or failed at random.

Reproduction: two `marpx --overview` processes started together crash one with `Error: listen EADDRINUSE: address already in use :::<port>` at `WebSocketServer` in `vl.start` (Marp's notifier). `npx playwright test tests/e2e/overview-live-reload.spec.js --repeat-each 8 --workers 4` on the old code failed 3 of 16 runs with "Timed out waiting for overview URL". The new unit test "concurrent overview servers keep serving and following saves" failed in all 5 runs on the old code; the captured output showed the same `EADDRINUSE` trace.

### Fix

- `preview-overview.js` no longer runs `marp --watch`. It watches the deck directory (filtered to the deck file) and `themes/` (`*.css`) with `fs.watch` and renders each change in-process with the documented `marpCli` API. The overview removes Marp's scripts from the page and polls `/__marp_agent__/meta` itself, so it never used the notifier and nothing is lost.
- A render queue never renders twice at once and merges saves that arrive during a render into one follow-up render, so the last save wins. Each render writes a temporary `.html` file and renames it over the output, so the server never reads a half-written file and a failed render keeps the previous overview.
- Readiness is explicit: the server listens, the watchers start, and after the first successful render the process prints `[preview:overview] Opened <url>`. The test navigates and saves only after this line. The test had no fixed sleeps; it already polled the page with `expect`.
- The e2e test now drains stdout and stderr for the whole run, attaches the server log, fails right away with that log if the server exits before it is ready, and signals the whole process group on cleanup (previously `marpx` exited and left the overview server running). The URL wait is 20 s rather than the full 30 s test timeout so that its error, with the log, arrives before the generic timeout. The per-save 2.5 s timeouts are unchanged.

### Break verification

- Commenting out `window.location.reload()` in `buildReloadScript` makes both projects fail at `State: save-1` (element not found).
- Making the deck watcher ignore every event makes the Firefox project fail at `State: save-1`.

Both breaks were reverted.

### Local results

After the fix: `--repeat-each 20 --workers 8` passed 40/40, `--repeat-each 15 --workers 6` under 10 CPU hogs passed 30/30, `--project firefox-overview --repeat-each 20 --workers 4` passed 20/20, and the full e2e suite repeated 10 times under 14 CPU hogs passed every overview test. The one failure in that last run was in a `cli-smoke` screenshot/outline `toBeTruthy` check, which is unrelated to the overview. Under more CPU hogs than cores, macOS starved the sandbox's niced processes and every test timed out, so that setup was not used as evidence.

### CI runs (PR #34, commit 07120e9)

- https://github.com/takumi-nishimura/MarpAgent/actions/runs/35939005218/attempts/1 — success, e2e 6 passed
- https://github.com/takumi-nishimura/MarpAgent/actions/runs/35939005218/attempts/2 — success, e2e 6 passed
- https://github.com/takumi-nishimura/MarpAgent/actions/runs/35939005218/attempts/3 — success, e2e 6 passed

### Related problems not fixed here

- `bin/marpx.js` `runScript` does not pass SIGTERM on to the script it runs, so `terminateChild` in `tests/e2e/cli-smoke.spec.js` ("overview smoke") still leaves an overview server running after each run.
- `scripts/marp-serve.js` still runs `marp --server --watch`. Whether server mode also starts the separate-port notifier and can hit the same `EADDRINUSE` race was not checked.
