---
id: ADR-0009
title: "Render D2 fences with a pinned external CLI"
type: decision
status: proposed
date: "2026-10-21"
authors: [codex-main]
scope: ["diagrams","exports"]
tags: [integration]
depends_on: []
supersedes: []
issues: ["ISS-0053"]
artifacts:
  revisions: ["00c2e2a","49c9ce7","34f8d9f"]
  manifests: []
  results: ["docs/d2.md"]
  commands: []
---

# Render D2 fences with a pinned external CLI

## Context and Problem Statement

本人はD2の積極採用とMarkdown内のd2フェンスからの描画を求めた．プレビューだけの変換ではvalidation，静的export，ZIPで図や失敗の扱いが分かれるため，共通engineで処理する必要がある．

## Decision Drivers

原稿を正本とし，生成図の管理ファイルを増やさない．原稿のD2設定を尊重し，版・実効設定・フォント・実行制限を固定する．閲覧者にはD2を要求せず，部分SVGやフォント不足を成功としない．

## Considered Options

1. 手動でSVG生成する．既存機能で可能だが原稿と生成物の更新が分かれる．
2. JS/WASMまたはbrowser rendererを導入する．別の初期化・フォント・出力接続の評価が必要になる．
3. 固定したhost CLIを共通Marp pluginから呼ぶ．同期描画へ接続しやすく，外部導入とprocess管理が必要になる．

## Decision Outcome

D2 0.9.0の外部CLIを明示導入し，d2フェンスからだけ呼ぶ．runtimeで自動導入しない．TALAとseed [1; 2; 3]はsource preludeとし，原稿の標準設定を優先する．継承したD2等の環境設定を除去し，出力先・watch・timeout等はadapterが管理する．詳細な優先順位はXR-0004に残す．

初版は信頼済みのローカル原稿内で完結する単一静的図とする．import・画像・link・複数board・animation・外部layout pluginを拒否する保守的guardと，生成SVGのXML/CSS/font検査を併用する．これを未信頼原稿のOS隔離とは扱わない．

成功SVGだけを内容に基づくcacheへ保存し，ID/CSS/font名を図ごとに隔離する．生成HTMLのD2診断carrierをvalidationとexportで共有し，ZIPは再compileせず同じHTMLをassertする．日本語fontは利用者が明示し，OSから収集しない．

## Consequences

全描画経路で同じ図を利用でき，配布HTMLはD2なしで表示できる．host CLIと適切なフォントの導入が必要になる．任意のTTFの計測精度，未信頼原稿の隔離，外部資源の依存追跡，macOS/Windowsのprocess挙動は初版の検証範囲を超える．Mermaidは維持する．

## Validation

XR-0004に固定版・日本語・数式・negative font条件を記録する．workerでD2 unit31件，実CLI6件，既存関連126件を確認済み．mainは統合版の実CLI，offlineZIP，限定subprocess/SVGレビューとstrict gateを追跡する．

## Related Records

XR-0004が本判断を評価する．配布資源の境界はADR-0008．
