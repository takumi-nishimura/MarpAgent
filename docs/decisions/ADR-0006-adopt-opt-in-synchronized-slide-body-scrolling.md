---
id: ADR-0006
title: "Adopt opt-in synchronized slide-body scrolling"
type: decision
status: accepted
date: "2026-10-15"
authors:
  - Codex
scope:
  - scripts/scroll-slides-plugin.js
  - scripts/presenter-scroll.js
  - themes/src/_shared/_scroll.css
  - src/visual-overflow.js
tags:
  - presentation
  - scrolling
depends_on: []
supersedes: []
issues: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - node --test tests/unit/scroll-slides.test.js tests/unit/scroll-validation.test.js
    - npm run test:e2e:strict -- tests/e2e/scroll-slides.spec.js
---

# Adopt opt-in synchronized slide-body scrolling

## Context and Problem Statement

詳細な表や補足本文を1枚のスライド上で確認したい．Marp CLIのページ同期はページとfragmentを扱い，本文のスクロール位置は含まない．発表者画面で操作した位置を投影画面へ反映し，その逆の操作も許す必要がある．

## Decision Drivers

* 指定したページだけに適用し，通常のページ送りを維持する．
* ヘッダー，最初のトップレベル見出し，フッター，ページ番号を固定する．
* 同じデッキでも独立した発表セッション同士を混線させない．
* スクロール本文の下部も検証し，静的出力で欠ける内容を報告する．

## Considered Options

### Option 1：ページ全体を縦長化する

* 利点：通常の文書スクロールとして扱える．
* 欠点：Marpの固定キャンバスとページ送りの関係が変わり，発表者画面との位置同期を別途必要とする．

### Option 2：選択ページの本文だけをスクロールする

* 利点：スライドの位置と識別を維持し，本文の操作に範囲を限定できる．
* 欠点：静的出力には全内容を収められず，ブラウザー側の入力処理と同期が必要になる．

## Decision Outcome

### Chosen Option

Option 2を採用する．`<!-- _scroll: true -->`をMarpitのspot directiveとして登録し，トークン段階で本文を1つの`.marpagent-scroll-body`へ包む．ヘッダー，最初のトップレベル見出し，フッター，styleとscriptは外側へ残す．共有テーマで残りの高さを本文へ割り当てる．

スクロール位置は`scrollTop / (scrollHeight - clientHeight)`で同期する．同一デッキとネイティブBespokeの`marpBespokeSyncKey`で通信を分離し，ページ選択はBespokeに任せる．現在ページの本文操作を発信元とし，次ページのpreviewは発信元にしない．遅れて開いた発表者画面にも位置を渡し，ページ再訪時の位置を保持する．

### Scope

MarpAgentの設定を通したHTML発表と，lab／muji／toshibaの共有テーマに適用する．検証はbare HTMLの本文を重なりのある区間で順にスクロールして実施し，同じ描画エラーの重複検出を統合する．横方向の欠けは引き続きエラーとする．

### Non-goals

異なるコンピューター間の遠隔同期，自動改ページ，静的出力への全文展開は扱わない．長い本文を持つ静的出力は初期viewportのみを出力し，`scroll-export-overflow`を非ブロッキング警告として報告する．

## Consequences

### Positive

* 字を小さくせず，詳細な表や補足を発表中にたどれる．
* 別の発表セッションや通常ページの操作へ影響を限定できる．

### Negative

* 完全なPDF／PPTX／画像の配布資料が必要なら，本文を複数ページへ分割する必要がある．
* 検証の所要時間は長い本文のスクロール範囲に応じて増える．

### Neutral

* 自動修復としてスクロールを導入せず，意図した長い表や補足に明示的に使用する．
* 検証レポートのスクリーンショットは初期viewportを示すため，下部の視覚確認にはHTMLを使用する．

## Validation

* `tests/unit/scroll-slides.test.js`：実際のCoreでspot directive，ラップ，通常／非表示ページ，コード例を確認する．
* `tests/unit/scroll-validation.test.js`：縦方向の意図的な長さを警告とし，下部の数式エラー／極小文字と横方向の欠けを検出する．
* `tests/e2e/scroll-slides.spec.js`：CLI生成HTMLの実際の発表者popupで同期と操作，遅延参加，再訪，分離，固定部分を確認する．

## Related Records

* ADR-0001の描画測定を正とする検証方針に従い，ADR-0005の描画エラー検出をスクロール本文全体へ適用する．
