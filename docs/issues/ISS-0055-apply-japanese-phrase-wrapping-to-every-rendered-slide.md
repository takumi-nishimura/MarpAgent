---
id: ISS-0055
title: "Apply Japanese phrase wrapping to every rendered slide"
type: issue
status: in-review
date: "2026-11-01"
authors:
  - codex
scope:
  - renderer
  - typography
tags:
  - bug
  - japanese
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Apply Japanese phrase wrapping to every rendered slide

## Problem

利用者が紹介用作例のp.6で，文末の「る．」だけが改行されると指摘した．CLIから生成したHTMLでは，該当段落にBudouXの区切り文字もword-break:keep-allもなかった．3枚の再現原稿では，先頭のスライドだけに処理が掛かり，後続ページには適用されなかった．単一rootを持つ直接engine呼出しの試験は成功しており，CLIの複数rootという条件を検査できていなかった．

## Goal

CLIのHTML・画像・PDF等が使う共通engineで，全スライドに日本語の文節区切りを適用する．先頭のスライドだけを処理した結果を，全ページの自動改行として扱わない．

## Acceptance criteria

- [x] CLIと同じ複数の兄弟SVGを出力する原稿で，後続ページにも文節の区切りとkeep-allが適用される．
- [x] 処理のための一時wrapperは最終HTMLへ残らず，スライドの数・順序を保つ．
- [x] Coreのscript，raw script，MermaidのstyleとSVG文字の保護を維持する．
- [x] 実CLIを通す回帰試験と，作例の描画を確認する．
- [x] 広い回帰検査の結果と，実行環境に起因する未解消事項を区別して記録する．

## Out of scope

任意の日本語文での行末長の最適化，文節モデルの変更，本文の縮小・削除，利用者が明示した改行の一括変更．紹介用作例の改稿，テーマ，共通レイアウトの改善は別変更で扱う．

## Approach

現在のBudouXのtranslateHTMLStringは先頭のrootを処理する．CLIのcontainerを持たない複数SVGのfragment全体を一時的なdivで包んで変換し，そのdivを取り除いて返す．既存のscript・style・D2保護とSVG textの区切り除去は維持する．

## Notes

tests/unit/budoux-html.test.jsにCLIと同じinlineSVG・containerなしの3枚を追加した．修正前は後続段落にkeep-allがなく1件失敗し，修正後は同fileの全7件が成功した．tests/e2e/cli-smoke.spec.jsにも実HTML出力の3枚を追加した．

同一原稿の実CLI出力では，修正前は文末の「きる．」が短い最終行へ分離し，修正後は「確認できる．」の文節単位で改行した．原稿へ手作業の改行やnobrを足して解消した結果ではない．文節分割と，行の長さの均等化は別の処理であり，任意の文・幅での美観までは保証しない．

## Validation

以下は紹介用作例・レイアウトの変更と同じ作業コピーで取得した修正時の結果であり，この単独PRの検証結果とは区別する．最新mainへ切り出した後の結果は次節へ記録する．

macOS arm64，Node 25.6.0の既存環境で確認した．TMPDIRは/private/tmpとした．最終単体試験は全505件をtest-concurrency=1で実行し，503 passed，0 failed，2 skippedだった．除外は既存のLinux /proc依存の後処理と，Linux用browser探索ケースである．strict描画fixtureは18件成功，strict browserは128 passed，0 failed，既存のFirefox対象外1件がskipだった．新しい実CLIの3枚の回帰試験もこのbrowser結果に含む．

初回の既定並列npm testでは，変更していないconversion-runtimeとd2-processの終了管理テストが2件失敗した（子のPIDファイル未作成，終了待ち後も子が生存）．その2 fileを単独実行すると元の2件は通り，別の500msの終了状態の検査が失敗した．これらの試験は今回の改行処理を読み込まない．逐次の全体試験では全件成功したが，並列・短時間制限での不安定さを今回解消したとは扱わない．失敗ログと逐次成功ログは別に保存した．

既存資料でも2枚目以降に文節区切りが有効になるため，改行位置は変わり得る．今回の作例以外の既存資料を一括移行・承認した結果ではなく，各資料は再描画して確認する．修正はローカルのin-reviewであり，mainへの統合や公開を意味しない．

画像更新を含む最終原稿10枚をstrictで再描画し，measured，errors／warnings／hintsはすべて0件だった．全ページを画像で点検し，PDFも10ページのテキストを確認した．

## Isolated PR validation

2026-11-01にmainの23ddf880f38a1f6fb7e536fdba54729784581719を基点として修正を切り出し，そのlockfileからnpm ciで独立した依存環境を作成した．テーマ，作例，共通レイアウトの変更は含まない．Node 25.6.0，macOS arm64，TMPDIR=/private/tmpで確認した．

修正前のmainのmarp.config.jsに新しい単体試験を組み合わせると，7件中，新規の複数SVGケースだけが失敗した．修正後は7件すべて成功した．記録検証とnpm run test:ciの56件も成功した．

全単体試験はfile単位を逐次実行し，540件中537 passed，1 failed，2 skippedだった．失敗は既存のvisual-overflow.test.jsの重なり検出ケースで，footnote.overlapPx >= 4の期待に達しなかった．同じ環境で修正前mainと修正後の双方からこの1件だけを実行し，いずれも同じ行で失敗することを確認した．BudouXの修正によって新たに生じた失敗とは扱わず，単体試験全体を成功とも扱わない．このPRで既存テストの配置・閾値は変更しない．

strict描画fixtureは18件成功した．strict browserは141 passed，0 failed，既存のFirefox対象外1件がskipだった．新しい実CLIのHTML出力ケースに加え，PDF・PPTX・画像の書き出し，Mermaid，日本語caption，脚注，発表操作の既存試験も含む．最終の記録検証は77件成功し，git diff --checkも成功した．

専用のD2／portable ZIP受入れを含むnpm run ci:fullは，このブランチでは未実行である．merge前の完全受入れ条件はdocs/ci.mdに従う．
