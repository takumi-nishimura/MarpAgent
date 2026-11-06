---
id: XR-0012
title: "Verify layout acceptance across real and standard compositions"
type: exploration
status: adopted
date: "2026-11-06"
authors: [codex]
scope: [layout acceptance]
tags: [layout, comparison]
depends_on: []
informs: []
evaluates: []
supersedes: []
issues: [ISS-0047, ISS-0045]
artifacts:
  revisions: [2d7a16211ff1b0cdd8f61638a2388c9eb7bc5c82]
  manifests: [docs/evidence/ISS-0047-layout-acceptance-2026-11-06/manifest.json]
  results: [docs/evidence/ISS-0047-layout-acceptance-2026-11-06/summary.json]
  commands: [node docs/evidence/ISS-0047-layout-acceptance-2026-11-06/compare.cjs]
---

# Verify layout acceptance across real and standard compositions

## Context and Question

ISS-0047の最後の条件である，個別指定の削減と，例外の明確な調整手順を，標準構図の既存証跡と実原稿の増加条件を合わせて評価する．XR-0011で1ページに限られていたbodyの比較を3ページへ拡張する．

## Motivation

列の割合だけを変えても内容増加時のはみ出しは修復できなかった．本文の残余領域とcaption-aware figureを組み合わせた原稿を確認する必要がある．

## Hypothesis

原稿の重複指定を除き，残余領域を明示することで，本文・画像・文字設定を保持しながら，内容増加条件でも追加の寸法調整なしに収まる．元から調整0の標準構図は0を維持することを確認し，削減があったとは数えない．

## Approach

XR-0010の3ページの元原稿・旧方式の整理版・shares整理版に，body版を追加した．既存の外側colをbodyへ置き換え，図のmax-height・margin-top・列のalign-selfを除く．元の比率と意図したpaddingは維持する．内容・見出し追加・caption追加の3条件×4群×3ページで比較した．同じ構図を保ち，図のcontain領域は内容に応じて変わることを許す．

## Evaluation Conditions

* Sourceとengine，font，コードhash，実行コマンドはmanifestに固定する．autoBody:falseを全群へ適用して，既存原稿の明示移行を比較する．新規原稿の自動bodyは別のunit／browser試験で確認する．
* PRIVATE_DECKS，CANDIDATE_INPUT（XR-0010の出力），COMPARISON_FONT，COMPARISON_OUTPUT，FONTCONFIG_FILEを指定する．外部HTTP(S)を遮断し，フォントと画像のdecodeを待つ．
* 各描画でabout:blankへ移動し，新documentを作る．描画を2フレーム待って計測・撮影する．同document再利用のpilotで，計測済みの追加見出しが保存PNGに反映されないケースを発見したためである．最終36枚を再生成し，pilotのbody主要矩形と全9条件で差0を確認した．pilot画像は受入れに使わない．XR-0011の数値比較を改変せず，画像に依存する判断は今回の最終画像を根拠にする．
* 文字設定・本文hash・画像hash／自然寸法の一致と4種の診断0をbodyの自動検証条件にする．図内文字は診断だけで判断せず画像を確認する．

## Observed Results

| 原稿ページ | inline 元→旧整理→body | class 元→body | wrapper 元→body |
| --- | --- | --- | --- |
| 6月22日・3（図と解釈） | 12→3→2 | 1→4 | 3→3 |
| 6月22日・5（縦長画面と説明） | 9→4→1 | 3→6 | 4→4 |
| 8月24日・2（図と写真・結果説明） | 5→5→1 | 5→5 | 3→3 |
| 合計 | 26→12→4 | 9→15 | 10→10 |

bodyの全9条件で本文・文字設定・画像内容を保持し，clipping／overlap／small-text／edge-crowdingは0だった．追加内容のための寸法再調整は0．新方式の4宣言は3つの列幅と，1か所の既存paddingである．図の表示領域と本文のブロック間隔は変わり，元原稿との画素一致は主張しない．

最終画像では，見出し追加の2ページとcaption追加の図ページを含め，出典・図内ラベル・矢印・写真の表示範囲を確認した．図内の元から小さい文字は残るため，この受入れは図内容の投影可読性を完全に保証しない．文字縮小，crop，内容削除，構図の自動切替は行っていない．

旧方式にも整理と修復の選択肢がある．XR-0011の固定高さ案は全条件で収まり，w-1/2案は図内ラベルを著しく小さくする．今回の12→4はその有限の対照に対する結果で，大域的な最少指定数の証明ではない．classは6増えたがwrapperは増えず，複数の寸法・整列宣言をbodyと意味のあるplacementへ置き換えた．

図中心・不均等二列・縦積み・結果と補足の標準例は，XR-0009で確認した調整0の例を削減実績に加算しない．現在のproduction codeに対し，3テーマ・2比率を含むbody／composition／互換／HTML・PNG・PDF／脚注／自動bodyのbrowser68件，関連unit16件が成功した．標準と境界の原稿はfixtures/layout-baselines，body-layout.spec.js等にあり，固定高さなしでのcaption優先，overflow診断，明示cropと旧配置の維持を測っている．

## Conclusion

adopted．実原稿3ページで，個別指定を減らし，内容増加時にも再調整不要となる手順を確認した．既存の標準構図の成立・互換性・診断を保ち，例外の調整順序を公開契約とskill参照へ揃えた．この組合せをISS-0047の受入れ根拠とする．全原稿への自動移行，任意の旧原稿より常に短いこと，作業時間の短縮や任意素材の可読性保証は結論に含めない．

## Reusable Findings

* 重複の除去，列幅の指定，本文の残余領域を分けて比較する．割合の変更だけでは高さの問題は解決しない．
* 調整0の標準例は維持を確認し，過剰指定の実原稿では指定数と構造追加の両方を数える．
* 見出し・captionが増えても，本文の文字設定を変えずfigureだけが残余領域を使う．

## Artifacts

公開側は集計・hash・再実行コードのみ．summarizeはXR-0011と同じsummarize.cjsを使う．非公開原稿・最終36画像・従来のpilotと比較出力・テストログ・未適用のbody-candidates.patchは，元checkoutのGit除外済みout/issue-55-private-evidenceへ保存した．管理者は本作業leadで，ユーザーの確認または別の非公開保存先への移管後に削除する．一時clone／worktreeはこの保存と統合確認後に削除する．元private repoの原稿は変更していない．

## Revisit Conditions

今回の対象外の構図や内容量で不具合があれば，その原稿を再現例として検証する．既存の明示寸法やcropは一律削除せず，意図と描画を照合する．

## Related Records

XR-0009／0010／0011の観測・不確定の結論は履歴として保持する．今回の追加証拠と現行手順をまとめた受入れであり，過去の実験結果を成功へ書き換えるものではない．
