---
id: ISS-0033
title: "Apply the conversion timeout to validate and screenshot rendering"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - src/visual-overflow.js
  - bin/marpx.js
  - src/deck-validator.js
tags:
  - cli
  - timeout
  - validator
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - MARP_AGENT_CONVERT_TIMEOUT_MS=10000 npm run marpx -- decks/example/slide.md -v
    - MARP_AGENT_CONVERT_TIMEOUT_MS=10000 npm run marpx -- decks/example/slide.md --pdf
---

# Apply the conversion timeout to validate and screenshot rendering

## Problem

`MARP_AGENT_CONVERT_TIMEOUT_MS`はexport経路とreport用スクショ（`src/deck-validator.js:597`の`execFileSync`）にしか効いていない．

- `src/visual-overflow.js:87-105` `renderToHtml`: `execFileSync`に`timeout`オプションがなく，`-v`のレンダステップはmarp-cliやブラウザがstallすると無期限で待つ．
- screenshotモードの`screenshotSlide`（`src/visual-overflow.js:1211-1230`付近）にもウォッチドッグがなく，`--screenshot`はブラウザstallでハングし得る．
- `bin/marpx.js`のenv解析（`Number(env)||120000`）は`0`や負値でタイムアウトを完全に無効化する．さらに負値は`src/deck-validator.js:597`の`execFileSync`では`RangeError`（artifact errorにはなるが，意味の通る診断がない）．
- タイムアウト時のSIGKILLはmarp-cli親プロセスのみを対象とし，Chromiumが孤児化する余地がある（`detached`化とプロセスグループ終了が未整備）．

README:139-141はconversionがタイムアウトされる仕様と読めるため，validate/screenshotの未適用は仕様に対する抜けである．

## Goal

marp-cliとChromiumを起動する全経路が上限つきで動作し，env値が妥当性検査される．「タイマーはあるのに効かない」「固まったまま戻らない」状態をなくす．

## Acceptance criteria

- [ ] `-v`がmarp-cli stall時に`MARP_AGENT_CONVERT_TIMEOUT_MS`上限内でタイムアウト用メッセージとともにexitする．
- [ ] `--screenshot`も同じ上限内でexitする．
- [ ] `MARP_AGENT_CONVERT_TIMEOUT_MS=0`および負値が明示的なエラー（使い方の説明つき）になる．
- [ ] タイムアウト後にmarp-cliとChromiumのどちらもプロセスとして残らない．

## Out of scope

macOS × Chrome-for-TestingのISS-0029本体の再調査，watchモードの常駐タイムアウト導入．

## Approach

env解析を検証つきの共通関数にまとめ，`renderToHtml`/`screenshotSlide`に同じtimeoutを渡す．exportパスのspawnを`detached`化し，タイムアウト時はプロセスグループごと終了する．

## Notes

2026-10-17: 精査レポートで検出．`ISS-0029`（closed）の修正がexportに着目していた一方，validate/screenshotに未適用箇所が残るため，本issueが残置領域を追跡する．
