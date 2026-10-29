---
id: XR-0009
title: "Measure layout adjustment effort against minimal legacy repairs"
type: exploration
status: inconclusive
date: "2026-10-30"
authors:
  - codex-layout-astra
scope:
  - themes
  - docs/layout-adjustments.md
  - fixtures/layout-baselines
tags:
  - layout
  - bounded-comparison
depends_on: []
informs: []
evaluates: []
supersedes: []
issues: ["ISS-0047"]
artifacts:
  revisions:
    - 6a6c9433cc0f893b20d5f40fbfa52d990591d103
  manifests:
    - docs/evidence/ISS-0047-layout-comparison-2026-10-30/manifest.json
  results:
    - docs/evidence/ISS-0047-layout-comparison-2026-10-30/README.md
    - docs/evidence/ISS-0047-layout-comparison-2026-10-30/run/summary.json
    - docs/evidence/ISS-0047-layout-comparison-2026-10-30/run/all-trials.json.gz
    - docs/evidence/ISS-0047-layout-comparison-2026-10-30/review.md
  commands:
    - node docs/evidence/ISS-0047-layout-comparison-2026-10-30/rerun.cjs --verify
    - node --test tests/unit/theme-css.test.js tests/unit/body-class-contract.test.js tests/unit/canvas-size.test.js tests/unit/layout-baselines.test.js tests/unit/scroll-slides.test.js
    - npm run test:e2e -- tests/e2e/body-layout.spec.js tests/e2e/layout-compatibility.spec.js tests/e2e/body-exports.spec.js tests/e2e/composition-utilities.spec.js --project=chromium --workers=1
---

# Measure layout adjustment effort against minimal legacy repairs

## Context and Question

ISS-0047のbody実装は受け入れ済みだが，標準例の個別指定を減らしたという完了条件は未達である．旧 `w-3/4` でも縦長図を修復でき，新bodyはwrapperとclassを増やすため，高さ宣言だけの比較では判断できない．同じ内容・構図・フォント・typographyで，標準4構図と見出し／captionが増える例を比較した．

## Motivation

旧方式の有効な最少修復を対照に含め，初期指定と増加時の再調整，構造とcase固有サイズの負担を区別する．10月21日の証跡を上書きせず，新しい日付の証跡として残す．

## Hypothesis

bodyで標準例の個別指定が減り，例外の調整が短くなることを期待する．標準例が旧方式で修復不要，構造負担の増加，bodyだけに追加修正が必要，または旧方式の単一指定が増加条件を吸収する場合は，その観測を除外せず広い主張の反証／制限として扱う．寸法宣言だけの減少やaudit合格だけではISSの完了としない．

## Approach

単図，8:4列，二図の縦積み，結果図＋補足の標準4例と，縦長列，下段キャンバス高増加，長脚注の3例を再利用し，それぞれ元の内容／見出し増加／caption増加の21ケースを作った．3テーマ計63組である．

旧方式は無修正と既存幅utility5種を各figureについて列挙し，二図では直積36候補を測った．最少utility数，同数なら最小図内文字が最大の候補を選ぶ．別経路として縦長列のfigure全体 `height: 460px` も測り，再調整の不可避性を検証した．bodyでは不要な `.box` を追加せず，元gridの列比率・gapと縦積みgapを維持した．

wrapper／class token／幅utility／inline寸法／gap parameter／再調整する対象要素を別々に数えた．詳細は[比較規則](../evidence/ISS-0047-layout-comparison-2026-10-30/PROTOCOL.md)と[recipe](../evidence/ISS-0047-layout-comparison-2026-10-30/recipes.cjs)に固定した．本研究はCSSの全解の最適化や人間の作業時間の測定ではない．

## Evaluation Conditions

* Revision／commit：`6a6c9433cc0f893b20d5f40fbfa52d990591d103`．現行の同じtheme CSSを旧markupとbodyに使用した．
* Manifest／設定：[manifest](../evidence/ISS-0047-layout-comparison-2026-10-30/manifest.json)．入力・素材・CSS・engine・audit・lockfileのblobとhash，保存ファイルのhashを持つ．
* 実行コマンド：[再実行手順とチェック](../evidence/ISS-0047-layout-comparison-2026-10-30/README.md#再実行)．ブラウザーはcoordinationの共有lock下で実行した．
* Seed：乱数なし．
* Data：既存の汎用fixtureと架空の値・自作SVGのみ．境界の追記も同じ文言を両方式に使う．
* Baseline：同じテーマの従来markup，無修正または有限utility候補内の最少修復．固定高さの代替も併記する．
* Metrics：audit4種類，本文／脚注の領域，図内ラベルの描画寸法，行数，内容・typography一致，指定の種類別件数，再調整対象数．
* Stop conditions：21ケース×3テーマと決めた候補集合で停止する．標準例が既に0修復なら，条件を作り替えて削減を演出しない．

Node25.6.0，Marp Core5.0.2，Playwright1.58.2，Chromium145.0.7632.6，1280×720，DPR1．HTMLのNoto Sans JP TTFとSVG subsetは旧証跡と同じhashを照合した．外部通信を遮断しCDPでもcustom font使用を確認した．テーマ間の文字設定は各テーマ本来の値，方式間は同一である．

## Observed Results

### Observations

993候補を描画した．全候補で内容・文字設定・素材・alt・列幅／位置・縦積みgapの一致をassertし，選択した63組では見出し／captionがそれぞれ1行から2行へ増えたことも確認した．

| 観測範囲 | 結果 |
| --- | --- |
| 標準4構図×3条件×3テーマ | 旧方式の個別サイズ指定0，増加時の再調整0．4枚1組でwrapper4→7，class12→15，gap parameter0→1，case固有サイズ0→0 |
| 縦長列9組 | 幅utility1件→bodyのcase固有サイズ0件．wrapper3→4，class9→11．元utility持ち越しで変更が必要なのは見出し2件＋caption3件 |
| 縦長列の別修復 | `height:460px` 1宣言が全9組で成立し再調整0件．ラベル14.98〜16.13px．旧utilityの最小12pxより良い条件もある |
| 下段が高い縦積み | toshibaの見出し増加だけ旧utility1件を追加．初めから上段に `w-3/4` を付ける1指定でも全条件を通る．bodyの下段ラベルが旧選択より少し小さい例もある |
| 長脚注 | 旧方式は修復不要．labのbody既定は本文下端672pxと脚注上端667.8125pxが領域として干渉．`--body-bottom-safe:56px` 1宣言で本文下端664px，離隔3.8125pxとなる．この指定を3条件に数えた |

body既定の比較上の収まりは60/63組，公開変数の調整後は63/63組．選択した両方式126描画はauditのclipping／overlap／small-text／edge-crowdingが0件だった．lab長脚注の既定でもaudit上の文字衝突は0件であり，要素領域の非侵入という追加条件の違反と区別した．

PNG22枚を直接確認し，ラベル・数値・矢印・caption・強調・留保・出典を見た．bodyは図を拡大するが，captionの距離も変わり，mujiの9.6px脚注は細かいままだった．[視覚確認](../evidence/ISS-0047-layout-comparison-2026-10-30/review.md)は確認済み画像と未確認範囲を列挙する．

対象unit49件と，strict Chromiumのbody／互換／構図／HTML・PNG・PDF出力41件が成功し，skipはない．新比較63組のPDF全ページ比較やPPTX，Firefox全回帰は行っていない．

### Interpretation

縦長列でcase固有サイズ値を選ばなくてよい効果は支持できる．標準例の個別指定減少と，旧方式に対する再調整の一般的削減は支持できない．標準例は旧方式でも修復0件であり，縦長列にも固定高さ1指定で再調整不要の経路がある．body側の構造追加，gap移行，脚注reserve調整を無視できない．

図が大きくなることと読みやすさは同義ではない．このfixtureは架空の低密度図であり，実際の研究図や投影距離への一般化，作業時間の短縮は測っていない．選択規則は有限候補に対するもので，すべてのlegacy構造やCSSに対する最小性は主張しない．

## Conclusion

`inconclusive`．限定的なbodyの効果は実測したが，ISS-0047の標準例に関する最後の完了条件は満たさない．既存実装の受入を取り消す判断でも，狭い条件へ受入基準を変更する判断でもない．ISS-0047はin-progressと未チェック項目を維持する．

標準4例に追加修復がない以上，広い削減を示すためだけに共通CSSを変える根拠はなかった．今回は共有実装，依存，workflowを変更せず，必要な脚注調整と実証できた限界を利用文書に追加した．

## Reusable Findings

* figure単体・結果には `.body` 1 wrapper，gridには `.fill` と図側の `.box` で足りる．不要なwrapper/classを新方式にも加えない．
* `gap-4` からの移行は同じ `calc(var(--spacing) * 4)` を使う．theme内remのMarp変換とinline remの違いを見落とすと構図を固定できない．
* 幅utilityはcaption由来のfigure幅にも影響される．文字の増加時に図内ラベルの実寸を再確認する．
* 固定48px reserveを任意長脚注の自動測定と解釈しない．56pxはこの例の修正値であり，普遍的な既定値ではない．

## Artifacts

* [比較報告と再実行harness](../evidence/ISS-0047-layout-comparison-2026-10-30/README.md)
* [63組の要約](../evidence/ISS-0047-layout-comparison-2026-10-30/run/summary.json)，[全993候補](../evidence/ISS-0047-layout-comparison-2026-10-30/run/all-trials.json.gz)，[選択原稿6本](../evidence/ISS-0047-layout-comparison-2026-10-30/run/inputs/)
* [保存PNG36枚](../evidence/ISS-0047-layout-comparison-2026-10-30/run/figures/)．元の126枚からbytesをそのまま複製した．
* [利用手順](../layout-adjustments.md#2026-10-30の比較に基づく選び方)

## Revisit Conditions

* 元々複数の個別指定を必要とする代表的な実原稿を，内容・意図を保持して比較できる場合．
* 追加構造とcase固有値の削減というトレードオフを完了条件として受け入れる明示判断がある場合．本XRでは判断しない．
* themeの文字設定，脚注配置，bodyの領域契約が変わった場合．保存済み結果を上書きせず，新しい測定を追加する．

## Related Records

ISS-0047を`issues`で参照する．ISS-0046のfixtureと10月21日のbody実装証跡を再利用した．歴史的な設計能力監査や旧XRの結論を置換する試行ではないため，`supersedes`は設定しない．
