---
id: ADR-0008
title: "Share media resolution and export resource-only portable ZIP bundles"
type: decision
status: proposed
date: "2026-10-21"
authors: [codex-main]
scope: ["media","exports"]
tags: [integration]
depends_on: []
supersedes: []
issues: ["ISS-0050","ISS-0051"]
artifacts:
  revisions: ["b7fa592","9db4a7a","47d06ec"]
  manifests: []
  results: ["docs/media-reference-api.md","docs/media-assets.md"]
  commands: []
---

# Share media resolution and export resource-only portable ZIP bundles

## Context and Problem Statement

デッキに散在する素材の所有元と使用箇所を調べ，相対ファイルsymlinkで再利用し，最終HTMLを別の場所へ配布したい．原稿用の参照検出だけではCSS/SVG内の資源を収集できず，デッキ全体のコピーでは制作資料まで配布するおそれがある．

## Decision Drivers

所有元を自動移動しない．検索・診断は原稿を書き換えず，流用は明示した単一素材だけを非上書きで作成する．ZIPはrepo内の必要資源に限定し，公開成果物へ絶対パスや原稿周辺の制作情報を持ち出さない．失敗時は入力と既存出力を保つ．

## Considered Options

1. デッキディレクトリを丸ごと圧縮する．簡単だが不要な原稿・ノート・private素材を含める．
2. 原稿の参照だけから収集する．CSS/SVGの推移的依存と最終描画で除外したhidden資源の扱いが不十分になる．
3. 共有resolverの上に検索・流用と最終HTML用plannerを分ける．目的別policyと推移的収集を維持できる．

## Decision Outcome

共有media-reference-graph APIを採用し，通常validationのpermissiveとbundle用policyを明示して使い分ける．resolverの内部path/origin/contextは公開manifestでは選別・相対化する．索引とZIPのprivate除外は解決後の実体も確認する．

ZIPは共通engineのHTMLを一度生成し，HTML/CSS/SVGから必要資源を収集・書換え，通常ファイルのみのarchiveへ固定する．remote依存は取得せず報告し，strict-offlineでは失敗にする．dry-runは計画を返し，writerは検査済み計画を一時出力から確定する．D2の失敗検査も同じHTMLを使う．

## Consequences

元repoやsymlinkを持たない閲覧先へ移せる．動的な任意JavaScriptやremote資源の自動収集は扱わない．既定上限と明示上限を設けたメモリ内圧縮であり，無制限の大規模配布用途には適さない．resolver結果は安全な読取りhandleではなく，ZIPの実読取り境界でも検査が必要である．

## Validation

resolverの限定レビューでは明示bundle policyと固定POSIX treeで包含bypassは見つからず，関連24件と追加境界8件を確認した．ZIPの移設・通信遮断，private実体，manifest，競合交換，archive entryと出力保持はISS-0051とmain統合検証で追跡する．Windows実機は未検証であり，Windows互換のentry検査と区別する．

## Related Records

ISS-0050とISS-0051を追跡する．D2の生成図と失敗伝達の境界はADR-0009に記録する．
