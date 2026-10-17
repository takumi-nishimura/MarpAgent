---
id: ISS-0033
title: "Apply the conversion timeout to validate and screenshot rendering"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-18"
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
    - node --test tests/unit/conversion-runtime.test.js tests/unit/validation-failures.test.js
    - MARP_AGENT_CONVERT_TIMEOUT_MS=10000 npm run marpx -- decks/example/slide.md -v
    - MARP_AGENT_CONVERT_TIMEOUT_MS=10000 npm run marpx -- decks/example/slide.md --pdf
---

# Apply the conversion timeout to validate and screenshot rendering

## Problem

`MARP_AGENT_CONVERT_TIMEOUT_MS`はexport経路とreport用スクショ（`src/deck-validator.js:597`の`execFileSync`）にしか効いていない．

- `src/visual-overflow.js:87-105` `renderToHtml`: `execFileSync`に`timeout`オプションがなく，`-v`のレンダステップはmarp-cliやブラウザがstallすると無期限で待つ．
- screenshotモードの`screenshotSlide`（`src/visual-overflow.js:1211-1230`付近）にもウォッチドッグがなく，`--screenshot`はブラウザstallでハングし得る．
- `bin/marpx.js`のenv解析（`Number(env)||120000`）は負値でタイムアウトを無効化する．`0`は120000 msへ暗黙fallbackする（初回精査の「0でも無効化」は誤り）．さらに負値は`src/deck-validator.js:597`の`execFileSync`では`RangeError`（artifact errorにはなるが，意味の通る診断がない）．
- タイムアウト時のSIGKILLはmarp-cli親プロセスのみを対象とし，Chromiumが孤児化する余地がある（`detached`化とプロセスグループ終了が未整備）．

README:139-141はconversionがタイムアウトされる仕様と読めるため，validate/screenshotの未適用は仕様に対する抜けである．

## Goal

marp-cliとChromiumを起動する全経路が上限つきで動作し，env値が妥当性検査される．「タイマーはあるのに効かない」「固まったまま戻らない」状態をなくす．

## Acceptance criteria

- [x] `-v`のrender/browser処理が`MARP_AGENT_CONVERT_TIMEOUT_MS`で中断され，診断に上限を表示する．通常モードは既存のheuristic fallback，strictモードは非ゼロ終了となる．
- [x] `--screenshot`もrender/browser処理の共通deadlineを使い，失敗時に一時ファイルを削除してexit 1となる．
- [x] `MARP_AGENT_CONVERT_TIMEOUT_MS=0`および負値が明示的なエラー（使い方の説明つき）になる．
- [x] タイムアウト後にmarp-cliとChromiumの処理を継続する子孫プロセスが残らない．

## Out of scope

macOS × Chrome-for-TestingのISS-0029本体の再調査，watchモードの常駐タイムアウト導入．

## Approach

env解析，変換監視，プロセス終了を`src/conversion-runtime.js`へまとめる．同期renderとreport exportは別の監視プロセスからMarpを起動し，deadline時にMarpの子孫とそのprocess groupを終了する．Chromium自身がdetachedとなる場合も親終了前に子孫を列挙する．Playwrightは公開`BrowserServer.kill()`でブラウザgroupを終了し，page処理とclose処理までdeadline対象とする．

## Notes

2026-10-17: 精査レポートで検出．`ISS-0029`（closed）の修正がexportに着目していた一方，validate/screenshotに未適用箇所が残るため，本issueが残置領域を追跡する．

2026-10-18: 0・負値・小数・非数・timer上限超過の拒否，validate/screenshotのstall，detached browser相当の子孫終了，browser page操作のstallをRED→GREENで確認した．実ブラウザを使う既存のvalidation/artifact失敗テストも通過した．通常validateは従来どおりvisual不能時にheuristicへfallbackするため，単に非ゼロ終了を必須とする元ACをstrictモードと区別した．OSの起動・終了・一時ファイル後片付け時間は指定msの外に加わり得る．Linuxで検証し，Windowsの`taskkill /T /F`経路とmacOSのprocess group経路は未実機確認．
