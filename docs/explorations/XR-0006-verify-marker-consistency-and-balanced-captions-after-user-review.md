---
id: XR-0006
title: "Verify marker consistency and balanced captions after user review"
type: exploration
status: adopted
date: "2026-10-21"
authors: [codex-main]
scope: [themes, tests]
tags: [lab, typography, captions]
depends_on: [XR-0005]
informs: [ADR-0010]
evaluates: [ADR-0010]
supersedes: []
issues: [ISS-0049]
artifacts:
  revisions: ["9836b76", "38b554d", "b4938ca", "6f420fd", "94eb340", "185084d"]
  manifests:
    - docs/evidence/integration-2026-10-21/lab-feedback-validation.json
  results:
    - docs/evidence/ISS-0049-marker-feedback/README.md
    - docs/evidence/ISS-0049-marker-feedback/summary.json
    - docs/evidence/ISS-0049-caption-feedback/README.md
    - docs/evidence/ISS-0049-caption-feedback/summary.json
  commands:
    - npm run quality:gate:strict
    - MARP_AGENT_STRICT_E2E=1 npm run test:e2e
    - npm run design:lint
    - npm run design:tokens:check
    - uv run .github/records.py validate
---

# Verify marker consistency and balanced captions after user review

## Context and Question

利用者がPR62の比較画像で「一行と〜」のマーカーだけ太く，「要確認」の塗りが上の行へ重なるように見えると指摘した．captionには文節区切りに加え，複数行の長さも均すことを明示的に希望した．旧XR-0005を変更せず，この指摘に対する修正を評価する．

## Motivation

見た目の不均一をfontの太さと背景の形に分けて確認し，既存の文章・留保・構図を保って直す．captionの既存BudouX処理を調べ，必要な追加だけを行う．

## Hypothesis

マーカーの帯を揃えれば行間の塗りが接近する印象を減らせる．captionは文節や明示nowrapを保ちながら行幅の差を減らせる．文字欠落，既存構図の崩れ，paper／他テーマへの意図しない変更を反証条件とする．

## Approach

#57担当がHerdr worktreeでマーカーを，mainが統合worktreeでcaptionを担当した．背景帯と行幅の回帰でREDを確認し，局所変更を統合した．同じ原稿・fontでbefore／afterを保存し，mainが明暗のマーカーとcaption画像を目視した．新しい独立レビュワーは起動していない．

## Evaluation Conditions

基準9836b76，統合CSS94eb340，最終テスト修正185084d．Linux WSL2 x64，Node25.6.0，Marp Core5.0.2，Playwright1.58.2，Chromium145.0.7632.6，1280×720／DPR1．Noto Sans JP400/700の固定ファイルを使用し，CDPで実際の使用fontを確認した．browserは共有lockで直列化した．原稿・CSS・font・PNGのhashは各summary.jsonへ保存した．

## Observed Results

### Observations

マーカー文字はいずれもweight400だった．帯高はem11.1px，.marker14.8px，mark37pxから，すべて11.1pxへ揃った．隣接する背景の隙間は2px→27.9px．旧版にも実際の交差はなく，文字位置・折返し・strongは保持した．帯の値はinline boxとcomputed背景から計算したCSS pxであり，画素の塗り面積ではない．担当のbrowser7件・unit27件が成功した．

captionは既に日本語の12箇所へBudouX区切りを入れていた．text-wrap-style: balance追加後，短い行／長い行の幅は英語0.310→0.958，日本語0.258→0.942になった．この2例では行数2，全文・区切り・図／captionのbox寸法が一致した．回帰のREDは明暗2件，修正後はChromium／Firefox計8件成功．Firefox初回は日本語font不在で1件失敗し，明示登録後に成功した．

統合strict gateのunit504件とfixture18件は成功した．browserは旧来の全面mark塗りを要求する1件が失敗したため，新仕様の帯を確認するoracleへ更新した．他テーマでは全面塗りの期待を保持する．browser全体の再実行は119件成功，既存Firefox native touch1件だけskip．design lintはerror／warning0，生成token一致，テーマ再生成の差分なし．

### Interpretation

マーカーはfontの太さではなく背景形状の不均一だった．captionは既存の文節境界を利用した行長調整で改善した．D2／ZIPのcode・依存・runtimeには変更がなく，4029409での実D2 7件・D2入りZIP2件の結果を再利用し，今回再実行したとは扱わない．

## Conclusion

採用．labの帯を統一し，captionの行長を均す．paper・他テーマ，本文の折返し方式，明示的なnowrap／背景上書きを維持する．Safari／macOS実機と投影時の読みやすさは未確認．長文・別font・別browserで同じ行数になることは保証しない．PRはDraftのままローカルレビューを継続する．

## Reusable Findings

文節単位の折返しと行長の均しは異なる機能である．wrap modeを変更しないlonghandなら既存nowrapを保てる．全面塗りを帯へ変える場合は，背景の有無をbackground-colorだけで検査する既存oracleも見直す．

## Artifacts

新しいmarker-feedback／caption-feedbackの画像と条件を保存した．旧XRと比較画像は保持する．Mac用確認ページには今回の比較を先頭へ追加する．

## Revisit Conditions

font・browser版，captionの寸法，markerの帯・行高・配色を変更する場合．Macで改行や塗りが異なる場合はその環境で確認する．

## Related Records

ADR-0010の既定labを対象とした追試．前回の観測値はXR-0005に残す．
