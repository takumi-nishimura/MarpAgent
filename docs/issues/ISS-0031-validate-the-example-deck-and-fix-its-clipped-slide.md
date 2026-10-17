---
id: ISS-0031
title: "Validate the example deck and fix its clipped slide"
type: issue
status: open
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

README/AGENTS.mdが動作見本として示す`decks/example/slide.md`が，自前バリデータで失敗する．実測: `npm run marpx -- decks/example/slide.md -v`がexit 1となり，slide 4 (page 3)に`content-clipped`上端61pxの計測エラー（`"slide.md"`ラベル，`"— ページ順・本文・図を直接編集する"`，`"brief.md"` 19px等）が出る．

原因は，テーマ側の調整（#48 付近のfooter/pagination余白変更）にサンプルのスライド内容が追従できていないこと．その間，fixtureゲートは`template/layouts.md`とfixturesのみを対象とする（`docs/theme-contract.md:267`参照の運用）ため，example deckの劣化はどのgateでも検知されない．

## Goal

クリーンなチェックアウトで`decks/example/slide.md`が厳格検証を通過し，今後テーマや検証ルールを変更した際にexample deckの破れがCIで露見する．

## Acceptance criteria

- [ ] `npm run marpx -- decks/example/slide.md -v`がexit 0（blocker 0件）になる．
- [ ] `quality:gate`が`decks/example/slide.md`をfixtureと同条件（strict visual付き）で検証する．
- [ ] example deckを意図的に崩すと`quality:gate`が失敗することを1回確認する．

## Out of scope

検証ルール（`content-clipped`計測）の変更，fixturesの内容，テーマ外観の変更．

## Approach

slide 4を分割，またはMermaid図の縦方向要求を減らして修正した上で，`quality:gate`のコマンド列にexample deckの`-v`（report出力付き）を追加する．

## Notes

2026-10-17: リポジトリ全体精査の総合レポートで検出し，実機で再現した．
