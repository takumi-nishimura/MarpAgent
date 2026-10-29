---
id: XR-0004
title: "Evaluate fixed D2 rendering configuration and Japanese fonts"
type: exploration
status: adopted
date: "2026-10-21"
authors: [codex-main]
scope: ["diagrams","fonts"]
tags: [integration]
depends_on: []
informs: ["ADR-0009"]
evaluates: []
supersedes: []
issues: ["ISS-0053"]
artifacts:
  revisions: ["49c9ce7","34f8d9f"]
  manifests: ["docs/evidence/integration-2026-10-21/validation.json"]
  results: ["docs/d2.md","fixtures/d2-components.md"]
  commands: []
---

# Evaluate fixed D2 rendering configuration and Japanese fonts

## Context and Question

D2 0.9.0をTALA既定で共通描画へ接続し，原稿設定，日本語，数式，失敗時の出力保持を再現できるか．font glyphの存在と実際のnode内配置を区別する．

## Motivation

一般tourの説明だけでは固定版の設定優先順位とfont slotの挙動を確定できない．生成SVGと実CLIを使い，部分出力やfallbackを成功として扱わない必要がある．

## Hypothesis

source preludeで既定値を与えれば原稿が上書きできる．明示した日本語fontが埋め込まれ，ラベルがnode内に収まる．非ゼロ終了やtimeout・出力超過はcache/export成功にならない．

## Approach

擬似CLIのprocess/cache/失敗unitと，固定版の実CLI・Chromium表示を分けた．SVGを構文解析してID/CSS/fontを検査し，ブラウザでも字形とnode境界を確認した．M PLUSによる負の条件とNotoの最終条件を保存した．

## Evaluation Conditions

Linux x64，Node25.6.0，D2 0.9.0，TALA seeds [1;2;3]．MARP_AGENT_D2_PATHで実体を指定，MARP_AGENT_D2_FONT_PATHはSHA-256確認済みNoto Sans JPをfonttools4.60.1でweight400へ固定したTTF．入力はfixtures/d2-components.md．CIの取得・固定手順は.github/workflows/quality-gate.ymlにある．

実行コマンドはMARP_AGENT_D2_PATHとMARP_AGENT_D2_FONT_PATHを設定したnpm run test:d2．process/cache/SVG/pluginはtests/unit/d2-*.test.js．比較するfontとlayoutを明示し，失敗時に自動置換しない．timeoutは図ごと30秒，入力1MiB，stdout/stderr各16MiB．metricsは設定優先順位，終了結果，cache再利用，字形，ID，ラベル境界，offline表示，既存出力保持．

## Observed Results

TALAが同梱され，原稿のelk指定はpreludeより優先された．明示layout flag/環境変数は原稿より優先する．TALAのsource data seedはflagより優先し，scalar seedは拒否される．vars:nullはD2既定へ戻り，入れ子のd2-config:nullはpreludeを保持した．

D2同梱Latin fontに日本語が不足する．通常TTFのitalic slotへの自動流用はTALA内部エラーを起こし，M PLUSでは字形があっても一部labelの高さがnodeから外れた．Noto400条件では境界検査を通過した．日本語edge labelは通常書体を使う場合style.italic:falseを明示する．

workerのD2 unit31件と実CLI6件はskipなしで成功した．HTML/overviewのD2なし・通信遮断閲覧，日本語・長label・LaTeX・group・near・縦横比・同一図複数挿入を確認した．HTML/PDF/PPTX/3PNG/screenshotは生成成功し，PNGを確認した．別PDF/PowerPoint viewerでの目視は未実施．

限定レビューでCSS文字列URL，pipe-free detached子の残留，inline block内のimport見逃しを再現した．5f7d501／5699ea4／d7d077dで修正し，担当の修正前REDと修正後37 unit／7実CLI成功を確認した．mainも最終be3fc23で37 D2 unitを含む全体strict gate，実CLI7件，元repo・compiler・font入力を除いたoffline ZIP2件を実行し，成功した．Linuxの新しい子終了回帰は3試行で対象子が終了し，無関係なprocessを保持した．独立した修正後の再確認はサービス応答制限で未実施である．

## Conclusion

固定CLIと明示fontによる初版を支持し，ADR-0009へ採用判断を反映する．任意のTTFの計測精度をglyph検査だけで保証する仮説は棄却する．source/SVGの保守的検査とLinuxの追跡可能な子の後処理は確認したが，任意悪意あるCLIの隔離や任意detached treeの終了は保証しない．

## Reusable Findings

通常とitalicのfont slotを分け，実際の選択faceを検査する．sourceの設定とadapter固定の実行制限を分ける．非ゼロ時の部分SVGは捨て，同じcompile結果からvalidation/exportの成否を伝える．

## Artifacts

[利用と再現条件](../d2.md)，[原稿](../../fixtures/d2-components.md)，ISS-0053の詳細コマンドを参照．[代表画像3枚と環境・hash](../evidence/ISS-0053-d2/README.md)を保存し，mainも全3枚を確認した．統合版c3b6f5dの実CLI受入は6件成功，失敗・skipなしだった．一時成果物は/tmp/marpagent-parallel-20261021/issue61-artifacts/．mplus-counterexample.htmlとmplus-negative-test.logは不成立条件を残す．

最終be3fc23のコマンド・条件・件数・ログhashは[統合検証manifest](../evidence/integration-2026-10-21/validation.json)に保存した．初期画像のrevisionと最終検証revisionを区別し，過去の観測値を上書きしない．

## Revisit Conditions

D2版・layout engine・font・OSの変更，外部依存やboard対応の追加時に新しいXRで再検証する．source guardはOS sandboxではない．

## Related Records

ADR-0009へ判断材料を提供する．
