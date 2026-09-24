---
id: ISS-0021
title: "Detect overlapping text in rendered slides"
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

# Detect overlapping text in rendered slides

## Problem

The rendered check reports content that leaves the canvas, but not content that collides inside it. In XR-0001, slide 12 of the 2026-02-20 deck has its last bullet overlapping the citation footnote and touching the bottom edge. It was a visible defect, but no measured finding reported it.

## Goal

The validator reports overlapping text as a measured `error` under ADR-0001, with few false positives on accepted decks.

## Acceptance criteria

- [x] The in-page audit reports text line boxes from different blocks that intersect each other, or that intersect media, by more than a small tolerance.
- [x] Intended overlays are excluded, such as text on a callout background, captions on figures, absolutely positioned decorations, headers, footers, and pagination. The exclusion rules are documented.
- [x] Findings name both colliding elements and the overlap size.
- [x] Slide 12 of the XR-0001 midterm deck is reported, and the other XR-0001 slides produce no new errors.
- [x] Unit tests cover a collision, an overlay that must not be reported, and a clean slide.

## Out of scope

- Aesthetic spacing judgments, such as items being "too close".

## Notes

Follow-up to ISS-0019 under ADR-0001.

2026-09-24：実装した．描画に成功した検証で，異なるブロックに属する文字同士，または文字とメディアの交差を`text-overlap`（`error`，スライドごとに1件）として報告する．指摘には衝突した2要素と重なりの深さ（交差矩形の短い辺，px）を示す．

* 文字は行矩形ではなく字面（canvasの`measureText`による`actualBoundingBoxAscent/Descent`）で測る．メディアは`object-fit`の余白を除いた描画範囲，インラインSVGは`getBBox()`の描画範囲で測る．
* 交差が縦横とも2pxを超えたら指摘する．メディアとの交差は，切れの判定と同じく大きさの2%まで許す．
* 対象外：header／footer，数式（`mjx-container`，`.katex`，`math`），入れ子のSVG内の文字，`aria-hidden`の装飾，同じ`figure`内のキャプション，背景を持つ自分のブロック内の文字，絶対配置のメディア．絶対配置の文字（脚注）は比較対象に残す．
* 描画で検出する例として`fixtures/text-overlap-slide.md`を追加した．

較正の方法と結果（検出2件，誤検出候補の除外，許容幅の根拠）はXR-0002に記録した．lab decksでは02-20-midterm-examinationのスライド2と12だけが検出され，どちらも見える重なりである．スライド2は同じ種類の新しい`error`だが，見える不具合なので受け入れ基準の意図に反しない．ADR-0001は変更していない．
