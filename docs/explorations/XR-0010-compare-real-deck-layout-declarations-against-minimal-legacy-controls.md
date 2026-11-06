---
id: XR-0010
title: "Compare real-deck layout declarations against minimal legacy controls"
type: exploration
status: inconclusive
date: "2026-11-06"
authors: [codex]
scope: [layout authoring and column widths]
tags: [layout, comparison]
depends_on: []
informs: []
evaluates: []
supersedes: []
issues: [ISS-0047]
artifacts:
  revisions: [4dc09bc5eae10c81e57b4a3ce9a8eb8ba85ae951]
  manifests: [docs/evidence/ISS-0047-real-layout-2026-11-06/summary.json]
  results: [docs/evidence/ISS-0047-real-layout-2026-11-06/]
  commands: [node docs/evidence/ISS-0047-real-layout-2026-11-06/compare.cjs]
---

# Compare real-deck layout declarations against minimal legacy controls

## Context and Question

#55の残件として，個別指定の多い実原稿で，新方式が整理済みの旧方式より制作負担を減らすかを調べた．親#53を閉じる根拠を先に仮定しない．

## Motivation

合成した標準例では一般的な削減効果が示せなかった．実用上の左右比率の二重指定という指摘を受けて導入した列幅指定と，既存utilityによる整理を分けて比較する．

## Hypothesis

内容と構図を保持したままinline指定を減らせる可能性がある．ただし旧方式でも同じ整理ができる分は新機能の効果に数えず，classとwrapperの追加も別に数える．

## Approach

元原稿，旧方式の削減対照，新しいshares方式の3群．画像・本文を削除せず，各inline宣言の単独削除を順次試し，本文hash，画像hash・順序，文字設定と主要要素の矩形を維持する場合だけ採用した．位置・寸法の許容差は0.5px．既存place-middleでjustify-contentを置換する候補も最終検証へ含めた．これは候補集合内の貪欲探索であり，旧方式の大域的最少を証明したものではない．

## Evaluation Conditions

* Engine：4dc09bc，現行lab／toshibaを新旧に同一適用．autoBody:falseを両群へ指定して自動移行を分離．
* Source：非公開my-decks b407f3d．6月22日原稿の3・5ページ，8月24日原稿の2ページ．3原稿を読んで，中央揃え・最大寸法の重複が多い2ページと両側比率指定1ページを選んだ．無作為標本ではない．
* Font：Noto Sans JP variable TTF，SHA256はsummary.json．本文へ埋込み，源ノ角ゴシックのaliasも同フォントへ固定．SVG用にFONTCONFIG_FILEで源ノ角ゴシック／Noto Sans CJK JPをNoto Sans JPへaliasした．歴史的環境を復元した比較ではない．見出しの実使用fontはCDPで確認した．
* Browser：Chromium145.0.7632.6／Playwright1.58.2／Node26.13.0，1280×720，DPR1．HTTP(S)遮断，画像decodeとdocument.fonts.readyを待つ．
* PilotではSVGの日本語が欠けたため，fontconfigを適用して元原稿・削減候補を再描画した．最終結果へpilot画像を混ぜない．
* Reproduce：PRIVATE_DECKS，COMPARISON_FONT，COMPARISON_OUTPUTを指定してcompare.cjsを実行する．比較用fontconfigと共通browser lockを使用する．RECHECK_CANDIDATES=1は出力先の既存候補を再検証し，place-middle置換も試す．生の原稿・画像を含む出力先は公開repo外に置く．

## Observed Results

### Observations

| 原稿・ページ | inline：元→旧整理→新 | class：元→旧整理→新 | wrapper |
| --- | --- | --- | --- |
| 6月22日・3 | 12→3→3 | 1→2→3 | 3→3→3 |
| 6月22日・5 | 9→4→4 | 3→4→5 | 4→4→4 |
| 8月24日・2 | 5→5→4 | 5→5→6 | 3→3→3 |
| 合計 | 26→12→11 | 9→11→14 | 10→10→10 |

全候補で本文・画像・文字設定を保持し，主要要素の矩形差は最大0.015442px．clipping／overlap／small-text／edge-crowdingの診断は元・旧整理・新方式の全9描画で0件．画像も直接確認した．SVGの文字欠けは最終環境で解消した．ただし図内の細字は残り，診断0件を投影可読性の保証とは扱わない．

### Interpretation

削減の大部分は既存CSSと重複するdisplay，align-items，max-width／max-height等を整理した効果だった．新しい割合指定の追加効果は両側比率を1指定にする1件であり，他2ページではinline数が変わらずclassだけ増えた．新方式への一括移行は支持しない．

## Conclusion

inconclusive．元原稿からの簡素化は可能だが，整理済み旧方式に対する一般的な指定削減と，例外時の再調整削減は未立証．3ページの現状内容のみで，見出し・caption増加条件，作業時間，多列の実原稿は今回測っていない．#55／#53はopenを維持する．

## Reusable Findings

* 既存CSSで効いている制約を原稿へ重ね書きしない候補を，実描画で確認できる．
* 両側の比率指定にはcol-widthの簡略化効果がある．既に片側のみの指定では件数が減るとは限らない．
* 旧方式の整理を対照に含め，inlineの減少とclass追加を別々に扱う．

## Artifacts

公開側は本文・画像を含まない集計，source hash，再実行コードのみ．研究本文・画像は転載しない．生の候補とPNGは/tmp/marp-layout-private-resultsに保管した．管理者は本作業leadで，ユーザーによる比較確認または恒久的な非公開保存先への移管後に削除する．

## Revisit Conditions

複数ページの見出し・caption増加条件と，多列の実原稿を含めて，同じ可読性で再調整が少ないかを測る．図内文字の可読性改善は内容・構図の変更を伴うため，本比較の同一条件とは分ける．

## Related Records

XR-0009の標準例比較を置換せず，実原稿に対象を広げた補足として扱う．ISS-0047の最終ACは未チェックを維持する．
