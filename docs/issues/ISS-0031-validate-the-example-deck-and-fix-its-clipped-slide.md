---
id: ISS-0031
title: "Validate the example deck and fix its clipped slide"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-18"
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - decks/example/slide.md
  - package.json
  - scripts/ci-validate-fixtures.js
tags:
  - decks
  - validator
  - ci
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm run marpx -- decks/example/slide.md -v
    - npm run quality:gate
---

# Validate the example deck and fix its clipped slide

## Problem

README/AGENTS.mdが動作見本として示す`decks/example/slide.md`が，自前バリデータで失敗する．実測: `npm run marpx -- decks/example/slide.md -v`がexit 1となり，slide 4 (page 3)に`content-clipped`下端61pxの計測エラー（`"slide.md"`ラベル，`"— ページ順・本文・図を直接編集する"`，`"brief.md"` 19px等）が出る．

現行スライドではMermaid図の高さが後続の2項目をcanvas外へ押し出す．特定の過去のテーマ変更との因果は未確定である．fixtureゲートは`template/layouts.md`とfixturesのみを対象としており，example deckの劣化を検知していない．

## Goal

クリーンなチェックアウトで`decks/example/slide.md`が厳格検証を通過し，今後テーマや検証ルールを変更した際にexample deckの破れがCIで露見する．

## Acceptance criteria

- [x] `npm run marpx -- decks/example/slide.md -v`がexit 0（blocker 0件）になる．
- [x] `quality:gate`が`decks/example/slide.md`をfixtureゲート内でstrict visual付きで検証する．
- [x] example deckを意図的に崩すと`quality:gate`のfixture段階が失敗することを1回確認する．

## Out of scope

検証ルール（`content-clipped`計測）の変更，fixturesの内容，テーマ外観の変更．

## Approach

slide 4を分割，またはMermaid図の縦方向要求を減らして修正した上で，`quality:gate`のコマンド列にexample deckの`-v`（report出力付き）を追加する．

## Notes

2026-10-17: リポジトリ全体精査の総合レポートで検出し，実機で再現した．

2026-10-18：変更前の実描画で下端61pxのclipを再現し，図wrapperの幅を90%から65%へ変更した．本文と図のラベルを維持し，変更後は全15枚をmeasuredで検証してfindings 0，exit 0となった．変更ページと隣接ページの画像も確認した．exampleをfixtureゲートに追加し，非strictの呼び出しでもこのデッキは必ずstrict visualで測定する．幅を90%へ戻す負例では`content-clipped`によりfixtureゲートがexit 1となり，復元後の`quality:gate:strict`は全18デッキを通過した．

`MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE=1`を与えた実プロセスでも，通常ゲートとstrictゲートの両方がexampleの測定失敗でexit 1となった．さらにgate helperは，子が誤ってexit 0を返してもstrict時に`visualCheck.status: measured`以外を拒否する．この不変条件もRED→GREENで確認した．
