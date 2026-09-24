---
id: ISS-0022
title: "Replace source typography-drift with a rendered minimum font size check"
type: issue
status: closed
date: "2026-09-23"
authors:
  - claude-code
scope:
  - src/visual-overflow.js
  - src/deck-validator.js
tags:
  - validator
  - feature
depends_on: []
supersedes: []
resolution: completed
resolved: "2026-09-24"
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Replace source typography-drift with a rendered minimum font size check

## Problem

`typography-drift` inspects source text only: `.text-xs2`, `.text-xs3`, `<small>`, and a regex for inline font sizes. It runs after `<style>` blocks are stripped (`src/deck-validator.js` `lintSlide`), so `<style scoped>section { font-size: 14px }</style>` is never seen. Meanwhile it flags classes whose rendered size may be acceptable. Under ADR-0001 it is now only a hint, so nothing reliably catches genuinely unreadable text.

## Goal

The validator reports body text whose computed font size is below a readable floor, based on the rendered slide.

## Acceptance criteria

- [x] The in-page audit records the computed font size of each visible text run, scaled to slide pixels.
- [x] Body text below a documented floor is an `error`. The floor is relative to the canvas height (e.g. at 720px height) and applies to paper canvases in proportion.
- [x] Footnotes, citations, captions, headers, footers, pagination, and text inside diagrams have a separate lower floor or are exempt; the choice is documented.
- [x] The XR-0001 decks produce no new errors unless the flagged text is confirmed unreadable in the screenshots.
- [x] Once this lands, `typography-drift` is removed from the hints or kept only as the fallback when rendering is unavailable.
- [x] Unit tests cover scoped `<style>` overrides, supported small utilities, and exempt footnotes.

## Notes

Follow-up to ISS-0019 under ADR-0001. XR-0001 observed a minimum rendered size of 10.4px, used only in citation footnotes (0.4em of a 26px base), in accepted decks.

2026-09-24：実装した．`auditSlidesInPage`は，表示されている各テキストランの計算済みフォントサイズに，スライド内の`transform`，`scale`，`zoom`の縦倍率を掛けてスライドpxで記録する（`textRuns`）．切り取り後に1px以下しか見えないテキスト（KaTeXのMathML複製など）は対象外とする．下限未満のランを`smallText`として返し，描画に成功した検証ではスライドごとに1件の`text-too-small`（`error`）にまとめる．メッセージは本文を32文字で切った断片，px値，本文／副次の別，下限を示す．描画に成功した場合は`overflow-risk`と同様に`typography-drift`をヒントから外し，描画できないときのフォールバック警告としてのみ残す．

下限は1280×720の基準キャンバスで本文12px（高さの1/60），副次テキスト8pxとした．副次テキストは脚注（クラス名に`footnote`を含む要素），`sup`/`sub`による引用番号，KaTeXの上付き・下付き（`mtight`），ルビ（`rt`），キャプション（`figcaption`，`caption`，クラス名に`caption`を含む要素），`header`/`footer`である．入れ子のSVG内のテキスト（Mermaid，fit見出し）はフォントサイズが描画上の大きさを表さないので従来どおり測らず，ページ番号は疑似要素なので対象にならない．

較正は，XR-0001の8デッキ，`decks/example/slide.md`，`decks/example-paper/paper.md`，`fixtures/`で行った（計約1,600のテキストラン）．16:9のデッキで最小の本文は17.5px（06-26-nec-interview），次いで18.9px，19.2px（muji fixture）だった．副次テキストの最小は脚注の10.4px（02-20-midterm-examination），キャプションの12px（06-26-nec-interview）だった．本文12pxは，これらの本文と，テーマで最小の`.text-xs3`（13px）を通しつつ，`.text-xs3`を0.8emの文脈に入れた10.4pxや，scoped `<style>`で本文を12px未満にしたものを検出する．副次8pxは既定の脚注10.4pxに約30%の余裕を残し，基準を20px未満に下げて脚注が8px未満になったものを検出する．スクリーンショットで確認すると，10.4pxの脚注は小さいが判読でき，本文10pxの`fixtures/scoped-small-text-slide.md`は投影では読めない．どちらの下限も「読めない」ことの境界であり，推奨サイズではない．実装後の検証で，対象デッキに`text-too-small`は1件も出なかった．

キャンバスへの換算は，ISS-0023の余白のような高さ比ではなく`min(width / 1280, height / 720)`とした．高さ比ではA4縦（794×1123）の倍率が1.56になり，本文の下限が18.7pxになって，`decks/example-paper/paper.md`の本文（10px，7.5pt）をすべて検出してしまう．`min`は基準スライドがキャンバスに収まる倍率で，16:9では高さ比と一致し，A4縦ではスライドをページ幅に印刷したときの倍率0.62になる．このときの下限は本文7.4px，副次5pxで，example paperの本文10px，フッター6px，所属行7.3pxはいずれも通る．4:3など16:9より縦長のスライドでは高さ比より下限が低くなり，検出が緩い側に倒れる．

ADR-0001は変更していない．この規則は同ADRの「判読限界未満の文字（ISS-0022）」の実装であり，下限の値，副次テキストの範囲，キャンバス換算はこのNotesを正本とする．`fixtures/tiny-text-slide.md`の`<small>`は20.8pxで描画されるので，描画後は指摘なしとし，描画できないときだけ`typography-drift`を期待する．描画で検出する例として`fixtures/scoped-small-text-slide.md`を追加した．
