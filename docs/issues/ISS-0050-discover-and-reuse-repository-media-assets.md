---
id: ISS-0050
title: "Discover and reuse repository media assets"
type: issue
status: in-progress
date: "2026-10-21"
updated: "2026-10-21"
authors:
  - codex-main-leader
scope:
  - media
tags:
  - feature
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Discover and reuse repository media assets

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/58

## Execution update 2026-10-21

本人がIssueごとのCodex sol maxサブリーダー，Herdr worktreeによる並行開発，Devin・無料OpenCodeの活用を指示した．本ISSを作業の正本とし，以下は起票時に取り込んだGitHub仕様である．本文中の未起票・未実装・過去の権限境界は元の記録時点を表す．
D2を積極的に採用する最新方針を反映し，#61は採用を進める実装対象とする．個々のCLI・公開変数・外部参照仕様の選択は実装根拠と検証を添える．
この記録の作成自体は機能の完了を意味しない．mainへの直接書込・push・merge・GitHubコメント送信は各サブリーダーの担当外とする．

## Coordination

Main coordination branch: coord/issues-53-61-20261021．
GitHub IssueとISSの対応: #53 = ISS-0045，#54 = ISS-0046，#55 = ISS-0047，#56 = ISS-0048，#57 = ISS-0049，#58 = ISS-0050，#59 = ISS-0051，#60 = ISS-0052，#61 = ISS-0053．
#56の診断と#57の比較案は先行可能だが，CSS契約は#55と整合させる．#59は#58の参照解決部分だけを先行依存とし，検索UIの完了待ちにしない．#61は独立着手する．

親計画：#53．デザイン系のIssueとは独立して着手できる．

## Problem

my-decksには，共有assets，デッキ所有ファイル，相対symlink，特定Macへの絶対symlink，同一内容の別ファイルが混在している．
既存規約は「所有元のデッキを残し，利用側にファイル単位の相対symlinkを置く」方式だが，素材の発見，利用箇所の確認，安全なリンク作成は手作業に依存する．
`src/media-assets.js` には原稿参照の抽出と欠落診断がある一方，参照関係を一覧・検索・流用へつなぐ公開操作は今回の調査では確認できていない．

## Goal

必要な素材を見つけ，出典・所有元・使用ページを確認して，既存規約に沿って再利用できるようにする．
新しい必須の手動台帳や外部検索サービスを導入せず，原稿とファイルから得られる情報を優先する．

## 最初の実装範囲

1. 指定repoのデッキ・共有素材を一覧・検索する．パス，形式，サイズ，画像寸法または取得不能理由，内容ハッシュ，参照する原稿とページを表示する．人向け一覧・ローカルのプレビューと，エージェント向けJSONを同じ結果から出せるようにする．動画は軽量なposter等から始め，すべての形式の変換を要求しない．
2. 別名・symlink・実体ファイルの関係を表示する．出典やcaptionが原稿にある場合は元の位置へリンクし，ない情報を推測で補わない．更新追従か固定コピーか，複数の同一ファイルのどちらが所有元かは自動決定しない．
3. 明示的な流用操作で，利用デッキの `assets/img` 等へ名前付きの相対ファイルsymlinkを作成する．source・destination・生成するtargetをdry-runで確認できるようにする．
4. 絶対symlink，リンク切れ，repo外への参照，循環，ディレクトリ単位の流用を診断する．必要な修正と，許容される共有assetsリンクを区別する．
5. ZIP出力と共有できる参照抽出・解決の内部処理を整理する．通常のvalidatorの既存挙動と，配布時の厳格な収集ポリシーは分ける．

## Acceptance criteria

- [ ] deck-local，`shared`，別デッキの相対ファイルリンクを同じ一覧から辿れ，利用原稿・元行・描画ページへ対応付けられる．非表示ページは別表示し，公開ページと混同しない．
- [ ] ファイル名・原稿内のcaption/周辺記述・種類で検索できる．プレビューがなくても一覧とJSONは利用できる．埋め込みモデルやOCRを必須にしない．
- [ ] 同じ内容の候補を表示できるが，自動重複除去，所有元の移動，改名をしない．派生画像と原図は内容一致だけで統合しない．
- [ ] 一覧・検索・診断では原稿と素材を変更しない．生成preview/cacheは既存の一時出力規則に従い，Git管理対象へ無断追加しない．
- [ ] 流用操作はrepo内の既知のファイルだけを対象とし，相対symlinkのtargetを検証する．同名の既存ファイル・リンクを黙って上書きしない．
- [ ] 日本語・空白・URLエンコードされたファイル名，親ディレクトリのsymlink，欠落，循環，repo外参照をテストする．エラーは参照元と修正対象を識別できる．
- [ ] Windows等でsymlinkの作成・checkoutが利用できない場合は明確に報告し，黙って複製へ切り替えない．配布用ZIPの通常ファイル化とは区別する．
- [ ] 元ファイルを変更・削除する前に利用先を一覧でき，READMEとagent向けmedia referenceに安全な操作例がある．
- [ ] my-decksの個別リンク修正はmy-decks側のIssueで扱い，本Issueだけを根拠に元素材を移動しない．

## 対象外

全素材の中央移管，自動所有元決定，自動出典推論，類似画像の自動統合，外部クラウド素材管理は対象外．
`assets list/search/reuse/doctor` 等のCLI名は説明用の候補であり，既存CLIの引数設計に合わせて実装時に確定する．

## 入口と依存関係

`src/media-assets.js`，`src/markdown-source.js`，`src/slide-map.js`，`bin/marpx.js`，`tests/unit/media-assets.test.js`，`.agents/skills/marp-components/references/media.md`，AGENTS.mdのShared Media．
先に参照解決と診断を小さく実装し，一覧・流用操作を追加できるようにする．ZIPはその内部処理を共有するが，検索UI完成まで待つ必要はない．

## 根拠

- [現行参照抽出・欠落診断](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/src/media-assets.js)．既に存在する欠落検査を新規機能として重複実装しない．
- [所有権規約](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/AGENTS.md)．
- my-decks `c7d1b4523375c35b42d12f7b84533fd0aa407bdb` の[利用確認](https://github.com/takumi-nishimura/MarpAgent/pull/52#issuecomment-6251211532)．同一blobと絶対リンクの観測は，修正許可・所有元の採用とは別である．
- 具体的なデータ構造と操作仕様は#53の方向性を詳細化した未実装案である．

## 正本記録

repo内ISSは未起票．実装開始時に既存記録を照合し，記録CLIで作成・validateし，本Issueへ正本をリンクする．素材台帳schema等に実質的な選択が生じた場合だけ，proposed ADRへ分離する．
