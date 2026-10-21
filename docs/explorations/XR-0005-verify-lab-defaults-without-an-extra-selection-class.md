---
id: XR-0005
title: "Verify lab defaults without an extra selection class"
type: exploration
status: running
date: "2026-10-21"
authors: [codex-main]
scope: [themes, tests]
tags: [lab, typography]
depends_on: [XR-0003]
informs: [ADR-0010]
evaluates: [ADR-0010]
supersedes: []
issues: [ISS-0049]
artifacts:
  revisions: ["1f303a5"]
  manifests: []
  results: []
  commands: []
---

# Verify lab defaults without an extra selection class

## Context and Question

lab-refinedで比較した外観を通常のlabへ取り込み，追加classなしで同じ文字階層と図説明を使えるか．既存の通常labとの見た目の変化と，paper・他テーマの互換性を分けて確認する．

## Motivation

利用者の目的はlab自体の改善であり，選択式の比較が済んだ後も公開classを増やす必要はない．一方，既定化によってすべてのlab原稿が対象になるため，新しい条件で描画と回帰を確認する必要がある．

## Hypothesis

追加classなしで改良済みの本文・見出し・caption・脚注・強調が適用される．代表の内容・構図を保ち，paperと他テーマの寸法，色scheme，明示的な上書きが維持される．不意のclipping，情報欠落，他テーマへの適用，品質閾値の緩和は反証条件とする．

## Approach

既存browserテストのoracleを，通常labで改善された寸法を要求する形に変更してREDを確認する．classによる選択を除去し，GREENを確認する．同じ実フォントを使う代表例の画像と計測値を保存し，mainで統合gateを実行する．過去の比較画像・記録・原稿を変更せず，新しい証跡へ保存する．

## Evaluation Conditions

基準はPR #62の1f303a5．実行環境はLinux x64，Node25.6.0，Marp Core5.0.2，Playwright1.58.2．browser実行は共有lockで直列化し，font設定と内容hashを新しい証跡へ記録する．対象は既定labの文字・強調・captionと.bodyの代表構図，paper，muji/toshiba，既存の図・コード・scroll・exportである．

## Observed Results

実行中．完了後に担当のRED/GREEN，固定fontの代表比較，mainの統合結果を追記する．

## Conclusion

未判定．通常labの既定動作と互換性を確認した結果から判断する．

## Reusable Findings

選択式の導入は比較段階の手段であり，恒久的な公開APIが必要な理由とは別に判断する．既定化では旧版との画素一致ではなく，意図した変更・内容保持・対象外の互換性を確認する．

## Artifacts

旧条件はXR-0003，新しい結果は本XRとdocs/evidence/ISS-0049-lab-default/へ保存する．

## Revisit Conditions

font・Marp/browser版，文字token，既定の構図やpaperの文字体系を変更するときに再評価する．

## Related Records

ADR-0010の採用を検証する．旧XR-0003の観測値は書き換えない．
