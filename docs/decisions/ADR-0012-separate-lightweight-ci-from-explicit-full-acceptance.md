---
id: ADR-0012
title: "Separate lightweight CI from explicit full acceptance"
type: decision
status: proposed
date: "2026-10-30"
authors:
  - marp-ci-astra
scope:
  - .github/workflows/quality-gate.yml
  - package.json
  - tests/unit/ci-workflow.test.js
  - docs/ci.md
tags:
  - ci
  - validation
  - records
depends_on: []
supersedes: []
issues: []
artifacts:
  revisions:
    - 6a6c9433cc0f893b20d5f40fbfa52d990591d103
    - 0c2adeec7b60ecabafb500c28760ec39173fb339
    - 0cecb0cf0872687ab1122b10b84eda8a26a0641d
  manifests:
    - .github/workflows/quality-gate.yml
    - package.json
  results: []
  commands:
    - uv run .github/records.py validate
    - npm run test:ci
    - node --test --test-isolation=none --test-reporter=spec tests/unit/ci-workflow.test.js
    - actionlint .github/workflows/quality-gate.yml .github/workflows/dependency-audit.yml
    - npm run ci:full
---

# Separate lightweight CI from explicit full acceptance

## Context and Problem Statement

PR64 の開始 head `0c2adee` は，PR／main push を軽量 smoke，`workflow_dispatch` を完全受入れへ分離した．しかし docs／decks だけの変更では記録検証も実行されず，重複 XR ID のような全記録間の不整合を自動チェックが見逃す．また自動成功と完全受入れの成功を区別し，dispatch が利用できない導入前 PR でも merge 前に同じ完全受入れを実行できる手順が必要である．

## Decision Drivers

* docs／decks だけの変更で Node エンジン・ブラウザ・D2 を導入する費用を避ける．
* 記録の重複 ID，schema，参照整合性を変更パスによらず検証する．
* 全 unit，fixture/example 実測，Chromium／Firefox，固定 D2，日本語 font，portable ZIP の受入経路と失敗条件を保持する．
* 取得・差分判定・検証のエラーを成功へ読み替えず，検証した範囲を明示する．
* dependency remediation と CI の採用を別の変更単位とし，監査 baseline を広げない．

## Considered Options

### Option 1：すべての自動実行で完全受入れ

* 利点：各 PR のチェックから広い受入結果を得られる．
* 欠点：記録・文章だけの変更にも重いブラウザ／D2 準備と全検証を要求し，PR64 の軽量化を失う．
* 根拠となるXR：新規 benchmark は実施しておらず，費用削減率の定量的主張はしない．

### Option 2：常時の記録検証，条件付き smoke，明示的な完全受入れ

* 利点：既存の record CLI を使い，エンジン導入を省いても記録全体の破損を検出する．full の既存条件を保持できる．
* 欠点：自動成功だけで描画・export の回帰は保証できず，merge 前の full 実行と結果確認が必要になる．
* 根拠となるXR：今回は CI 回帰テストと workflow 構文検証を根拠とし，受入結果の代わりとなる XR は作成しない．

### Option 3：docs-only を無検証にする

* 利点：自動実行の準備をさらに省ける．
* 欠点：重複 XR ID や記録間参照の破損を通すため要件を満たさない．

## Decision Outcome

### Chosen Option

Option 2 を提案する．uv の準備と `uv run .github/records.py validate` を既存 job の常時ステップへ移し，パス判定から独立させる．エンジンが必要な自動実行は `test:ci`，manual は従来の完全受入れへ進む．ローカル用 `ci:full` は記録 → D2 → portable ZIP → strict gate を順に実行し，失敗時に停止する．

本 ADR は `proposed` のままとする．CI の限定検証だけでは採用を確定せず，peer の依存・記録変更を含む統合 revision で完全受入れと dependency audit を確認した後に判断する．

### Scope

MarpAgent の `Quality Gate`，対応する package scripts，CI 回帰テスト，運用手順を対象とする．PR は event の base/head，push は before/sha の tree 差分を比較する既存方式を保持する．古い base／shallow checkout は不足端点だけを取得し，base 側の変更も含めて保守的に smoke を選ぶ．

### Non-goals

dependency の版・lockfile・audit baseline の変更，peer の記録修正，required checks／保護設定の変更，GitHub への公開・merge，layout 改善や個々の deck の視覚的受入れは含めない．

## Consequences

### Positive

* docs-only の重複 XR ID，壊れた frontmatter，参照不整合が自動実行で失敗する．
* ブラウザ導入のない smoke と，全 unit／fixture／browser／D2／ZIP の完全受入れを明確に区別できる．
* dispatch が利用できなくてもレビュー対象の revision で merge 前のローカル完全受入れを実行できる．

### Negative

* docs-only にも uv と固定 Python 依存の準備が必要になる．`test:ci`／unit の記録 fixture は，先に実行した record validator の cache を offline で利用する．
* 自動チェックの成功は full の成功を意味しない．full の実行漏れを自動 job の成功だけでは防げないため，統合時に対象 revision の結果を確認する．

### Neutral

* manual は独立した concurrency group に置き，通常実行との相互 cancel を避ける．
* my-decks PR6 などの downstream には workflow・scripts・回帰テスト・手順をまとめて反映し，downstream 自身の記録と受入れを検証する．共有 patch の先行適用と後の upstream merge を二重に数えない．

## Validation

* 開始 head に CI 回帰テストを先に追加し，記録検証ステップがないことを理由とする失敗を確認した．2026-10-30 の復元時にも21件成功・2件失敗を再確認した．変更後は実 Git repository と workflow の Bash で docs／deck／engine／mixed／workflow，同一 SHA，複数 commit，checkout と event head の違い，base の先行，不足端点の取得，取得・diff 失敗を検証した．
* npm 導入のない一時 repository で正常な記録を通し，重複 `XR-0003`，参照先欠落，壊れた YAML を既存 validator が非ゼロで拒否することを確認した．
* YAML の条件評価で自動／manual の到達性，既存 D2／font の固定値，Chromium／Firefox，strict flags，concurrency を検証した．`ci:full` は各段階の成功と失敗を模擬コマンドで検証した．これらは実ブラウザ／実 D2 を起動した完全受入れではない．
* CI 実装 commit `0cecb0c`：Node 25.6.0／uv 0.13.5 のローカル環境で `test:ci` の9ファイル，CI 回帰24件が成功し，失敗・skip は0件だった．同一 lockfile の既存 node_modules を独立コピーして使用し，新規 `npm ci` はこの限定検証では行っていない．本 ADR を含む72件の記録検証と `git diff --check` も成功した．
* actionlint v1.7.12 で quality-gate と dependency-audit の構文・式を検証し，エラー0件だった．shellcheck／pyflakes は今回の環境にないため，その連携チェックは実施していない．
* `npm run ci:full` と `npm run audit:dependencies` の統合 revision での実行は lead が担当し，この限定検証では未実施である．過去の受入結果を今回の成功として流用しない．

## Related Records

* [ADR-0001](ADR-0001-make-rendered-measurement-the-authority-for-deck-validation.md)：実測を正本とする受入判断は維持する．smoke は実測を代替しない．
* [ADR-0009](ADR-0009-render-d2-fences-with-a-pinned-external-cli.md)：固定 D2 と明示的な font 準備を保持する．
* [ISS-0042](../issues/ISS-0042-track-production-dependency-audit-findings.md)：dependency audit は独立した担当・ゲートとして扱う．
* [CI 手順](../ci.md)：検証範囲，dispatch 不可時の merge 前 full，downstream への反映を定義する．
