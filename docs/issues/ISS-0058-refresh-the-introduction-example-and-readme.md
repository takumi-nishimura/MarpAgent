---
id: ISS-0058
title: "Refresh the introduction example and README"
type: issue
status: in-review
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
    - 59c2ea214b3cfb8ab875fecf48e09e62b80c16dc
  manifests:
    - docs/evidence/ISS-0058-example-readme-2026-11-01/checks.json
  results:
    - decks/example/slide.pdf
    - decks/example/assets/img/introduction-preview.png
  commands:
    - npm run marpx -- decks/example/slide.md -v --strict
    - npm run marpx -- decks/example/slide.md --pdf
    - npm run marpx -- decks/example/slide.md --pptx
    - npm run marpx -- decks/example/slide.md --html
    - npm run marpx -- decks/example/slide.md --images png
    - npm run marpx -- decks/example/slide.md --zip
---

# Refresh the introduction example and README

## Problem

共通レイアウトとスキル再編はmainへ統合されたが，公開の紹介用作例は15枚の旧構成で，ワークフローをファイルと成果物の図で説明している．READMEは導入説明の直後から詳しい実装・運用条件が続き，作例のPDFや制作依頼例へ到達しにくい．以前確認した10枚のLab版は未公開の作業コピーに残っている．

## Goal

初めて読む人が，作例を見て，必要な環境と制作の始め方を確認し，原稿の作成・点検・発表・配布を追える．READMEと作例は統合後のスキル・レイアウト・CLIに一致する．

## Acceptance criteria

- [x] 紹介用作例をLabの10枚構成へ更新し，依頼例を引用として，点検・改稿を具体的な比較として示す．
- [x] 既に確認した見出し／本文の配置，p.6の日本語改行，p.7の図とcaptionのまとまりを統合後の描画で点検する．
- [x] 作例のPDFと操作画像を同じ原稿から更新し，READMEにプレビューと原稿への導線を設ける．
- [x] READMEから環境構築，最初の作成・プレビュー・検証・出力，slide-authorの依頼例を辿れる．
- [x] 詳細なCLI・配布・テーマの既存説明を参照ページへ保持し，相対リンクと見出しのリンク先を確認する．
- [x] 実描画検証，紹介した出力形式，CLI手順と文書のリンクを確認し，実行条件と結果を記録する．

## Out of scope

テーマ・スキル・rendererの追加変更，個人サイトのブログ改稿・公開，既存資料の一括移行，理解度や制作効率の実験的評価．

## Approach

PR #71統合後のmainから分離した作業コピーで，保存済みの作例原稿・brief・操作画像を対象だけ取り込む．本文・図・順序はslide.mdで改訂し，旧outlineは履歴として保持する．READMEは紹介・導入・依頼例・制作・配布を中心にし，詳細説明はdocs/usage.mdへ移す．共通テーマのコードを再変更せずに作例を描画して確かめる．

## Notes

ユーザーは#69，#70，#71を順に統合し，今回は作例とREADMEのPRを依頼した．ブログの下書きは別の後続作業として保持する．

## Implementation and validation

作例は15枚から10枚へ再構成した．ファイル間の経路を示す図に代えて，PDFとHTMLの説明を共通の比較軸へ揃える試作・点検・改稿の例を示す．p.2の依頼例は通常のMarkdown引用，p.7はfigure-naturalによる図とcaptionのグループとし，p.8は配布物と原稿共有の条件，出力後の点検を説明する．テーマ，renderer，スキルのファイルには変更を加えていない．

READMEは194行の導入・手順・依頼例・配布説明へ整理し，従来の詳細説明83ブロックをdocs/usage.mdへ保持した．両文書と作例のローカルリンク・見出し45件を解決した．READMEのpreviewは表紙，依頼例，改稿例，配布ページの実描画を並べたものとした．

| Check | Result |
| --- | --- |
| 紹介用作例 | 10枚をmeasuredで検証し，errors 0，warnings 0，findings 0 |
| 全体の目視点検 | ブラウザ描画とPDFから再描画した全10枚を確認．p.6の文末だけの改行はなく，p.7のpainted imageとcaptionの間隔は9.75px |
| 出力 | PDF，PPTX，HTML，PNG，ZIPを実行して成功．PDF 10頁，PPTX 10枚，PNG 10枚を確認 |
| 配布ZIP | 展開先でネットを遮断し，画像と10枚の矢印キー操作を確認．Markdownを含まないことを確認 |
| READMEの手順 | 新規scaffoldの2枚でserve，overview，strict検証，PDF出力を確認し，検査用deckとプロセスを削除 |
| 記録検証 | 80件成功 |
| 全単体試験 | 540件中538 passed，0 failed，既存platform対象外2 skipped |
| strict fixture描画 | 18件成功．改訂後の紹介用作例を含む |
| strict browser E2E | 156 passed，0 failed，既存Firefox対象外1 skipped |
| 固定D2／portable ZIP受入れ | 7件／2件成功，失敗・skipなし |
| 依存監査 | reviewed ISS-0042 baselineに一致して成功．脆弱性ゼロの主張ではない |

受入れの対象はcleanな59c2ea214b3cfb8ab875fecf48e09e62b80c16dcである．macOS arm64，Node 25.6.0，uv 0.13.6，D2 0.9.0を使い，ci:fullの構成検査を個別に実行した．単体fileはconcurrency=1，browserはworkers=1とした．一括のnpm run ci:full実行や，Linux hosted runnerと同一環境での実行とは区別する．D2受入れはworkflowと同じ元fontのchecksum，fonttools 4.60.1／weight 400の入力を再利用して確認した．browser成果物と全logは一時作業コピーの外へ保存した．公開用の要約と原稿・PDF・画像のhashは[checks.json](../evidence/ISS-0058-example-readme-2026-11-01/checks.json)に残す．

受入れ後の差分はこの記録・検証要約と，参照文書の末尾の空行1行の除去だけであり，作例の原稿・PDF・画像や実行コードは変更していない．

## Limits and auxiliary checks

ZIPにはGoogle Fontsへのremote dependencyがmanifestへ記録される．接続遮断時の画像・操作の成功を，全環境で同じ字形・改行になる保証やstrict-offlineの成功とは扱わない．PPTXの生成とpackage内の10枚を確認したが，PowerPointアプリでは開いていない．点検・改稿の比較は説明用の作例であり，理解度を測定した結果ではない．

素材一覧CLIによる参照確認は，既存のexample-paper/shared配下に対してGitがbeyond a symbolic linkを返し，失敗した．コードは本件で変更せず，元ファイル名の参照とsymlinkを直接走査した．操作画像の実参照は同じ作例内であり，旧outlineと過去のXRの記述は保持した．ZIPの初回の操作検査は画面切替の完了前に次のキーを送り，待機に失敗した．そのlogを保持し，実際のView Transition終了を待つ手順で全ページを確認した．
