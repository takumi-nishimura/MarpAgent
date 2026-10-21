---
id: ISS-0050
title: "Discover and reuse repository media assets"
type: issue
status: closed
resolution: completed
resolved: "2026-10-21"
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

## 現在の説明

**変更前の問題**：デッキごとにある画像や動画，共有assets，別デッキへのリンクが混在し，使いたい素材や現在の利用先を探し，相対リンクを作る作業が手作業だった．

**実装したこと**：assets list/search/doctor/reuseを追加した．素材の種類・寸法・hash，参照原稿・元行・表示ページ，captionなどを一覧・検索できる．同じ実体への別名と，同一内容の別ファイルを区別し，指定した素材だけを利用デッキ内の相対ファイルsymlinkとして流用する．

**使い方・確認先**：npm run marpx -- assets search "測定装置" --repo /path/to/my-decks --previewで候補を確認し，assets list --usesで利用先を調べる．reuseは--dry-runでsource・destination・相対targetを確認できる．正確な引数例は[素材操作ガイド](../media-assets.md)を参照する．

**確認したこと**：共有・デッキ内・別デッキ素材，日本語や空白のパス，リンクの欠落・循環・repo外参照，private除外，previewの通信禁止，既存リンクの非上書きを試験した．#59と共通のresolverを使い，mainの統合gateも成功した．

**残る条件・対象外**：素材の内容から意味検索するAIやOCRは導入していない．出典が原稿にない場合に推測して補わず，同一内容候補の自動削除や所有元の移動もしない．Windowsでsymlinkを利用できない場合は診断し，コピーへ自動変更しない．my-decks内の既存リンク修正は別repoの作業として残る．

実装とローカルレビューを完了し，PR #62の統合対象として受け入れた．状態はclosed／completedとする．GitHub IssueはPRのmerge時に閉じる．以下のcheckpointや起票時仕様は，その時点の履歴として読む．

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

- [x] deck-local，`shared`，別デッキの相対ファイルリンクを同じ一覧から辿れ，利用原稿・元行・描画ページへ対応付けられる．非表示ページは別表示し，公開ページと混同しない．
- [x] ファイル名・原稿内のcaption/周辺記述・種類で検索できる．プレビューがなくても一覧とJSONは利用できる．埋め込みモデルやOCRを必須にしない．
- [x] 同じ内容の候補を表示できるが，自動重複除去，所有元の移動，改名をしない．派生画像と原図は内容一致だけで統合しない．
- [x] 一覧・検索・診断では原稿と素材を変更しない．生成preview/cacheは既存の一時出力規則に従い，Git管理対象へ無断追加しない．
- [x] 流用操作はrepo内の既知のファイルだけを対象とし，相対symlinkのtargetを検証する．同名の既存ファイル・リンクを黙って上書きしない．
- [x] 日本語・空白・URLエンコードされたファイル名，親ディレクトリのsymlink，欠落，循環，repo外参照をテストする．エラーは参照元と修正対象を識別できる．
- [x] Windows等でsymlinkの作成・checkoutが利用できない場合は明確に報告し，黙って複製へ切り替えない．配布用ZIPの通常ファイル化とは区別する．
- [x] 元ファイルを変更・削除する前に利用先を一覧でき，READMEとagent向けmedia referenceに安全な操作例がある．
- [x] my-decksの個別リンク修正はmy-decks側のIssueで扱い，本Issueだけを根拠に元素材を移動しない．

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

## Implementation checkpoint 2026-10-21

#59 が検索UIに依存せず利用できる共通APIを `src/media-reference-graph.js` に先行実装した．export，データ形式，policy境界は `docs/media-reference-api.md` に記載した．原稿抽出は既存 `src/media-assets.js` を再利用し，frontmatterを含む抽出入口を追加した．CSS URL の原稿位置は元のHTML位置へ対応付ける．

`collectDeckReferences` は元行・Markdown slide・描画順・表示page・hiddenを保持する．`resolveAssetReference` / `inspectAssetPath` はrepo実体の包含，親を含むsymlink，欠落・循環，絶対リンク，別ディレクトリ単位の流用を診断する．permissiveとbundleを分け，通常validatorの `findMissingAssets` は変更していない．状態はsafe / unsafe / missingと非ローカルkindで識別できる．この検査後に内容を読む処理のファイル交換対策はbundle側の責務とした．

テストは一時的な一般fixtureのみを使用し，実デッキや個人素材を変更していない．`node --test tests/unit/media-reference-graph.test.js tests/unit/media-assets.test.js tests/unit/markdown-source.test.js tests/unit/slide-map.test.js` は4ファイル通過した．`opencode/glm-5.3-flash-free` に180秒上限・読み取り専用で境界テスト案を依頼し，返却案を既存規約と照合した．相対ファイル流用を拒否する案や所有元の選定など，規約に反する提案は採用していない．

一覧・検索・メタデータ・preview・明示的流用・CLI・利用例は後続実装であり，本checkpointはIssue全体の完了を意味しない．bin/marpx.jsはmainの調整対象としてこの段階では変更していない．API採用判断のADRが必要であれば，並行ID採番を避けてmainで作成する．

## Local implementation completed 2026-10-21

一覧・検索・metadata・alias/同一hash候補・ローカルpreview・明示的reuse・CLI・README/agent向け利用例まで実装した．`marpx assets list/search/doctor/reuse` と `node scripts/media-assets.js` が同じ結果とpolicyを用いる．bin/marpx.jsへの追加はassets用dispatchとhelpの10行に限定した．mainが#59 ZIP / #61 D2の変更と統合する．通常validatorのpermissive挙動は変更していない．

catalogは `src/media-catalog.js`，metadataは `src/media-metadata.js`，private/ignore判定は `src/media-visibility.js`，流用は `src/media-reuse.js`，CLIは `src/assets-cli.js` に分離した．API契約は `docs/media-reference-api.md`，利用例は `docs/media-assets.md` に記載した．画像headerから寸法を得て，非対応形式も理由・bytes・SHA256とともに一覧へ残す．同一実体と同一hashの別実体を区別し，配置以外の所有元を決定しない．

private・隠し・Git ignore対象と，それらを指すsymlinkを既定で除外する．原稿context経由のprivate caption混入も保守的に伏せ，hidden参照を表示しない場合もprivacy判定には含める．外部実体や絶対targetは出力で伏せる．ディレクトリsymlinkはrepo直下のassets/decksを含めて展開せず，外部ディレクトリ名も列挙しない．Git symlinkが通常ファイルとしてcheckoutされた場合は `symlink-checkout` と診断する．Git管理でない場所のignoreSourceはpath-onlyとなる．この方針は本文・画像内容から機密性を推測する仕組みではない．

reuseは既知の安全なsourceを利用者が選び，source/destination/relative targetをdry-runで確認できる．既存ファイルとdangling linkを上書きせず，destination親symlink・repo外経路・sourceの交換を拒否する．symlink不能時のコピーfallbackは行わず，失敗時は新規の空ディレクトリだけを片付ける．日本語・空白・URL encodeしたMarkdown referenceと，既存の安全なfile alias経由の流用を確認した．my-decksを含む実素材の修正・移動・削除は行っていない．

### Validation

```bash
node --test tests/unit/assets-cli.test.js tests/unit/cli-args.test.js tests/unit/media-catalog.test.js tests/unit/media-metadata.test.js tests/unit/media-reuse.test.js tests/unit/media-reference-graph.test.js tests/unit/media-assets.test.js tests/unit/markdown-source.test.js tests/unit/slide-map.test.js
node_modules/.bin/prettier --check src/assets-cli.js src/media-catalog.js src/media-visibility.js src/media-metadata.js src/media-reuse.js src/media-reference-graph.js scripts/media-assets.js tests/unit/assets-cli.test.js tests/unit/media-catalog.test.js tests/unit/media-metadata.test.js tests/unit/media-reuse.test.js tests/unit/media-reference-graph.test.js docs/media-assets.md docs/media-reference-api.md
uv run .github/records.py validate
git diff --check
```

上記Node検証は75 passed，0 failed，0 skipped．formatチェックも通過した．元のMarkdown抽出・slide map・CLI引数の回帰を含む．Windows実機は未検証で，作成権限不足はEPERMを返すfilesystem境界で確認し，checkout問題はGit index mode 120000と通常ファイルの一時fixtureで確認した．

一般fixtureだけを使うChromiumのローカルpreview確認を，`flock /tmp/marpagent-parallel-20261021/browser-tests.lock` 下で実行した．画像のnaturalWidth=120，script実行なし，外部HTTP(S)request=0を確認し，画面も検査した．previewとscreenshotはsystem temporary directoryのみへ出力した．

補助は `opencode/glm-5.3-flash-free` の読み取り専用テスト案を利用した．metadata実装を `devin --model fusion-gpt-6-1-sol-xhigh-sidekick-swe-2-high --sandbox` に180秒上限で依頼したが，bubblewrap未導入で起動前に終了した．sandboxを解除せず，自分で実装・テストを完了した．workerによるpatchはない．

mainから，#53の共通resolver限定レビューは固定POSIX tree・明示bundle policyの包含に不具合なしとの結果を受領した．この結果を再利用し，通常permissive既定・private除外・内容読取時のTOCTOUは呼出側責務という境界を維持した．catalog/reuseの追加分は自分で差分と関連チェックを確認した．Issueはlocal implementation完了・main統合確認待ちとしてin-reviewとし，mainのfull strict gateとmergeは未実施である．

## Local acceptance for PR #62 integration 2026-10-21

本人の統合作業指示を受け，既存の担当・mainのローカルレビュー結果と，修正版fflateを含むコード`0dc6a34`の全体検証を確認した．unit504件，strict fixture18件，browser119件成功＋既存Firefox対象外1件skip，固定D2実CLI7件とD2入りZIP2件が成功した．条件とログhashは[最終統合検証](../evidence/integration-2026-10-21/premerge-validation.json)を参照する．本ISSの受入条件は完了として閉じる．#55の一般的な指定数削減はこの完了判定に含めず，ISS-0047と親ISS-0045で継続する．
