---
id: ISS-0049
title: "Refine lab typography and visual hierarchy"
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
  results:
    - docs/lab-refinement.md
  commands:
    - npm run marpx -- --theme lab
    - npm run design:lint
    - npm run design:tokens:check
    - node --test tests/unit/theme-css.test.js tests/unit/design-cli.test.js
    - flock /tmp/marpagent-parallel-20261021/browser-tests.lock node_modules/.bin/playwright test tests/e2e/lab-refinement.spec.js --project chromium --workers 1
    - flock /tmp/marpagent-parallel-20261021/browser-tests.lock node /tmp/marp-i57-compare.cjs /tmp/marp-i57-review-v2-20261021
    - flock /tmp/marpagent-parallel-20261021/browser-tests.lock node /tmp/marp-i57-strict.cjs
    - uv run .github/records.py validate
---

# Refine lab typography and visual hierarchy

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/57

## Execution update 2026-10-21

本人がIssueごとのCodex sol maxサブリーダー，Herdr worktreeによる並行開発，Devin・無料OpenCodeの活用を指示した．本ISSを作業の正本とし，以下は起票時に取り込んだGitHub仕様である．本文中の未起票・未実装・過去の権限境界は元の記録時点を表す．
D2を積極的に採用する最新方針を反映し，#61は採用を進める実装対象とする．個々のCLI・公開変数・外部参照仕様の選択は実装根拠と検証を添える．
この記録の作成自体は機能の完了を意味しない．mainへの直接書込・push・merge・GitHubコメント送信は各サブリーダーの担当外とする．

## Coordination

Main coordination branch: coord/issues-53-61-20261021．
GitHub IssueとISSの対応: #53 = ISS-0045，#54 = ISS-0046，#55 = ISS-0047，#56 = ISS-0048，#57 = ISS-0049，#58 = ISS-0050，#59 = ISS-0051，#60 = ISS-0052，#61 = ISS-0053．
#56の診断と#57の比較案は先行可能だが，CSS契約は#55と整合させる．#59は#58の参照解決部分だけを先行依存とし，検索UIの完了待ちにしない．#61は独立着手する．

親計画：#53．評価例：#54．配置契約：#55，調整指定：#56．

## Problem

labでは共通base/typographyに本文・見出し・余白の値が分散し，強調は `strong` の色とweight，`em` のマーカー背景で表現される．
my-decksではこれを基礎に，本文サイズ，見出し位置，補足欄，キャプション等を調整している．
本人はlabの改良余地を認識しているが，色付き太字とマーカーを好んでおり，構図をテーマで変更することは求めていない．

## Goal

既存の強調記法とページの構図を保ち，通常の文章・図表で標準の外観を使いやすくする．
テーマ差を配色だけに限定する必要はないが，テーマの変更を左右・上下の構図変更には結び付けない．

## 変更範囲の案

- 本文，見出し，キャプション，脚注の文字階層，行間と標準余白をDESIGN.mdの設定へ整理し，どの値が描画へ反映されるかを追跡可能にする．
- `**…**` の色付き太字，`*…*` / `_…_` のマーカー表現と既存 `.marker` / `mark` を，現在の意味を保ったまま確認する．太さ，強調色，マーカーの位置・濃さ・複数行時の見え方を調整対象とする．
- テーマ所有の表，罫線，図の説明，補足欄の外観を揃える．研究結果画像や外部図の色を自動的に変更しない．
- 表紙・通常本文・図中心・比較表の同じ内容と構図で新旧を比べる．見た目を良くするために内容や留保を削らない．
- 改良版の公開方法は比較可能なPRで提案する．既存labの既定値変更，明示選択での段階移行のどちらにするかを，互換性差分を見てレビューする．

## Acceptance criteria

- [ ] labで色付き太字とマーカーが維持され，無彩色の太字への一括置換や強調の削除がない．既存原稿の記法変更を必須にしない．
- [ ] 実際に読み込んだ日本語フォントで本文と強調の太さの差を確認し，マーカーは一行・複数行・明暗背景で文字を隠さない．フォントfallback時の限界も報告する．
- [ ] 見出し・本文・補足の階層，図とキャプションの対応を，#54の同一構図の画像比較で確認できる．色のみの識別が必要な情報には文字・線等の手掛かりを残す．
- [ ] 通常の原稿で本文，図の説明，余白を毎回上書きしなくても使える例がある．特定の意図による個別指定は保持できる．
- [ ] DESIGN.mdのliteral値，生成token，テーマ内の対応が一致し，同じ値を複数箇所へ手で複製しない．新しい公開変数は契約に記載する．
- [ ] 原稿の左右・上下配置，列順，図と説明のgroupは変わらない．フォントや文字サイズによる折返し変化は別に点検し，収まりの保証を誇張しない．
- [ ] shared CSSを変更する場合はmuji/toshiba，paper，scroll，数式・コード等への差を確認する．他テーマのブランド表現をlabに揃える変更は含めない．
- [ ] 新旧の画像・原稿差分，既知の互換性差分，残した個別調整，移行方法をPRに添える．既存labの既定変更はレビューで明示的に確認する．
- [ ] `design:lint`，`design:tokens:check`，テーマ再生成，対象fixtureのstrict validationと関連テストを実行し，未実行項目を区別する．

## 対象外

構図の自動変更，新ブランドの大量追加，無彩色強調への置換，図内容の再着色，Pele導入，研究デッキの一括移行は対象外．
具体的な色・太さ・フォント・寸法はまだ採用済みではない．

## 実装の入口と順序

`designs/lab/DESIGN.md`，`themes/src/lab.css`，`themes/src/_shared/_typography.css`，`_base.css`，`_callouts.css`，生成CSS，文字関連skill references．
デザイン比較は#54以降に開始できる．#55/#56が触る寸法契約と干渉するため，外観の最終統合はその差分を確認して行う．

## 根拠

- [lab.css](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/themes/src/lab.css)，[typography](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/themes/src/_shared/_typography.css)．
- [7月13日原稿の強調](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/07-13-lab-seminar-fuzzy-dpt/slide.md)，[7月6日原稿](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/07-06-fujitsu-interview/slide.md)．
- 本人が色付き太字・マーカーを好み，構図は各ページで調整すると述べた[追加議論](https://github.com/takumi-nishimura/MarpAgent/pull/52#issuecomment-6251211532)．
- 本Issueは#53に基づく改善案であり，視覚改善の効果は未測定．

## 正本記録

repo内ISSは未起票．現行規約と既存記録を照合し，記録CLIで作成・validateし，本Issueへ正本リンクを追記する．既定の外観変更の採用判断は必要に応じてproposed ADRへ分け，自動accepted化しない．

## Notes

2026-10-21 interface checkpoint：`theme: lab` の任意 class `lab-refined` として実装し，既定 lab の切替を避ける．別の Marp theme や DESIGN.md の複製は作らない．改良版は `themes/src/lab/_refined.css` に隔離し，文字階層，色付き太字，複数行のマーカー，図説明，脚注，表，補足欄を lab の token へ対応させる．paper，muji/toshiba，共通 layout mechanics は変更しない．#55 の `.body` / `.figure-natural`，header gap，列幅，図の収め方とその公開変数を再定義しない．

現行 exporter は YAML の数値 lineHeight を出力せず，文字列なら `--leading-*` を出力する．lab の DESIGN.md だけを対応する表記へ直し，共通 generator は変更しない．既定描画の body line-height は browser 実測で `normal`．候補版は body 26px / 1.5，strong 700，caption 19.5px，footnote 14px とし，列順や group の保持と折返し差を分けて調べる．

日本語 font が環境に存在しないため，初回の視覚比較では公式 Google Fonts の Noto Sans JP を一時取得し，400/700 の face を実際に読み込んだ条件と fallback 条件を分ける．font hash，browser の platform font 情報，画像，行数の差は比較結果へ保存する．fallback の日本語表示を受入根拠にはしない．

`docs/lab-refinement.md` に token inventory と公開方法，検証済みのコマンドを記録した．初回の unit 27 件と browser 3 件は pass，design lint / token check / theme 再生成も実行済み．sandbox の子プロセス・browser 制限で失敗したコマンドは許可された環境で再実行し，実行結果を確認した．#54 committed fixture，#55/#56 の確定契約による統合比較と strict validation は引き続き必要であり，受入完了や既定変更の採用とは扱わない．

新しい ADR/XR は並行採番せず，既定への採用判断が必要なら main が中央で作成する．

初回の最終候補では，対象5 fixture の実 font を指定した一時コピーがすべて strict validation で実測され，error 0．source hint は保持した．同一内容11ページ×2 font 条件では既定表示の画素が旧 CSS と22条件すべて一致し，改良版は本文を保持し，観測した文字 block の行数差はなかった．字体の太さと文字階層の画像は Codex が確認した．行間や caption の寸法による縦位置の変化はあり，収まりを一般化しない．画像から判明した暗色表の文字色を本文色へ合わせ，`.marker` の帯を em と同じ透過率へ調整した．

#54 `119fbbb`，#55 `6560cc4`，#56 `2eb7616` は committed と確認済み．共有契約と `:where()` の class 収集をコードで確認したが，これらとの組合せ描画・診断は未実行．この checkpoint では branch に peer commit を取り込んでいない．helper model は使用せず，Codex が実装と視覚確認を担当した．
