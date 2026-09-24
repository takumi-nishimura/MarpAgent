---
id: ISS-0029
title: "Marp exports hang with Playwright's Chrome for Testing on macOS"
type: issue
status: open
date: "2026-09-24"
authors:
  - claude-code
scope:
  - bin/marpx.js
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

- [ ] The root cause is identified and recorded in Notes, or ruled out with evidence (for example, a macOS keychain or permission prompt, or a Chrome for Testing and puppeteer protocol mismatch).
- [ ] `runMarp` chooses a browser that works. For example, prefer Marp's own detection of an installed Chrome and fall back to Playwright's Chromium only when none is found, or honor `CHROME_PATH`. The behavior is documented.
- [ ] A conversion that stalls reports a clear error within a bounded time.
- [ ] `npx playwright test` passes locally on macOS and in CI.

## Notes

Found while reviewing ISS-0028. It reproduces on `main` and is unrelated to that change.
