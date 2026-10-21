---
id: ADR-0007
title: "Adopt opt-in body layout and lab visual refinement"
type: decision
status: accepted
date: "2026-10-21"
authors: [codex-main]
scope: ["themes","validation"]
tags: [integration]
depends_on: []
supersedes: []
issues: ["ISS-0046","ISS-0047","ISS-0048","ISS-0049"]
artifacts:
  revisions: ["f397ea5","995073f","2cdef2e","05b9c7b"]
  manifests: ["docs/evidence/integration-2026-10-21/validation.json"]
  results: ["fixtures/layout-baselines/baseline-2026-10-21.md","docs/lab-refinement-stable-review.md"]
  commands: []
---

# Adopt opt-in body layout and lab visual refinement

## Context and Problem Statement

旧配置では親の残り高さが決まらず，縦長の図やcaption追加で下端が欠ける場合がある．一方，既存原稿は独自寸法とテーマの文字幅に依存する．構図と情報を保ちながら新しい配置を明示して使える境界が必要である．

## Decision Drivers

既存の表紙・paper・scroll・単独.fill，明示crop，色付き強調を保持する．高さの隠蔽で過密本文を合格させず，例外を少数の公開指定で調整する．テーマ改善による文字寸法の差は配置改善と分けて検証する．

## Considered Options

1. 全通常スライドへ残余配置と新typographyを自動適用する．追加記法は少ないが既存原稿の寸法が変わる．
2. ページごとに高さや文字サイズを指定する．互換性は高いが内容変更に応じた再調整が必要になる．
3. .bodyとlab-refinedを独立した明示選択にする．移行が必要になる代わりに既存の条件を保ち，両改善を個別に評価できる．

## Decision Outcome

通常スライド直下の.bodyを残余領域とし，figureはcaptionを確保してからmediaをcontainで収める案を採用する．既存.fillは単独利用の挙動を保持する．.figure-naturalは既存の明示寸法へ戻す選択肢とする．body，列，figureの調整変数は[theme contract](../theme-contract.md)を正本とする．

labの文字階層はlab-refinedで選び，既定labの置換は行わない．class診断は名前の存在を解析し，未定義と判断できない外部CSS・動的class等をunknownに分ける．存在判定は高さ前提やcascadeの成立を保証せず，非blockingの助言として元行・ページを付ける．

## Consequences

既存原稿を保った段階的移行ができる．明示wrapperとclassは必要であり，すべての原稿の自動配置や投影時の可読性を保証しない．縦長図では旧width utilityでも修復できたため，個別高さ指定の削減を一律の効果として主張しない．

## Validation

XR-0003の同一原稿・実フォント比較と，各ISSのunit/browser検証を根拠にする．main統合では対象unit60件とChromium46件を確認した．最終be3fc23のstrict gateはunit504件，fixture18件，browser113件成功，既存対象外1件skipだった．[統合記録](../design-assets-integration.md)と検証manifestに条件を残す．指定数の一般的削減を採用条件とはせず，互換性を保つ明示選択として受け入れる．

## Related Records

XR-0003が本判断を評価する．従来のテーマ・文字強調に関する判断を置換するものではない．
