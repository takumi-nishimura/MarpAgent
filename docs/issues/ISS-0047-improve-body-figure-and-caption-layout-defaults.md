---
id: ISS-0047
title: "Improve body figure and caption layout defaults"
type: issue
status: in-progress
date: "2026-10-21"
updated: "2026-10-21"
authors:
  - codex-main-leader
scope:
  - themes
tags:
  - feature
depends_on: ["ISS-0046"]
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Improve body figure and caption layout defaults

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/55

## Execution update 2026-10-21

本人がIssueごとのCodex sol maxサブリーダー，Herdr worktreeによる並行開発，Devin・無料OpenCodeの活用を指示した．本ISSを作業の正本とし，以下は起票時に取り込んだGitHub仕様である．本文中の未起票・未実装・過去の権限境界は元の記録時点を表す．
D2を積極的に採用する最新方針を反映し，#61は採用を進める実装対象とする．個々のCLI・公開変数・外部参照仕様の選択は実装根拠と検証を添える．
この記録の作成自体は機能の完了を意味しない．mainへの直接書込・push・merge・GitHubコメント送信は各サブリーダーの担当外とする．

## Coordination

Main coordination branch: coord/issues-53-61-20261021．
GitHub IssueとISSの対応: #53 = ISS-0045，#54 = ISS-0046，#55 = ISS-0047，#56 = ISS-0048，#57 = ISS-0049，#58 = ISS-0050，#59 = ISS-0051，#60 = ISS-0052，#61 = ISS-0053．
#56の診断と#57の比較案は先行可能だが，CSS契約は#55と整合させる．#59は#58の参照解決部分だけを先行依存とし，検索UIの完了待ちにしない．#61は独立着手する．

親計画：#53．基準例と比較方法：#54．

## Problem

my-decksでは，図の中央揃えや列幅に対して `display:flex`，`align-items`，`justify-content`，`max-height` 等の個別指定が繰り返される．
一方，`.box.fill.place-middle.place-center` だけで成立する図中心ページもあり，共通部品の使い方と実際の収まりに差がある．
共通CSSにはヘッダー後や表紙の固定余白もあるため，見出し・図・キャプションの条件が変わるたびに座標合わせを加えるのではなく，標準部品の領域計算を明確にしたい．
これは静的な原稿確認に基づく問題設定であり，個々の調整が不要であると実測したわけではない．

## Goal

標準部品を選んだ通常のページでは，本文領域・図・説明が自然に収まり，例外時も列比率・間隔・整列・図領域などの少数の指定で調整できるようにする．
構図は原稿に明示し，エージェントが描画確認後に変更する．CSSや実行時コードで左右・上下を自動切替しない．

## 変更範囲の案

1. ヘッダー，見出し，本文，脚注・ページ番号の領域契約を整理する．ヘッダー有無，複数行見出し，見出しが列内にあるケースを区別し，残り高さを明示的なbody-level wrapperで扱う．現行 `.fill` を優先的に改善する．
2. `figure` を画像・動画・SVGとキャプションの組として扱い，キャプションの高さを確保した残りへメディアを収める．メディアの縦横比を保ち，複数メディアの縦積みでも説明が押し出されないようにする．
3. `.col`，`.col.visual`，`.box`，`.fill`，`.place-*` の対応範囲を整理する．列比率，内部整列，ギャップを別々に指定できるようにし，同じ意図の指定を複数箇所へ重ねる必要を減らす．
4. 例外は，既存のCSS変数または整合する少数の調整点で扱う．クラス名・変数名の最終決定は実装案でレビューし，旧指定を無断で削除しない．

## Acceptance criteria

- [ ] #54の図中心，不均等二列，図の縦積み，結果図と補足の標準例が，座標合わせ，空div，位置補正transform，ページ固有のCSSルールなしで成立する．必要な構図・列比率の明示は許容する．
- [ ] 見出しまたはキャプションが一行増える境界例で，図との重なりや脚注への侵入を起こさない．内容量が本当に収まらない例では明確に診断し，隠したり文字を縮めたりしない．
- [ ] メディアは縦横比を保つ．既定ではcropしない．意図して指定されたcropや図の表示範囲は保持する．
- [ ] 幅・高さ・キャプション込みの制約が干渉する例の調整手順を文書化する．「高さ100%にはどの親領域が必要か」などの前提を示す．
- [ ] 列の上端・中央・下端揃えと，図と説明の組が，指定どおり描画されることをブラウザで測る．HTML/画像/PDFの同じ内容でも確認する．
- [ ] 既存lab/muji/toshiba，16:9・4:3，paper・opt-in scroll・表紙の既存テストを確認する．共通CSSの変更が意図的な既存配置へ与える差を列挙する．
- [ ] 旧原稿で実質的な見た目の変更が必要な場合は，互換動作または明示選択と移行例を提示し，元デッキを一括書換えしない．
- [ ] 標準例の個別指定が減り，例外の調整手順が短く明確になったことを，原稿差分と描画で示す．指定数の削減だけを合格理由にしない．

## 対象外

構図の自動探索，テーマ連動の構図変更，本文の自動削除，文字縮小，無断crop，スクロールによる自動修復，Pele導入は対象外．
図の内容を読んで最適な配置を保証するものではない．

## 実装の入口

`themes/src/_shared/_base.css`，`_layouts.css`，`_paper.css`，`_scroll.css`，`docs/theme-contract.md`，配置・メディアのskill references，`tests/e2e/composition-utilities.spec.js`．
CSSの標準動作をこのIssue，利用可能なTailwind語彙と診断を別Issueで扱う．同じプロパティの設計を二重に進めないよう，共通の配置契約を先に決める．

## 根拠

- [上流の共通配置CSS](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/themes/src/_shared/_layouts.css)と[base](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/themes/src/_shared/_base.css)．
- [6月22日原稿](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/06-22-lab-seminar/slide.md)，[7月13日原稿](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/07-13-lab-seminar-fuzzy-dpt/slide.md)，[8月24日原稿](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/08-24-toshiba-research-introduction/slide.md)．元内容・素材は移管しない．
- 本人の方針と未採用案の区別は#53を参照する．実装・描画比較は未実施．

## 正本記録

repo内ISSは未起票．実装開始時に現行記録を照合し，記録CLIで作成・validateし，本Issueと相互参照する．公開CSS契約の実質的な選択は必要に応じてproposed ADRへ分離する．
