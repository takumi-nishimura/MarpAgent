---
id: XR-0002
title: "Calibrate the rendered text-overlap check on accepted lab decks"
type: exploration
status: adopted
date: "2026-09-24"
authors:
  - claude-code
scope:
  - src/visual-overflow.js
tags:
  - validator
  - evaluation
depends_on:
  - XR-0001
informs:
  - ADR-0001
evaluates: []
supersedes: []
issues:
  - ISS-0021
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - node scripts/validate-deck.js <deck>/slide.md --format json
---

# Calibrate the rendered text-overlap check on accepted lab decks

## Context and Question

ISS-0021では，描画したスライドで文字同士，または文字とメディアが重なっている箇所を`text-overlap`の`error`として検出する．ADR-0001は「見える不具合だけを失敗にし，誤検出を少なくする」と定めている．完成済みのデッキで，見える重なりだけを検出し，詰めた行間や数式の内部配置を誤検出しない判定方法と許容幅を定める．

## Motivation

XR-0001で見逃しとして記録した重なり（02-20-midterm-examination スライド12）を検出したい．一方で，行矩形の単純な交差判定では，数値カードの詰めた行間や数式の内部配置が誤検出になることが事前の計測で分かっていた．

## Hypothesis

* 行矩形ではなく字面（グリフ箱）で測れば，詰めた行間の誤検出を除ける．
* 数式，入れ子のSVG，同じブロック内の行，意図的なオーバーレイを除外すれば，見える重なりだけが残る．
* 見える重なりの最小値と誤検出候補の最大値の間に許容幅を置ける．

反証条件：見える重なりと誤検出候補の重なり量が交差し，許容幅で分離できないこと．

## Approach

`auditSlidesInPage`で異なるブロックに属するテキスト行同士，およびテキストとメディアの交差を求めた．

* テキストは，行矩形の縦方向を，その行の文字列をcanvasの`measureText`で測った`actualBoundingBoxAscent/Descent`まで狭めた．
* メディアは`object-fit`／`object-position`の余白を除いた描画範囲，インラインSVGは`getBBox()`の描画範囲で測り，`overflow`で切り取る祖先との共通部分をとった．
* header／footer，数式（`mjx-container`，`.katex`，`math`），入れ子のSVG内のテキスト，`aria-hidden`の装飾，同じ`figure`内のキャプション，背景を持つ自分のブロック内のテキスト，絶対配置のメディアを除外した．絶対配置のテキスト（脚注）は除外しない．
* 候補スライドはすべてスクリーンショットで目視確認した．

## Evaluation Conditions

* Revision／commit：ISS-0021の実装（ISS-0022のブランチに積んだ作業ツリー）．
* Manifest／設定：`marp.config.js`，テーマ`lab`／`toshiba`．
* 実行コマンド：`node scripts/validate-deck.js <deck>/slide.md --format json`
* Seed：なし（決定的な描画）．
* Data：XR-0001の8デッキ（`~/Documents/nishi/lab/decks`，caaf8460），`decks/example/slide.md`，`decks/example-paper/paper.md`，`fixtures/`．
* Baseline：行矩形の単純な交差判定．
* Metrics：交差矩形の短い辺（px，グリフ箱基準），目視での重なりの有無．
* Stop conditions：全候補の目視判定が完了した時点．

## Observed Results

### Observations

| 分類 | スライド | 行矩形の重なり | グリフ箱の重なり | 目視 |
| --- | --- | --- | --- | --- |
| 検出 | 02-20 スライド2（結論文と脚注[1]） | 12px | 3.9px | 字が接触 |
| 検出 | 02-20 スライド12（最後の箇条書きと脚注[1]） | 15px | 10.8px | 字が重なる |
| 非検出 | 06-22 スライド6，7（数値カード） | 7〜9px | −1.9〜−6.2px（離れている） | 問題なし |
| 非検出 | 07-10 スライド2，5，6 | 0〜4px | −6.6〜−13.4px | 問題なし |
| 非検出 | `decks/example`スライド9，`fixtures/toshiba-slide.md` | 重なりあり | −6〜−13px | 問題なし |
| 非検出（除外） | 02-20 スライド10，15，16（数式） | 数式内部と周囲で重なり | 除外 | 問題なし |
| 非検出（描画範囲） | 06-11 スライド3，06-26 スライド3，07-10 スライド2，07-06 スライド3 | メディアの箱と重なり | 描画範囲とは重ならない | 問題なし |

* 行矩形の高さは，較正したすべてのスライドでフォントの`fontBoundingBoxAscent + fontBoundingBoxDescent`と一致した（比1.00）．
* 上記以外のスライド，example 2本，既存fixturesでは候補が出なかった．
* 重なり判定の追加で，24枚のデッキの監査時間は数十ms増えた（描画と読み込みは数十秒）．

### Interpretation

* 行矩形はCJKフォントで字面の上下に約0.2emずつ広く，詰めた行間の数値カードで誤検出を生む．グリフ箱に狭めると，これらは離れていると判定される．
* 見える重なりの最小（3.9px）と誤検出候補の最大（−1.9px）の間に，2pxの許容幅を置ける．ただし余裕は小さい．
* グリフ箱の計測は描画フォントに依存するため，Noto Sans JPがない環境では3.9pxの境界例が変わる可能性がある．

## Conclusion

`adopted`．グリフ箱による計測，上記の除外規則，2pxの許容幅（メディアはさらに大きさの2%）を採用する．ISS-0021の実装とADR-0001の方針に沿う．

## Reusable Findings

* 文字の重なりは行矩形ではなく字面で測る．行矩形はCJKで上下に約0.2em広い．
* 数式は内部のグリフ箱が重なって配置されるので，要素単位で除外する．
* メディアは箱ではなく描画範囲（`object-fit`の余白やSVGの`getBBox()`）で測る．
* 脚注は絶対配置でも比較対象に残す．本文が脚注へ流れ込むのが典型的な不具合である．

## Artifacts

* 実装：ISS-0021の変更（`src/visual-overflow.js`，`src/deck-validator.js`，`fixtures/text-overlap-slide.md`）．
* 対象デッキは外部リポジトリのため，結果は本文に要約した．

## Revisit Conditions

* 他の著者のデッキやフォント環境で，2px付近の誤検出または見逃しが出たとき．
* メディア同士や，文字と枠線・背景の重なりを検出対象に加えるとき．

## Related Records

* XR-0001の較正対象と方法を引き継ぐ（`depends_on`）．
* ADR-0001の判定方針の判断材料である（`informs`）．
