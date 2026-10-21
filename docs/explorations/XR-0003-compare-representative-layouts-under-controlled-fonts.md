---
id: XR-0003
title: "Compare representative layouts under controlled fonts"
type: exploration
status: running
date: "2026-10-21"
authors: [codex-main]
scope: ["themes","layout"]
tags: [integration]
depends_on: []
informs: ["ADR-0007"]
evaluates: []
supersedes: []
issues: ["ISS-0046","ISS-0047","ISS-0048","ISS-0049"]
artifacts:
  revisions: ["1711332","119fbbb","756b461","f397ea5","995073f","05b9c7b"]
  manifests: []
  results: ["fixtures/layout-baselines/baseline/conditions.json","fixtures/layout-baselines/baseline-2026-10-21.md","docs/lab-refinement-stable-review.md"]
  commands: []
---

# Compare representative layouts under controlled fonts

## Context and Question

内容と構図を保ちながら，.bodyによる配置とlab-refinedによる文字階層を改善できるか．個別指定の削減と単なる欠けの隠蔽を区別する．

## Motivation

元原稿を汎用化した14ページ7組の標準・境界fixtureを用意し，同じ入力の結果を比較する．実際の研究内容や写真は転記しない．

## Hypothesis

captionの高さを先に確保すれば，縦長図や追加行でも必要情報を表示できる．外観の明示選択により既定表示を保てる．本文の欠落，意図した強調の削除，新規clipping，fallback fontでの見かけの成功は反証条件とする．

## Approach

#54が旧CSSと42枚の3テーマ基準画像，2調整試行×3テーマ，原稿・素材hashを保存した．#55は同一内容8ケース×3テーマで.bodyの前後を比較し，さらに最小限の旧修復と新bodyを比較した．#57は安定した#55配置に対し旧CSS・新CSS無効・lab-refined有効を比較した．各runのfont条件を混ぜない．

## Evaluation Conditions

Linux x64，Node25.6.0，Marp Core5.0.2，CLI4.5.1，Playwright1.58.2，Chromium145.0.7632.6，1280×720，DPR1．基準は1711332のCSSと119fbbbの原稿．Noto Sans JPを明示し，CDPの実使用情報を確認した．#54は固定400/700，#55/#57は指定variable fileを使い，#55のSVGには同じsubsetを両側へ埋め込んだ．取得元とhashは各証跡を正本とする．

実行入口はcomposition-utilities，body-layout，layout-compatibility，body-exports，lab-refinementの各E2Eと，各比較記録のharness．font条件を合わせてbrowser-tests.lockの下で実行する．metricsは内容一致，wrap，領域寸法，clipping/overlap/font検査，指定の数と理由．理解度や投影距離の実験は行わない．

## Observed Results

基準の縦長二列は3テーマで下端が欠けた．max-h-full単独では親高さが決まらず改善せず，max-height:480pxは図内文字を縮小して修復できた．.bodyではcaptionを含め収まることを確認した．

#55追補では縦長二列の旧height:520px一指定を新bodyの個別高さ0へ置換できたが，旧.w-3/4でも修復できた．したがって個別高さが必須だったとは言えない．長脚注ページは旧・新とも修復0であった．

#57の既定表示は23/23ページで画素一致，lab-refinedでも本文23/23一致．captionのwrap差は2箇所で，.bodyの4構図は収まった．元の.bodyなし縦長図は新旧ともclippingがあり，86pxから83pxへの差を改善完了としない．

## Conclusion

選択的な残余配置と外観の互換性を支持する．すべての個別指定を減らすという仮説は支持しない．統合strict gateと恒久証跡の集約後に状態を確定する．

## Reusable Findings

font-familyの指定だけでは描画条件を保証しない．画像内の日本語はページのwebfontを継承しない．classの存在は親寸法の前提を満たすことと異なる．内容・図内文字・caption・脚注をそれぞれ確認する．

## Artifacts

[旧基準と調整記録](../../fixtures/layout-baselines/baseline-2026-10-21.md)，[安定配置でのlab比較](../lab-refinement-stable-review.md)，各ISSの検証コマンドを参照する．代表の新旧証跡はdocs/evidence/へ集約する．

## Revisit Conditions

テーマの既定置換，fontやMarp/browser版変更，新しい構図・canvas・長文で再評価する．別runの結果で過去の観測値を上書きしない．

## Related Records

ADR-0007へ判断材料を提供する．
