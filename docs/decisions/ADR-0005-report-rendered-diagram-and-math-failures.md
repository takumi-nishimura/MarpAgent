---
id: ADR-0005
title: "Report rendered diagram and math failures"
type: decision
status: accepted
date: "2026-10-15"
authors:
  - codex
scope:
  - scripts/mermaid-plugin.js
  - src/visual-overflow.js
  - src/deck-validator.js
tags:
  - validation
  - rendering
depends_on:
  - ADR-0001
  - ADR-0004
supersedes: []
issues: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm test
    - MARP_AGENT_REQUIRE_VISUAL=1 npm run validate:fixtures
    - npm run test:e2e:strict
---

# Report rendered diagram and math failures

## Context and Problem Statement

Core 5にはMermaidの標準描画が加わり，MarpAgentは通常の図に独自の数式対応とキャッシュ，属性付きの図にupstreamの描画を使う．どちらも描画失敗時に図のソースへfallbackしうる．KaTeXとMathJaxも，コマンドが不正な場合に例外ではなくエラー表示を生成する．HTML出力の成功やレイアウト検査だけでは，これらの不具合を見逃す．

## Decision Drivers

* 実際の出力に残った図・数式の不具合を，スライド番号付きで報告する．
* 隠したスライドやコード例を失敗扱いにしない．
* ADR-0001の実描画を根拠とする方針，終了コード，JSON・SARIF・レポートの同一性を保つ．

## Considered Options

### Option 1：描画結果のエラー表示をブラウザで検出する

* 利点：CSSによる表示状態と実際のfallbackを確認でき，既存の実描画検査へ統合できる．
* 欠点：数式ライブラリのエラーDOMと，Mermaid拡張が付ける診断markerを維持する必要がある．

### Option 2：ソースを別に解析して不正な構文を検出する

* 利点：ブラウザがない環境でも実行できる．
* 欠点：実際に選択されたプラグイン，設定，表示状態との不一致が起きうる．

## Decision Outcome

### Chosen Option

Option 1を採用する．Mermaidのソースfallbackへ安全にescapeした診断markerを付け，ブラウザ検査でそのmarkerとKaTeX・MathJaxのエラー表示を収集する．図と数式の失敗をそれぞれ`diagram-render-error`，`math-render-error`として既存のfindingsへ統合する．

独自描画が失敗してもnative SVGが生成できた場合は，図の失敗とは報告しない．markerの多重付与を防ぎ，非表示スライド・コード例・描画されないコピーを除外する．

### Scope

Mermaid拡張，実描画検査，validatorのfindings，JSON・SARIF・レポートと，作成・修正用スキルのルール説明．

### Non-goals

数式の科学的正しさ，Mermaidの意味，非対応コマンドの自動置換，ブラウザなしでの構文診断．

## Consequences

### Positive

* 図や数式が壊れている出力を，正常なレイアウトとして通過させない．
* 既存のスライド同一性と終了コード1を使い，CLI・レポート・CIから修正箇所を追える．

### Negative

* upstreamがエラーDOMを変更する場合は検出方法の見直しが必要になる．
* 実描画を利用できない場合に，この規則が確認済みとは言えない．

### Neutral

* ソースheuristicsと，描画不可時のfallback／strictの方針はADR-0001に従う．

## Validation

* `fixtures/render-errors-slide.md`で本文数式，通常とnativeの図，図中数式の失敗と，非表示スライド・コード例を含む正常ケースを確認する．
* KaTeX／MathJaxの両方について，実描画からfindings，スライド同一性，SARIF，終了コードまで確認する．
* キャッシュ失敗の再試行と，正常なnative fallbackを含むMermaidの単体テストを確認する．
* 2026-10-15：単体284件，実描画fixture 16件，E2E 37件が成功した．ブラウザを使うコマンドには`PLAYWRIGHT_BROWSERS_PATH=/tmp/marpagent-playwright CHROME_NO_SANDBOX=1`を指定した．

## Related Records

* [ADR-0001](ADR-0001-make-rendered-measurement-the-authority-for-deck-validation.md)：実描画を根拠とする検証方針．
* [ADR-0004](ADR-0004-adopt-marp-core-5-with-explicit-full-engine.md)：Core 5とMermaidの描画構成．
