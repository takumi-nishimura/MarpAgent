---
id: ISS-0054
title: "Resolve newly reported glob and minimatch audit findings"
type: issue
status: in-review
date: "2026-10-31"
authors:
  - codex
scope:
  - package.json
  - package-lock.json
  - tests/unit/mathjax-cleanup-dependencies.test.js
  - tests/unit/marp-engine.test.js
  - docs/evidence/dependency-audit-followup-2026-10-31
  - scripts/audit-dependencies.js
  - .github/dependency-audit-baseline.json
tags:
  - dependencies
  - security
depends_on: [ISS-0042]
supersedes: []
artifacts:
  revisions:
    - 357ccfcaa725b6ab4f9686f98e9fdca486d51ea4
    - d03003f838042f9b020737b952d7f64dedb12a1e
    - c89b9146b33c94a3ddbff6536d5c66c844b15143
  manifests:
    - docs/evidence/dependency-audit-followup-2026-10-31/manifest.json
  results:
    - docs/evidence/dependency-audit-followup-2026-10-31/REPORT.md
    - docs/evidence/dependency-audit-2026-10-31/summary.json
    - https://github.com/takumi-nishimura/MarpAgent/actions/runs/41199500606
  commands:
    - npm ci --fetch-retries=0 --fetch-timeout=20000
    - npm run ci:full
    - uv run .github/records.py validate --strict-relations
    - npm run audit:dependencies
    - npm audit --omit=dev --json --fetch-retries=0 --fetch-timeout=20000
---

# Resolve newly reported glob and minimatch audit findings

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/67

## Problem

2026-10-31のmerge後，Dependency Audit run 41199500606が監査ステップでexit 1となった．機能CIは成功している．依存lockは前回の成功時と同じSHA-256 `0110761e135d67493d6a7fa42341b9ac23bd99b8ef63f8f2c056f241e6fa7ec1`である．

package／lock／baselineがMarpAgentとbyte一致するmy-decksの隔離checkoutで実レジストリを再照会し，production 12件（high 1，moderate 9，low 2）とgate失敗を確認した．従来7件に対し，`@mathjax/src`，`mj-context-menu`，`rimraf`，`glob`，`minimatch`が追加され，`@marp-team/marp-core`はlowからmoderateへ増加し，直接依存のaffected pathも増えた．

lockの経路は `@mathjax/src 4.1.3 → mj-context-menu 1.0.0 → rimraf 6.1.3 → glob 13.0.6 → minimatch 10.2.6` である．npmの検出と，実際に攻撃入力がアプリから届くことは同一ではなく，到達性は未確認である．

## Goal

baselineを緩めずに新規指摘とseverity増加を解消し，数式・exportの動作を保持した最小更新を両repoで受け入れられるようにする．既知の残存指摘は今回の改善と分けて報告する．

## Acceptance criteria

- [x] 依存chain，親の宣言範囲，アプリ内の利用経路と到達性を確認する．
- [x] 互換性を調べて最小修正を選び，実レジストリで新規指摘・severity増加を解消してgate成功を確認する．
- [x] baseline・保護設定・受入条件を緩めず，残存high 1件などを解消済みとしない．
- [x] 数式，HTML／PDF／PNG，portable bundleの関連回帰と完全受入れ，strict記録検証を確認する．
- [ ] my-decksへ共有修正を反映し，同一patchと下流の実行結果を別に確認する．

## Out of scope

既存PRの自動revert，課金・spending limitの変更，スライド内容の編集，既知指摘全件の一括解消は行わない．`npm audit fix --force`の旧Marp CLI/Core・MathJaxへのdowngrade案をそのまま適用しない．

## Approach

一次情報の修正版はglob 14.0.2，minimatch 11.0.1であり，現lockの親の宣言範囲を超える．親の互換更新，限定override，利用経路の除去等を比較してから選ぶ．major overrideを監査件数だけで採用しない．

## Notes

- [glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)と[minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)のGitHub Advisory Databaseへの公開・review日は2026-10-30．
- 10月30日の成功を，10月31日の実レジストリ結果へ流用しない．同じlockでも監査DBが更新される点に注意し，新しい失敗を記録する．
- ISS-0042の既存判断は変更しない．本ISSはMarpAgentの中央CLIで採番したもので，my-decksの同番号の素材修正記録とは別である．
- 今回は指摘の記録・再現だけを行い，依存・baseline・runtimeは変更していない．正本は追跡branchに保存し，修正時のPRへ含める．

## Remediation and acceptance — 2026-10-31

上の初回観測を保存したまま，依存修正を `c89b9146b33c94a3ddbff6536d5c66c844b15143` に分離した．`mj-context-menu@1.0.0 > rimraf@6.1.3 > glob` のみを14.0.3へ限定更新し，lockはminimatch11.0.3／path-scurry3.0.0／nonrecursive-glob-match1.0.3を解決した．Marp／MathJaxの版は維持している．親の最新releaseに互換更新先はなく，glob14.0.2には未修正minimatch処理が内包されるため，外部minimatchだけのoverrideも採らなかった．

固定mainのsource／trace調査では通常のdeck/material入力から対象glob APIへの既知の経路は見つからなかった．一方，CoreはMathJax sourceを実使用するためpackage全体の除去は不適切である．この限定的な到達性判断で監査を抑制せず，配布bundleとcaller APIを実行検証した．選択理由・一次資料・限界は[受入れ報告](../evidence/dependency-audit-followup-2026-10-31/REPORT.md)を参照．

実レジストリのproduction監査は12件（high1/moderate9/low2）から7件（high1/moderate3/low3）へ戻り，gateはexit1から0になった．新規5 packageと直接Core5のaffected path／severity増加が解消した．baseline SHA256 `181d2718ac3153409387f67d7d29c444b1ba2ad3bf54a608e4e3e5de34712092` はbyte不変で，既存high1等を解消済みとしない．raw audit自体は残存指摘によりexit1である．

最終npm ci後，同じclean revisionでci:fullを完走し，前後ともcleanを確認した．records76，D2 7，portable ZIP2，strict unit539，fixtures18，Chromium126，Firefox14が成功し，fail0．Firefoxの既存CDP native-touch skip1を別計上した．重点19単体回帰と6数式の変更前後HTML/CSS一致，4 font extensionsのglyph，HTML/PDF/PNG/移設後offline ZIPも確認した．正確なコマンド・環境hash・ログ・実件数は上記報告とmanifestへ保存した．

upstream実装・完全受入れは完了し，文書のみの追加についてstrict records/hash/diffを検証する．my-decksへの共有commit適用と独立受入れは別担当の結果待ちであり，最後のACは開いたままにする．公式親が修正版を取り込むか不要runtime依存を除去した場合は，fresh auditと回帰を通してこの限定overrideの除去を再評価する．
