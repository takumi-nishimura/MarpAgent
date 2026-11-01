---
id: ISS-0058
title: "Refresh the introduction example and README"
type: issue
status: in-progress
date: "2026-11-01"
updated: "2026-11-01"
authors:
  - codex
scope:
  - README.md
  - decks/example
  - docs/usage.md
tags:
  - docs
  - example
depends_on: []
supersedes: []
artifacts:
  revisions:
    - b070f9b750fdabf8df14cb269ed8837404ebbba8
  manifests: []
  results: []
  commands: []
---

# Refresh the introduction example and README

## Problem

共通レイアウトとスキル再編はmainへ統合されたが，公開の紹介用作例は15枚の旧構成で，ワークフローをファイルと成果物の図で説明している．READMEは導入説明の直後から詳しい実装・運用条件が続き，作例のPDFや制作依頼例へ到達しにくい．以前確認した10枚のLab版は未公開の作業コピーに残っている．

## Goal

初めて読む人が，作例を見て，必要な環境と制作の始め方を確認し，原稿の作成・点検・発表・配布を追える．READMEと作例は統合後のスキル・レイアウト・CLIに一致する．

## Acceptance criteria

- [ ] 紹介用作例をLabの10枚構成へ更新し，依頼例を引用として，点検・改稿を具体的な比較として示す．
- [ ] 既に確認した見出し／本文の配置，p.6の日本語改行，p.7の図とcaptionのまとまりを統合後の描画で点検する．
- [ ] 作例のPDFと操作画像を同じ原稿から更新し，READMEにプレビューと原稿への導線を設ける．
- [ ] READMEから環境構築，最初の作成・プレビュー・検証・出力，slide-authorの依頼例を辿れる．
- [ ] 詳細なCLI・配布・テーマの既存説明を参照ページへ保持し，相対リンクと見出しのリンク先を確認する．
- [ ] 実描画検証，紹介した出力形式，CLI手順と文書のリンクを確認し，実行条件と結果を記録する．

## Out of scope

テーマ・スキル・rendererの追加変更，個人サイトのブログ改稿・公開，既存資料の一括移行，理解度や制作効率の実験的評価．

## Approach

PR #71統合後のmainから分離した作業コピーで，保存済みの作例原稿・brief・操作画像を対象だけ取り込む．本文・図・順序はslide.mdで改訂し，旧outlineは履歴として保持する．READMEは紹介・導入・依頼例・制作・配布を中心にし，詳細説明はdocs/usage.mdへ移す．共通テーマのコードを再変更せずに作例を描画して確かめる．

## Notes

ユーザーは#69，#70，#71を順に統合し，今回は作例とREADMEのPRを依頼した．ブログの下書きは別の後続作業として保持する．
