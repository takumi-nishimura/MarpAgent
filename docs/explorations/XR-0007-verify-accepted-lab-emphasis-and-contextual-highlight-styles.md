---
id: XR-0007
title: "Verify accepted lab emphasis and contextual highlight styles"
type: exploration
status: adopted
date: "2026-10-21"
authors: [codex-main]
scope: [themes, authoring, tests]
tags: [lab, emphasis, highlighting]
depends_on: [XR-0006]
informs: [ADR-0011]
evaluates: [ADR-0011]
supersedes: []
issues: [ISS-0049]
artifacts:
  revisions: ["27c5370", "dd1367c", "8e18b1f", "a15dee9"]
  manifests:
    - docs/evidence/integration-2026-10-21/emphasis-roles-validation.json
  results:
    - docs/evidence/ISS-0049-emphasis-roles/README.md
    - docs/evidence/ISS-0049-emphasis-roles/summary.json
    - fixtures/lab-emphasis-slide.md
  commands:
    - MARP_AGENT_STRICT_E2E=1 npm run test:e2e
    - npm run marpx -- fixtures/lab-emphasis-slide.md -v --strict --format json
    - node --test tests/unit/theme-css.test.js tests/unit/design-cli.test.js
    - npm run design:lint
    - npm run design:tokens:check
    - uv run .github/records.py validate
---

# Verify accepted lab emphasis and contextual highlight styles

## Context and Question

利用者が強調・重要・注目の3種類を区別する明暗・複数行サンプルを確認し，採用を承認した．markの淡い背景を実際のlabへ取り込み，em／strongと互換用.markerの既存表示，caption balance，paper／他テーマを維持できるかを確認する．

## Motivation

前回の全種類を細い帯に揃える案ではmarkを見分けにくかった．今回の役割分担はADR-0011で採用し，旧XR-0006の観測値は保持する．

## Hypothesis

markは中央80%の淡い背景としてemの下30%の帯と区別でき，複数行の背景間に正の隙間を保つ．本文・留保の欠落，明暗の文字色の不整合，明示上書きや対象外テーマの破壊は反証条件とする．

## Approach

既存の#57 Codex担当がHerdr worktreeでCSS・token・関連回帰を変更し，mainが新規原稿・記法説明・実font描画・統合回帰を担当した．担当の差分をmainが確認して8e18b1fへ統合し，新しい独立reviewerは起動していない．旧fixtureは改変せず，引用中の注目範囲を示す新しい2ページを比較に使用した．

## Evaluation Conditions

beforeは27c5370のCSS，afterは担当dd1367c／統合8e18b1fのCSS．原稿は両条件で同じlab-emphasis-slide.md．Linux WSL2 x64，Node25.6.0，Marp Core5.0.2，Playwright1.58.2，Chromium145.0.7632.6，1280×720／DPR1，Noto Sans JP400/700を固定した．browserを共有lockで直列化し，原稿・font・CSS・PNGのhashをsummaryへ保存した．

## Observed Results

担当のREDはmarkの背景高が期待29.6pxに対し旧11.1pxで失敗した．修正後の同じ回帰は成功し，関連unit27件・browser16件も成功した．明暗，named scheme10組，継承色と局所背景／色指定，paperとmuji/toshibaを含む．design lintの新色未参照warning2件はcomponent roleを追記して解消し，3 designすべてerror／warning0，token一致を確認した．

mainのbrowser全体は119件成功，既存Firefox native touch1件だけskip．新規原稿2ページのstrict描画はmeasured／finding0．テーマ再生成は差分なし．同一原稿の新旧2ページの全文とpaginationが一致し，NotoSansJP-Regularがem／mark，NotoSansJP-Boldがstrongへ実際に使われた．markの中央80%は29.6px，連続する3行の背景間は各9.4px．emは11.1pxの帯である．mainが明暗のbefore／afterを目視し，役割の区別と留保を確認した．

比較準備中に，HTML出力時の外部font import除去がURL内のセミコロンでCSSを壊すharnessの問題を発見した．CSS parserによる除去へ修正した．同じ処理を使う過去のcaption HTMLも修復し，4枚の保存PNG hashと全測定値は再実行で一致した．productionのrender engineにこの変更はない．

## Conclusion

採用．承認済みのmarkをlabの既定へ取り込み，新規原稿の記法をem／strong／markの3種類へ整理する．.markerは削除せず互換用に残す．Safari／macOS実機の自動検証は未実施であり，別fontやbrowserで同じ寸法を保証しない．D2／ZIP／resolver／runtime依存には変更がなく，それらの実CLIテストを今回再実行したとは扱わない．

## Reusable Findings

強調の意味と装飾の見た目を分けて設計する．比較原稿は引用中の参照範囲のように用途を伝える例にする．CSS importの削除ではURL内のセミコロンを扱えるparserを使う．

## Artifacts

新しい画像・条件・再実行harnessはdocs/evidence/ISS-0049-emphasis-roles/，統合結果はemphasis-roles-validation.json．旧XR・画像・原稿を保持する．

## Revisit Conditions

font／browser，markの色・塗り範囲・行高，明暗scheme，.markerの削除方針を変更するとき．

## Related Records

ADR-0011を評価する．XR-0006のcaption balanceは維持し，同試行のmarkを細い帯にする実装だけを今回変更する．
