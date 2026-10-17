---
id: ISS-0030
title: "Stabilize theme lifecycle tests"
type: issue
status: open
date: "2026-10-16"
authors:
  - Codex
scope:
  - tests/unit/theme-watch.test.js
  - tests/unit/theme-css.test.js
  - tests/unit/new-theme.test.js
tags:
  - testing
  - themes
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm test
    - node --test --test-concurrency=1 tests/unit/*.test.js
    - node --test tests/unit/theme-watch.test.js
---

# Stabilize theme lifecycle tests

## Problem

スクロール機能の全体検証中，テーマのライフサイクルを扱う既存テストが不安定だった．

* 並列実行では`generated design token CSS is fresh for all designs`が失敗した．freshness検査が列挙した`designs/test-theme-<pid>-<timestamp>/DESIGN.md`を読み出す時点で削除済みとなり，`designmd export`がENOENTを返した．scaffold検査の一時テーマと同じディレクトリを参照している．
* `theme watch regenerates tokens after consecutive atomic saves`が，保存後の色を待つ`tests/unit/theme-watch.test.js:74`で失敗した．全テストの順次実行でも298件中この1件が失敗し，単独実行でも再現した．
* 同じ監視テストを一時コピーで計測した実行は成功し，変更前HEAD `ebc289f`を一時ディレクトリに展開した単独実行も成功した．監視の失敗原因とスクロール変更との因果は未確定であり，単純な負荷だけとは断定できない．

## Goal

テーマのscaffold，freshness，連続atomic saveのテストが一時ファイルや実行順に依存せず，正しい更新を安定して検出する．

## Acceptance criteria

- [ ] テーマ作成テストとfreshness検査を並列実行しても，一時テーマの列挙／削除競合が発生しない．
- [ ] 監視テストが単独と全体の両方で複数回成功し，2回のatomic saveそれぞれの色を検出する．
- [ ] 更新を止めた監視実装ではテストが失敗することを確認する．
- [ ] タイムアウト延長だけで隠さず，失敗時に保存回数，期待色，実際のtoken，watcherのreadinessを判別できる．

## Out of scope

スライド本文のスクロール機能，描画検証のルール，テーマの外観変更．

## Approach

freshness検査の入力をtracked designへ限定するか，scaffold検査を一時repositoryに隔離する．監視については保存イベントからtoken反映までを計測して原因を特定する．

## Notes

2026-10-16：新規スクロールの単体検査14件，厳格なfixture検証17件，全E2Eの62件は成功した．FirefoxのCDP専用タッチ注入1件は対象外．全単体検査が成功したとは報告せず，このissueで残る検証上の問題を追跡する．

2026-10-17：全体精査で根因構造を裏取りした．`tests/unit/cli-args.test.js:194-221`が実リポジトリの`designs/`・`themes/src/`・`fixtures/`へ書き出し，並列実行（`scripts/run-node-tests.js`の`node --test`）で`tests/unit/theme-css.test.js:492-499`のfreshness検査が列挙と削除の合間にENOENTとなり得る．`theme-watch.test.js:74-82`は中間状態観察を前提とする待ち込みであり，連続atomic saveがdebounceで合流すると単独実行でも失敗し得ることが読み取れる．対応の目安: scaffold検証の一時ディレクトリ隔離と，watcherテストの最終状態判定．
