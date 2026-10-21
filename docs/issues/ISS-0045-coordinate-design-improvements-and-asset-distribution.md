---
id: ISS-0045
title: "Coordinate design improvements and asset distribution"
type: issue
status: in-review
date: "2026-10-21"
updated: "2026-10-21"
authors:
  - codex-main-leader
  - marp-i53-lead
scope:
  - coordination
tags:
  - docs
depends_on:
  - ISS-0046
  - ISS-0047
  - ISS-0048
  - ISS-0049
  - ISS-0050
  - ISS-0051
  - ISS-0053
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - uv run .github/records.py validate
---

# Coordinate design improvements and asset distribution

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/53

## 現在の説明

**変更前の問題**：配置，外観，素材管理，配布，D2を同時に変更すると，同じCSSやCLIを複数担当が書き換え，単独では動いても組合せで壊れるおそれがある．このISSは，全体の実装境界と受け入れを管理する親作業である．

**実装したこと**：GitHub #53〜#61ごとにCodex sol max担当とHerdr worktreeを割り当て，配置系列，素材・ZIP系列，D2，プレビューを並行開発した．main leaderが.bodyの公開変数，素材参照の共通API，D2失敗をZIPへ伝えるAPIを調整し，論理commitを統合した．

**使い方・確認先**：成果物の入口は[統合計画](../design-assets-integration.md)．子ISSの説明，利用方法，比較画像，実行コマンドへ辿れる．利用者が個々の担当ログを読み合わせなくても，実装と残る条件を区別できる構成にする．

**確認したこと**：最終コードbe3fc23でunit504件，strict fixture18件，browser113件が成功した．browserの既存対象外1件はskip．固定D2実CLI7件とD2入りZIP2件も成功し，記録66件を検証した．

**残る条件・対象外**：最新方針は「GitHubにPRを作り，レビューはローカルで済ませる」．既存の担当レビュー・mainの差分確認・回帰試験を再利用し，GitHub上のレビュー承認は完了条件にしない．#55の一般的な指定数削減は未立証で，独立再レビューの一部が未実施だった事実も残す．親の閉鎖とmergeは別に判断する．

実装は統合ブランチに取り込み済みで，状態はin-reviewを維持する．レビューはローカルで行い，GitHubのPRには変更と検証結果を提示する．以下のcheckpointや起票時仕様は，その時点の履歴として読む．

## Execution update 2026-10-21

本人がIssueごとのCodex sol maxサブリーダー，Herdr worktreeによる並行開発，Devin・無料OpenCodeの活用を指示した．本ISSを作業の正本とし，以下は起票時に取り込んだGitHub仕様である．本文中の未起票・未実装・過去の権限境界は元の記録時点を表す．
D2を積極的に採用する最新方針を反映し，#61は採用を進める実装対象とする．個々のCLI・公開変数・外部参照仕様の選択は実装根拠と検証を添える．
この記録の作成自体は機能の完了を意味しない．mainへの直接書込・push・merge・GitHubコメント送信は各サブリーダーの担当外とする．

## Coordination

Main coordination branch: coord/issues-53-61-20261021．
GitHub IssueとISSの対応: #53 = ISS-0045，#54 = ISS-0046，#55 = ISS-0047，#56 = ISS-0048，#57 = ISS-0049，#58 = ISS-0050，#59 = ISS-0051，#60 = ISS-0052，#61 = ISS-0053．
#56の診断と#57の比較案は先行可能だが，CSS契約は#55と整合させる．#59は#58の参照解決部分だけを先行依存とし，検索UIの完了待ちにしない．#61は独立着手する．

## Notes

2026-10-21の依存関係・受け入れ追跡は[デザイン・アセット・D2の統合文書](../design-assets-integration.md)で管理する．基準revisionは`1711332cdf3fcd30182dba16e9b5b4cb77324837`．取り込み済み`issues.json`のPR #52コメント3件と#53コメント3件，子ISSと共有COORDINATIONを照合し，観測・本人方針・助手の設計案を区別した．過去コメントは書き換えない．

初回checkpointとして，#55/#56/#57のCSS競合，#58 resolver→#59 ZIPの境界，#61のMermaid専用selector拡張と共通engine接続をmain向け端末応答で共有した．続くmain更新で#55の`.body`契約案と#59のplan/write API案を受領し，追跡文書へ反映した．checkpoint提出・検証報告・mainによる機能受け入れを分け，文書整備を実装の待ち条件にはしない．

親の`depends_on`は#54〜#59と，今回採用を進める#61の統合確認を表す．#60は独立した隣接修正として追跡し，my-decks #2は別repo所有を維持する．親は`in-progress`を維持し，子の実装・検証とmainの統合受け入れが揃うまで閉じない．

担当変更は本追跡文書と本ISSに限定する．production code，peer ISS，既存ADR/XRは変更しない．必要な採用記録は，D2の実行・外部参照境界，公開CSS契約，ZIP配布ポリシー等の実装判断が揃った時点でmainが中央で採番する候補とし，本作業では新IDの割当やADRのaccepted化を行わない．ZIPのprivacy/pathとD2のsubprocess/SVGの限定レビューは，mainから割り当てられた場合に実施する．

文書検証：`uv run .github/records.py validate`で61件成功．Nodeによる本書と追跡文書のローカルリンク検査は10件中欠落0件，`git diff --check`も成功した．補助モデルは使用していない．機能テスト・実描画・ZIP展開・D2実行は本担当では未実施であり，子の検証報告とmainの受け入れを待つ．

## Problem

GitHub上の改善計画に対し，repo内の作業記録と並行実装の管理が必要である．

## Goal

各子Issueの実装境界・依存関係・検証結果を追跡し，改善効果と配布機能を確認できる状態にする．

## 目的

デザイン改善を，実装ごとに参照できる作業へ分割して追跡する．
目標は，標準的なページでは個別調整を必要とせず，必要な場合も少数の意図が分かる指定で調整できることである．
このIssueは実装計画の入口であり，機能の実装完了や，以下の詳細設計の採用を意味しない．

## 本人が示した方向性

- 構図は各スライドで決め，エージェントが描画を確認して調整する．テーマによる構図変更や自動構図切替は求めない．
- 色付き太字とマーカーを維持する．Peleは現時点では導入しない．
- 個別調整が必要になる場面を減らし，例外の調整も容易にする．
- 必要なアセットを集めてZIPとして出力する機能を改善候補に含める．
- 今回の方向性を詳細化してGitHub Issueへ登録し，今後の実装で参照する．

ZIPの具体的なCLI名，収集方式，CSSクラス名，実装順序は助手による設計案であり，本人が個々の仕様を採用済みとは扱わない．

## 分割する作業

1. 実デッキ由来の回帰例と，調整量を比較できる評価・レビュー手順．
2. 本文の残り領域，図とキャプション，列幅・整列の標準動作改善．
3. Tailwindの調整語彙，上書き規則，未定義指定の診断．
4. 構図を変えず，色付き太字・マーカーを維持したlabの外観改善．
5. アセットの一覧・検索・参照診断と，相対ファイルリンクによる流用支援．
6. 対象デッキのHTMLと必要アセットを収集するZIP出力．
7. my-decks固有の絶対symlinkの移植性修正．この作業の所有先はmy-decksとする．

子IssueのURLと依存関係は，登録後の追跡コメントにまとめる．

## 共通の実装境界

- テーマは外観，slide.mdは構図，共通部品は決めた構図内の寸法・整列，エージェントは意味を踏まえた修正を担当する．
- 自動的な左右・上下の切替，内容削除，無断crop，文字の際限ない縮小，スクロール追加で収まりを解決しない．既存の明示的な調整・crop・scrollを一律に取り除くこともしない．
- 特定のカード数・箇条書き数・レイアウト種類数を目標にしない．原稿の短さを可読性より優先しない．
- ADR-0002/0003の制作手順と明示生成の境界を出発点にする．全面的なCSSレイヤー変更やデッキ別Tailwind生成へ無断で切り替えない．
- 見本は汎用化した素材で作り，my-decksの研究内容・写真・未公開素材をMarpAgentへ無断転記しない．元デッキの原文と素材所有権を保つ．
- 実装時には両repoの最新main・AGENTS.md・記録規約・関連PRを再確認する．mainへの直接書込，force push，merge/pullを本Issueから許可されたと解釈しない．

## Acceptance criteria

- [x] 各子Issueに，現状の根拠，変更範囲，対象外，検証可能な完了条件，関連ファイルと依存関係がある．
- [x] 標準ケースの調整量と例外時の指定手順を，変更前後の原稿と描画で比較できる．必要な留保・出典・図内可読性は別に確認する．
- [x] テーマと配置の変更を一度に混ぜず，効果・回帰を個別に判定する．
- [x] ZIPは収集範囲と外部依存を説明でき，欠落や危険な参照を隠したまま配布成功としない．
- [x] 最新方針に基づくD2コードブロック描画を#61で実装・検証し，共通engine，失敗伝達，既存Mermaidの回帰，配布物の閲覧をmainが統合確認する．
- [ ] 各作業の実装・検証・レビューを子Issueで確認した後に，親Issueの完了を判断する．Issue登録だけでは機能完了にしない．

## 記録の扱い

本登録ではGitHubが割り当てるIssue番号を使用し，repo内のISS/ADR番号は手で割り当てない．
この実行環境ではGitHubのファイルをcontainerへ取得する経路が使えず，記録CLIによる起票・全件検証は未実施である．
実装を始める際には，既存の同義記録を照合し，未作成なら `.github/records.py new issue` で正本ISSを作り，本Issueと相互に参照する．
詳細設計上の代替案を選ぶ場合は，必要なproposed ADRを別に作り，既存ADRを自動でaccepted化・置換しない．
今回の前提と採用範囲のproposed ADR候補は，既存のDraft PR #52の議論から確認できる．

## 根拠と出典

- [調査と追加議論のDraft PR #52](https://github.com/takumi-nishimura/MarpAgent/pull/52)．特に[利用確認と本人の方針](https://github.com/takumi-nishimura/MarpAgent/pull/52#issuecomment-6251211532)．
- 調査基準：MarpAgent `74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16`，my-decks `c7d1b4523375c35b42d12f7b84533fd0aa407bdb`．今回再確認したmainは同じSHAだった．
- [AGENTS.md](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/AGENTS.md)，[記録規約](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/docs/records/README.md)．
- [参考スライド](https://www.slideshare.net/slideshow/ss-41321443/41321443)，[当初の参考記事](https://note.com/sust_science/n/n8399bda76d71)．デザイン原則の参考であり，効果の実証として扱わない．
- 今回の出典発言：本会話の「個別の調整が，必要になる場面が少なく，あったとしてもしやすくなると良いな．」「必要なアセットを収集してzipで出力する機能」「より詳細を詰めて，GitHubのイシューに登録してください．」．会話URL・conversation/turn/message IDと正確な発言時刻は取得していない．

## Main integration checkpoint 2026-10-21

main leaderが8機能担当のcommitted変更を統合し，配置・素材・D2の共有境界を接続した．全体strict gateの初回結果はunit493件・browser111件成功，既存Firefox native touch1件は対象外skip．固定D2実CLI6件とD2入りZIP2件も成功した．比較画像・条件・hash・harness，ADR-0007〜0009とXR-0003〜0004を保存し，記録66件を検証した．

D2の限定確認で得た3指摘の修正と最終統合検査を追跡文書で管理する．機能のローカル検証とGitHubへの公開を区別し，親・子はin-reviewに揃えた．GitHubのIssue閉鎖・push・PR・mergeは実施していない．

## Main final integration 2026-10-21

最終コードbe3fc23でmainがstrict gate（unit504件，fixture18件，browser113件成功，既存Firefox対象外1件skip），固定D2実CLI7件，D2入りZIP2件を実行し，失敗なしを確認した．条件と限定確認の範囲は[統合記録](../design-assets-integration.md)を参照する．ローカル統合の受け入れと公開レビューを区別し，状態はin-reviewを維持する．
D2の3指摘は5f7d501／5699ea4／d7d077dで解消し，mainが差分と回帰試験を確認した．独立した修正後レビューはサービス応答制限で未完了．#55の一般的な指定数削減と#57のPR添付条件を達成扱いにせず，親の最終閉鎖条件は未チェックで保持する．

## PR publication 2026-10-21

本人の最新方針に従い，[Draft PR #62](https://github.com/takumi-nishimura/MarpAgent/pull/62)を作成した．レビューはローカルで行い，既存の担当確認・mainの差分確認・回帰試験を根拠とする．GitHubのreviewerは指定せず，mergeとIssue閉鎖は実施していない．各子ISSへ問題・実装・使い方・検証・対象外の説明を追記し，records66件とリンク67箇所を検証した．#55の一般的な指定数削減と，別PR #52のXR-0003との採番整合を残る条件として明記した．
