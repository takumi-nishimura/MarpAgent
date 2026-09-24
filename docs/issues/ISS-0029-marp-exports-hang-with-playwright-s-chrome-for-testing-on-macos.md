---
id: ISS-0029
title: "Marp exports hang with Playwright's Chrome for Testing on macOS"
type: issue
status: closed
date: "2026-09-24"
authors:
  - claude-code
scope:
  - bin/marpx.js
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


# Marp exports hang with Playwright's Chrome for Testing on macOS

## Problem

On the author's macOS machine, on 2026-09-24, every Marp CLI conversion that needs a browser (`marpx --pdf`, `--pptx`, `--images`, and the e2e export smoke test) hangs until puppeteer times out with `Runtime.callFunctionOn timed out`. `runMarp` in `bin/marpx.js` always passes `--browser-path` pointing at Playwright's "Google Chrome for Testing" (chromium-1208):

- `marp --browser-path <Chrome for Testing> --pdf` on a plain deck with no config: hangs for more than 60 s.
- The same command without `--browser-path`, so Marp picks the installed Google Chrome: finishes in 7–8 s, for both PDF and PPTX.
- Chrome for Testing itself starts headless and prints the DOM in 1 s.
- `CHROME_NO_SANDBOX=1` does not help, and Google Fonts is reachable.
- CI (Linux) passes. The same export test passed locally earlier the same day, so the trigger is environmental and not yet identified.

## Goal

`marpx` browser-based exports work on the author's machine, and a stalled browser fails fast with an actionable message instead of hanging for minutes.

## Acceptance criteria

- [x] The root cause is identified and recorded in Notes, or ruled out with evidence (for example, a macOS keychain or permission prompt, or a Chrome for Testing and puppeteer protocol mismatch).
- [x] `runMarp` chooses a browser that works. For example, prefer Marp's own detection of an installed Chrome and fall back to Playwright's Chromium only when none is found, or honor `CHROME_PATH`. The behavior is documented.
- [x] A conversion that stalls reports a clear error within a bounded time.
- [x] `npx playwright test` passes locally on macOS and in CI.

## Notes

Found while reviewing ISS-0028. It reproduces on `main` and is unrelated to that change.

### 2026-09-24 — root cause and fix

Root cause identified on the author's machine with `DEBUG=puppeteer:*` and a
minimal puppeteer probe. The page loads normally (load + networkIdle fire);
the stall is marp-cli's pre-print `await new Promise(requestAnimationFrame)`,
which never resolves in Playwright's "Google Chrome for Testing" 145.0.7632.6
(chromium-1208) on macOS arm64. rAF never fires in that binary under
`--headless=new`, `--headless=old`, or `--disable-gpu`; the installed Google
Chrome 153 with byte-identical puppeteer launch arguments returns rAF in
milliseconds, and Playwright's `chromium-headless-shell` of the same 145
revision also works. So it is a frame-production stall in that specific CfT
app build — not a keychain/permission prompt, not a protocol mismatch, and it
explains why Playwright-based checks were unaffected (they launch
headless-shell, not the CfT app).

Fix in `bin/marpx.js` + new `src/marp-browser.js`:

- `runMarp` now omits `--browser-path` when marp-cli can find a browser itself
  (`CHROME_PATH`, `LIGHTHOUSE_CHROMIUM_PATH`, or an installed Chrome/Edge per
  `findInstalledBrowser`, which mirrors marp-cli's own finder lists). Only
  when none is found does it pin Playwright's Chromium — preferring the
  `chromium-headless-shell` build (resolved via playwright-core's internal
  registry with a `chromium.executablePath()` fallback) since the CfT app
  binary is the broken one.
- One-shot exports (`--pdf`, `--pptx`, `--html`, `--images`) are bounded by
  `MARP_AGENT_CONVERT_TIMEOUT_MS` (default 120000 ms). On expiry marpx sends
  SIGTERM (letting puppeteer close the browser), escalates to SIGKILL after
  5 s, and exits 1 with an actionable error. `--preview` stays unbounded.
- Documented in README. Behavior covered by `tests/unit/marp-browser.test.js`;
  CI (Linux, no installed Chrome) keeps working via the Playwright fallback.
