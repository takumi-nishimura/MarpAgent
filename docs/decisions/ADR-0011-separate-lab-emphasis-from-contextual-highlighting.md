---
id: ADR-0011
title: "Separate lab emphasis from contextual highlighting"
type: decision
status: accepted
date: "2026-10-21"
authors: [codex-main]
scope: [themes, authoring]
tags: [lab, emphasis, highlighting]
depends_on: [ADR-0010]
supersedes: []
issues: [ISS-0049]
artifacts:
  revisions: ["27c5370", "dd1367c", "8e18b1f"]
  manifests:
    - docs/evidence/integration-2026-10-21/emphasis-roles-validation.json
  results:
    - fixtures/lab-emphasis-slide.md
    - docs/lab-refinement.md
  commands: []
---

# Separate lab emphasis from contextual highlighting

## Context and Problem Statement

マーカーの帯を均一にする修正では，em／.marker／markが同じ見た目になった．利用者はmarkの本来の役割と独自.markerの必要性を問い直し，強調・重要・注目の3種類を区別する明暗・複数行の見た目案を確認して承認した．同じ外観の記法を増やすより，執筆時の意図から選べる体系が必要である．

## Decision Drivers

記法から文章上の役割を判断できること．色付き太字と細い帯を維持し，markを見分けられること．背景が隣接行へ迫らず，明暗・複数行でも文字と留保を読めること．既存原稿と個別上書きを壊さないこと．

## Considered Options

1. em／.marker／markを同じ帯へ統一する．見た目は揃うが，markを区別できず，記法を選ぶ理由が弱い．XR-0006の実装として保存する．
2. 強調は細い帯，重要は色付き太字，注目は淡い背景塗りにする．新規原稿はMarkdownのem／strongとHTML markを使う．.markerは互換用に残す．利用者が確認した案である．
3. .markerを直ちに削除する．公開記法は減るが，このrepository外の原稿の使用は未確認であり，急な互換性破壊を伴う．

## Decision Outcome

案2を採用する．新規lab原稿では`*強調*`／`_強調_`，`**重要**`，`<mark>注目範囲</mark>`を使う．markは引用や説明で取り上げる範囲に用い，確認状態のラベルや重要性の段階とはしない．

markは本文色を継承し，中央80%を淡く塗り，上下各10%は透明にする．承認例の明背景rgba(215,182,0,0.24)，暗背景rgba(250,220,90,0.2)，左右padding 0.08emを基準とし，色の正本をlabのDESIGN.mdに置く．inlineの自然な折返しとcloneを保つ．em・strongの既存表現とcaption balanceは維持する．

.markerは新規原稿の推奨から外すが，既存の細い帯として保持する．警告や自動置換は追加しない．使用目的が明確な場合だけemまたはmarkへ移行する．この変更の対象はpaper以外のlabであり，paper・muji・toshibaの表示体系は変更しない．

## Consequences

執筆者は3つの役割から記法を選べる．markの背景は前回の細い帯から変わるため，既存lab原稿を再描画する．.markerを残す分の互換CSSは維持するが，新規記法は増やさない．旧fixture・画像・XRは当時の証跡として保持し，新しい原稿と説明を別に用意する．

## Validation

利用者が明暗と複数行の提案ページを確認し，2026-10-21に採用を承認した．XR-0007で実fontの明暗2ページ，関連unit27件とbrowser16件，統合browser119件成功＋既存skip1件，新規原稿のstrict描画finding0を確認した．測定条件と未確認範囲は同XRへ記録した．

## Related Records

ADR-0010のlab既定化を維持し，強調の役割と.markerの推奨方針を具体化する．前回の全種類を帯へ揃えた試行はXR-0006に残し，その観測値・結論は書き換えない．
