---
id: ADR-0010
title: "Make the improved lab typography the default"
type: decision
status: accepted
date: "2026-10-21"
authors: [codex-main]
scope: [themes, authoring]
tags: [lab, typography]
depends_on: []
supersedes: [ADR-0007]
issues: [ISS-0047, ISS-0048, ISS-0049]
artifacts:
  revisions: ["7b33018", "4029409"]
  manifests:
    - docs/evidence/integration-2026-10-21/lab-default-validation.json
  results:
    - docs/lab-refinement.md
    - docs/evidence/ISS-0049-lab-default/README.md
  commands: []
---

# Make the improved lab typography the default

## Context and Problem Statement

#57では，改善前後を切り替えて比較できるようにlab-refinedを選択式で実装した．本人から「lab-refinedとして増やす必要があるのか？labを更新するのではいけないのか？」という指摘があった．labそのものの改善が目的であり，比較のための選択肢を恒久的な公開仕様へ増やすと，原稿の追加指定と二種類の外観の保守が必要になる．

## Decision Drivers

既存のtheme: labと通常のclass指定だけで改善を使えること．色付き強調・マーカー・構図・明示的な原稿側の上書きを保つこと．既定表示が変わる点と折返しへの影響を明記し，旧版との画素一致を新しい完了条件にしないこと．paperの独自寸法と他テーマを保持すること．

## Considered Options

1. lab-refinedを恒久的に残す．比較や段階移行は容易だが，改善を使うための追加指定が必要になり，外観の選択肢が増える．
2. 改良済みの外観をlabの既定へ取り込む．通常の原稿で利用できる一方，既存labの文字幅・行間・captionなどの描画差を確認する必要がある．
3. 新しい別テーマを作る．独立したブランドや用途の要件がないため，今回の目的には不要な保守対象を増やす．

## Decision Outcome

改良済みのlab外観をtheme: labの既定へ取り込む．lab-refinedによる選択を廃止し，代わりのlegacy classや互換aliasは追加しない．原稿のclass: normalやtitleを維持して改善を利用できるようにし，既存の色schemeと原稿側の上書きを尊重する．

ADR-0007のうち，lab外観を選択式にする判断を変更する．同ADRで扱った.bodyの明示的な残余配置，.figure-natural，class診断を非blockingの助言にする判断は維持する．本文wrapperの必要性は外観の選択とは別であり，この変更で全スライドを.bodyへ自動変換しない．

## Consequences

labを指定するだけで文字階層・caption・脚注・表などの改善を使える．二種類のlab外観の維持や，スライドごとのlab-refined追加は不要になる．既存のlab原稿も見た目が変わるため，特に長文・長caption・脚注の多いページは再描画して確認する．過去の画像・XRは当時の条件の記録として保持する．

paperの独自の文字寸法，muji/toshiba，共通のbody/header-gapは今回の変更対象にしない．文字の既定化だけでは既存の過密原稿や.bodyなし縦長図の欠けを解消しない．

## Validation

XR-0005で，追加classなしのlabが改善済みの文字・caption寸法を使うこと，色付き強調と上書きを保つこと，paperと他テーマの互換性，代表原稿の収まりを確認した．既定表示を要求するbrowser回帰でRED→GREENを記録し，固定fontによる37ページ比較とmainの統合gateを実施した．captionの折返し差2箇所と旧baselineに残る欠けを明記し，未検査の原稿での収まりを保証しない．

## Related Records

ADR-0007を置換し，当時の判断本文は変更しない．XR-0003は選択式実装の比較結果として保持し，新しい条件はXR-0005へ記録する．ISS-0049とPR #62で実装と検証を追跡する．
