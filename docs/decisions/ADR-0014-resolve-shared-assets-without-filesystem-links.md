---
id: ADR-0014
title: "Resolve shared assets without filesystem links"
type: decision
status: accepted
date: "2026-11-04"
authors:
  - codex
scope:
  - shared asset resolution and rendering
tags:
  - portability
depends_on: [ADR-0008]
supersedes: []
issues: []
artifacts:
  revisions: [57683c0]
  manifests: []
  results: []
  commands: []
---

# Resolve shared assets without filesystem links

## Context and Problem Statement

同じ原稿をWindows・macOS・Linuxで扱う際，deck直下のshared symlinkの作成権限とGit checkout形式に依存していた．Windowsの検証用コピーだけをdereferenceしても，原稿の参照，プレビュー，新規作成，配布で必要なリンク条件が一致しない．原稿に深い相対パスを記述させず，共通素材の一元管理を維持する必要がある．

## Decision Drivers

* `shared/...` の短い記法とroot assetsの一元管理を維持する．
* 新規作成・通常利用でOSのsymlink作成を要求しない．
* plain Marp向けに配置した実体sharedを優先し，原稿や素材を自動上書きしない．
* 素材診断・HTTP配信・ファイル変換・一時描画・ZIPで同じ参照先を選ぶ．

## Considered Options

1. OSリンクを標準にする．通常のMarkdownとして使えるが，権限とcheckout形式への依存が残る．
2. `../../assets/...` を原稿へ記述する．追加の解釈は不要だが，deck階層を執筆者へ露出する．
3. sharedをmarpx内の参照名として解決し，実体ディレクトリを優先する．原稿の短い記法を維持し，リンク不要の経路を用意できる．

## Decision Outcome

### Chosen Option

Option 3を採用する．deck直下のsharedディレクトリが存在する場合は全体としてそれを参照し，個々の欠落ファイルをroot assetsで補わない．存在しなければ，元プロジェクトrootのassetsへ解決する．有効な既存ディレクトリリンクも利用できる．Git index modeが120000でcanonical assets targetと一致する通常ファイルだけをcheckout placeholderとして認識する．通常ファイルの内容から任意リンクを推測しない．

### Scope

新しいdeck/paperのscaffoldはsharedリンクを作らない．共通resolverを診断・catalog・ZIPから使う．通常ファイル変換ではHTMLとCSSのshared URLを通常の相対URLへ展開する．HTTP previewとoverviewは選択した素材をshared URLで配信し，要求された素材の更新を検知して再読込する．検証用コピーではvirtual sharedを通常ファイルとして一時配置し，完了・例外時の既存cleanupで削除する．

### Non-goals

素材の所有元は移動しない．個別cross-deckファイルsymlinkの一括置換や，通常HTMLの完全自己完結化は行わない．配布用の自己完結した資源収集は既存ZIP plannerが担当する．

## Consequences

### Positive

* 原稿の記法を維持しながら，OSリンクのないWindows checkoutと新規deckを利用できる．
* 実体sharedを同じフォルダ構成で置けば，元のMarkdownをmarpx以外でも使用できる．
* プレビューと出力の素材選択を共有できる．

### Negative

* virtual sharedを使う原稿の直接描画にはmarpxが必要である．plain Marpでは実体sharedの配置・更新を作者が行う．
* 検証用の一時配置は現在root assetsを再帰コピーするため，未参照の共通素材も対象になる．ZIPは引き続き参照された資源だけを収集する．
* 強制終了では既存のfinallyによる一時ディレクトリ削除が実行されない場合がある．

### Neutral

* project rootは最も近いGit/Jujutsu/config marker，またはdecksとassetsを持つ祖先から決定する．
* 既存sharedの修復・上書き・同期は自動実行しない．

## Validation

unitはvirtual/実体優先，欠落非fallback，Git placeholder，HTTP，staging，HTML/ZIPを検証する．Chromiumで実previewとoverviewの読込・共通素材更新を確認する．専用CIはWindows/macOS/Linuxでリンク不要の経路を実行し，ネイティブリンク作成が許可されない場合はlegacyリンク固有のテストだけを対象外skipとする．検証結果と未実施範囲はPRに記載する．

## Related Records

ADR-0008の共通resolver・素材所有元・参照資源だけのZIPという方針を維持し，sharedディレクトリの参照規則を拡張する．
