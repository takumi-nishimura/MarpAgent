---
id: XR-0011
title: "Evaluate real layout robustness under added headings and captions"
type: exploration
status: inconclusive
date: "2026-11-06"
authors:
  - codex
scope:
  - layout authoring
tags:
  - layout
depends_on: []
informs: []
evaluates: []
supersedes: []
issues: [ISS-0047]
artifacts:
  revisions: [2d7a16211ff1b0cdd8f61638a2388c9eb7bc5c82]
  manifests: [docs/evidence/ISS-0047-real-growth-2026-11-06/growth-summary.json, docs/evidence/ISS-0047-real-growth-2026-11-06/repair-summary.json]
  results: [docs/evidence/ISS-0047-real-growth-2026-11-06/]
  commands: [node docs/evidence/ISS-0047-real-growth-2026-11-06/compare.cjs]
---

# Evaluate real layout robustness under added headings and captions

## Context and Question

XR-0010の同一内容での簡素化が，見出しや図の説明を増やしても維持されるか．ISS-0047の未達条件である例外時の調整負担を調べる．

## Motivation

静的な1条件で同じ矩形になるだけでは，削除した宣言が内容変化時に必要かを判断できない．

## Hypothesis

元原稿，旧方式の整理済み原稿，shares方式の整理済み原稿が，追加条件でも同じ文字設定・素材・主要矩形を保つ．差が出た場合は削除候補の一般化を棄却する．同じ不具合を生む場合も成功とは扱わない．

## Approach

XR-0010の3ページ×3原稿に，元の内容・見出し1行追加・既存captionへの1行追加（ないページでは最初のfigureへcaptionを追加）の3条件を適用する．見出しには固定の短い日本語行，captionには固定の短い補足説明を使う．既存本文・画像は保持し，private outputへ27描画と測定を保存する．

## Evaluation Conditions

* Engine：2d7a162，autoBody:falseを全群で維持する．
* Source：my-decks b407f3d，XR-0010と同じ3ページ・同じ整理候補．
* Font：XR-0010と同じNoto Sans JP TTFとSVG用Fontconfig．HTTP(S)は遮断する．
* Geometry：主要要素の矩形差0.5px未満，本文hash・画像hash・文字設定の一致．
* Audit：clipping，overlap，small-text，edge-crowdingを別途確認する．
* 比較元はXR-0010の再実行で生成する．CANDIDATE_INPUTでその非公開出力先を指定する．PRIVATE_DECKS，COMPARISON_FONT，COMPARISON_OUTPUT，FONTCONFIG_FILEも指定する．

## Observed Results

27描画で整理前後の本文・素材・文字設定・主要矩形の一致を確認した．labの2ページは全条件で4診断とも0件だった．toshibaのページは全3群とも，見出し増加でclipping2件・crowding1件，caption増加でcrowding1件を示した．等価であるだけでは収まりを保証しない．

続いてtoshibaの3条件×9群を比較した．全群で本文・文字設定・素材hashを保持した．同じ元原稿の5個のinline指定を変更する固定高さ案（380→300px，280→200px）は全条件を通った．body案では外側のcolを `.body.col.shares` とし，2つのmax-heightとfigureのmargin-topを外して，列幅55％の1宣言だけにした．classは5個，wrapperは3個で元原稿と同数．全条件で4診断とも0件となり，見出しとcaptionの増加に合わせてmedia領域が変化した．

旧方式の代替として両figureにw-full，w-3/4，w-2/3，w-1/2を適用し，max-heightとmargin-topを削除した．w-3/4は見出し増加でcrowding1件を残す．w-1/2は診断0件だが，PNGで図内ラベルが著しく小さくなることを確認し，読みやすさの同等な修復とは扱わない．w-2/3は現行CSSに定義がなく，実用的な候補として採用しない（w-full同様の失敗を記録）．この有限候補で旧方式の最適性は証明していない．

代表画像5枚を直接確認した．lab図内の元から小さい文字は残る．toshibaのbody案は固定高さ・半幅utility案より大きな図を維持するが，元原稿と矩形は変わる．図内可読性の利用者評価や作業時間の測定は未実施．

初回pilotでは既存captionの後へ別captionを追加してしまったため，最終条件を既存captionへの追記に修正して27描画を再実行した．pilotは最終summaryへ混ぜない．

## Conclusion

一般化についてはinconclusive．labの2ページでは整理による削減が内容増加時にも保たれた．toshibaの1ページでは，既存のbody機能と列幅指定を組み合わせて，寸法の個別指定を5→1へ減らし境界のはみ出しも修復できた．単なる割合指定への変更ではその修復効果はない．ただし新方式の修復比較は1ページであり，これを複数の標準構図への一般化とは扱わない．ISS-0047と親ISS-0045は継続する．

## Reusable Findings

* 同じ矩形であることと，境界条件で収まることを分けて判定する．
* 比率指定だけでなく，本文の残余領域まで含めた修復を比較する．
* utilityで収まっても図内ラベルが小さくなる候補は同等と扱わない．

## Artifacts

再実行コード：docs/evidence/ISS-0047-real-growth-2026-11-06/compare.cjs．通常実行は27描画，REPAIR=1はtoshibaのみの27描画．summarize.cjsにprivate results.jsonを渡すと本文・画像を含まない集計を標準出力へ書く．原文を公開せずhashと指定数・矩形・診断数だけを保存する．原稿と画像は非公開の/tmp/marp-layout-growth-resultsへ保存する．管理者は本作業lead，結果の受入れと必要証跡の保存後に一時資源を整理する．

## Revisit Conditions

次はbodyによる修復を，残る実原稿の図中心・縦積み等にも広げる．現行の自動bodyを使う新規原稿も確認し，autoBody:falseで固定した旧原稿比較と区別する．多列，異なる内容量，異なるテーマへの一般化は本試行だけでは主張しない．

## Related Records

XR-0010の結論は変更せず，内容増加条件を追加した別試行として扱う．
