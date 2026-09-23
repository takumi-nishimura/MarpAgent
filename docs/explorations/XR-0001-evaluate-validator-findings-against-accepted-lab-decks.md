---
id: XR-0001
title: "Evaluate validator findings against accepted lab decks"
type: exploration
status: adopted
date: "2026-09-23"
authors:
  - claude-code
scope:
  - src/deck-validator.js
  - src/visual-overflow.js
tags:
  - validator
  - evaluation
depends_on: []
informs:
  - ADR-0001
evaluates: []
supersedes: []
issues:
  - ISS-0009
  - ISS-0019
  - ISS-0020
  - ISS-0021
artifacts:
  revisions:
    - c84a953
  manifests: []
  results: []
  commands:
    - node scripts/validate-deck.js <deck>/slide.md --format json
---

# Evaluate validator findings against accepted lab decks

## Context and Question

著者は，バリデータの判定が厳しめで，デザイン的に納得がいかず，誤検出が多いと感じている．著者が完成とみなして発表に使ったデッキに対して，現行の指摘のうち何件が見える不具合に対応するか．また，描画結果の計測に置き換えると，誤検出を減らしつつ見える不具合を検出できるかを問う．

## Motivation

判定方針（ADR-0001）を，好みや推測ではなく，実際のデッキでの観測に基づいて決めるため．

## Hypothesis

* ソースの量に基づくヒューリスティック指摘の大半は，描画上は収まっているスライドに出ている．
* `scrollHeight`の差による`visual-overflow`は，見えない末尾marginも拾う．
* テキスト行と置換要素の見える矩形でキャンバス外への超過を測れば，見える切れだけを検出できる．

反証条件：ヒューリスティック指摘の過半が，スクリーンショット上で見える不具合（切れ，重なり，判読不能）に対応していること．

## Approach

1. 著者のデッキリポジトリ（`~/Documents/nishi/lab/decks`，upstream MarpAgent c84a953をmergeしたcaaf8460）にある2026年の8デッキを，現行の`scripts/validate-deck.js --format json`で検証した．
2. 指摘された各スライドを静的に描画してスクリーンショットを撮り，見える不具合があるかを目視で判定した．
3. 試作として，Marp CLIの`--template bare`で描画し，テキストノードの行矩形と置換要素の矩形を祖先要素の`overflow`による切り取りと交差させ，キャンバス外への超過を測った．
4. 最終実装（ISS-0019）で同じ8デッキと`decks/example`，`decks/example-paper`，`fixtures/`を再検証した．

## Evaluation Conditions

* Revision／commit：MarpAgent c84a953（現行判定），作業ツリー上のISS-0019実装（新判定）．デッキはlab/decks caaf8460．
* Manifest／設定：`marp.config.js`，テーマ`lab`／`toshiba`．
* 実行コマンド：`node scripts/validate-deck.js <deck>/slide.md --format json`
* Seed：なし（決定的な描画）．
* Data：8デッキ，Markdown上70枚（うち1枚は`_hide`で非表示），描画69枚．
* Baseline：現行判定（ヒューリスティック6規則と`visual-overflow`，全指摘`warning`，1件で終了コード1）．
* Metrics：指摘数，見える不具合に対応する指摘数，終了コード1になるデッキ数．
* Stop conditions：全指摘の目視判定が完了した時点．

## Observed Results

### Observations

現行判定では5デッキが終了コード1になり，指摘は18件だった．

| 種別 | 件数 | 見える不具合に対応 |
| --- | --- | --- |
| ヒューリスティック（8スライド） | 12 | 0 |
| `visual-overflow` | 6 | 4 |

* ヒューリスティック12件の内訳：`dense-bullets` 3，`comparison-overpacked` 3，`figure-text-density` 4，`overflow-risk` 2．
* 誤検出の例：
  * 参考文献付きの3段組みスライドが，「10項目（3+3+2）」「674文字」で3件指摘された．
  * カードグリッド（各2項目）と図のスライドが「9項目」「図と9項目」で指摘された．
  * タイトルスライドのプロフィール枠と写真が`figure-text-density`で指摘された．
  * 半分が空白のスライドが，図中のHTMLテキストを数えて「601文字」で指摘された．
* `visual-overflow`の6件のうち，見える切れがあったのは4件だった．
  * 07-06の5枚目：2枚目の図が675pxから始まり，435px切れて見えない．
  * 02-20の11枚目：図のキャプションが8px切れている．
  * 02-20の14枚目：最終行の下端が切れている．
  * 02-20の12枚目：最終行が脚注と重なり，下端に接している．
* 残り2件（2px，3px）は末尾marginによる差で，見た目には影響がなかった．
* 試作の計測で見つかった点：
  * 02-20の11，14枚目と07-06の5枚目を検出し，余白由来の2件は除外できた．
  * 画像の右端が3pxはみ出した1件（06-26の3枚目）と，`overflow: hidden`で意図的に切り取った画像1件（06-11の3枚目）も最初は拾った．前者はメディアの許容幅（要素サイズの2%）で，後者は祖先要素との交差で除外した．
  * 重なりだけの02-20の12枚目は，キャンバス外への超過として検出できなかった．
* bespokeテンプレートは非アクティブなスライドを非表示にするため，要素のスクリーンショットが2枚目以降でタイムアウトした（`marpx --screenshot 3`も同じ）．
* 新判定では2デッキが終了コード1になり，`error`は3件（02-20の11，14枚目，07-06の5枚目）だった．3件とも見える切れに対応する．ヒューリスティックは`info`のヒント10件になった．`decks/example`，`decks/example-paper`，`fixtures/`の結果は想定どおりだった．

### Interpretation

* ソースの量は，テーマのフォントサイズ，段組み，図の大きさ，脚注の扱いを反映しないので，完成済みのスライドを密度過多と判定する．閾値の問題ではなく，測る対象の問題と解釈する．
* 見える矩形による計測は，完成済みデッキで見える切れだけを`error`にした．
* 重なり（02-20の12枚目）は別の検査が必要である．
* 母集団は1人の著者の8デッキであり，他の著者やテーマで同じ誤検出率になるとは限らない．

## Conclusion

`adopted`．描画計測を判定の正本とし，ヒューリスティックを失敗扱いしない方針（ADR-0001）の根拠として採用する．

## Reusable Findings

* 見える内容はテキストノードの行矩形と置換要素で測る．`scrollHeight`は末尾marginを含むので使わない．
* 祖先要素の`overflow`による切り取りと交差させないと，意図的なトリミングを誤検出する．
* メディアの数pxの超過は，余白であることが多い．テキストは数pxでも見た目に影響する．
* Marpの計測とスクリーンショットには`--template bare`を使う．
* 完成済みデッキは，誤検出を測る基準として有用である．

## Artifacts

* 対象デッキ：`~/Documents/nishi/lab/decks/decks/2026/*/slide.md`（lab/decks caaf8460）．リポジトリ外のため，結果は本文に要約した．
* 実装：ISS-0019の変更（`src/visual-overflow.js`，`src/deck-validator.js`）．

## Revisit Conditions

* 他の著者のデッキ，または`muji`などのテーマで誤検出や見逃しが目立つとき．
* 重なり（ISS-0021）や判読限界の文字サイズ（ISS-0022）の検査を追加したとき．

## Related Records

* ADR-0001の判断材料である（`informs`）．
