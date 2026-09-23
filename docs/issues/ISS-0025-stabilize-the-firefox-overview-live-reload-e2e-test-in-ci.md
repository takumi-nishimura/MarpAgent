---
id: ISS-0025
title: "Stabilize the Firefox overview live-reload e2e test in CI"
type: issue
status: open
date: "2026-09-24"
authors:
  - claude-code
scope:
  - tests/e2e/overview-live-reload.spec.js
  - scripts/preview-overview.js
  - src/overview-preview.js
tags:
  - test
  - ci
depends_on: []
supersedes: []
artifacts:
  revisions: []
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

- [ ] The root cause is identified (server readiness, file-watch latency, reload polling, or Firefox-specific timing) and recorded in Notes with evidence from CI logs or a reproduction.
- [ ] The fix removes the race instead of only raising timeouts or adding retries. For example, wait on an explicit readiness signal from `preview-overview.js` before `page.goto`, and wait for the reload token to change instead of using fixed sleeps. Any timeout increase is justified in Notes.
- [ ] The test still fails when reloading is broken; verify this by temporarily breaking the reload in a local run.
- [ ] The e2e suite passes in CI across at least three consecutive runs of the fix branch (use reruns or an empty commit), and the run links are listed in Notes.

## Out of scope

- Redesigning the overview feature.

## Notes

The overview reload behavior was last changed in af3bd11 / 71c4ab3 ("Fix overview reloads across browsers").
