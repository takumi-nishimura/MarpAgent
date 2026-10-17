---
id: ISS-0042
title: "Track production dependency audit findings"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - package.json
tags:
  - dependencies
  - security
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm audit --omit=dev --json
---

# Track production dependency audit findings

## Problem

`npm audit --omit=dev`でproduction依存に17件（11 high）の脆弱性が残る:

- 大半は`@marp-team/marp-cli`がbundleする依存（puppeteer周辺: `@xmldom/xmldom`, `extract-zip`, `js-yaml` 4.3.1, `picomatch` 4.0.3 等）で，`fixAvailable`がなく，upstreamの更新待ちである．
- 直接依存では`markdown-it` 14.1.1 がmoderate（smartquotes関連の二次計算DoS；14.3.0でも対象レンジ内），`katex`がlow．
- 実害はローカル信頼境界内のMarkdown解析に限られるが，「いつでも検知できる状態」かつ「意図的に受け入れている」状態の記録がまだない．

## Goal

残存するaudit指摘と受け入れ方針が記録され，結びついた依存更新が入ったとき検知し，必要なら素早く追従できる．

## Acceptance criteria

- [ ] 本issueのNotesに，調査時点のaudit詳細（package名・severity・fixAvailable）と，それぞれの受け入れ/対応方針を記載する．
- [ ] `markdown-it`（14.3.x）や`katex`の直接依存更新が可能なら上げ，audit件数の減少を確認する．
- [ ] marp-cliの新版がbundle依存を解消した場合に追従できるよう，`npm audit --omit=dev`をgate（または定期実行）に組み込み，基準を示す．
- [ ] 脆弱性の新規報告が増えた場合にも対応方針を本issueに追記し，「本issue参照」をPRチェックの指針として示せる状態にする．

## Out of scope

`npm audit fix --force`による破壊的なメジャーアップ，dev依存の清理，セキュリティ欠陥の新規実装調査．

## Approach

まず直接依存の更新（markdown-it/katex等）を試し，bundle系は文書で受け入れを記録する．gateに件数増加で失敗させる方向づけを入れるか，定期実行のworkflowを置くかを決める（`.github/workflows/quality-gate.yml`）．

## Notes

2026-10-17: 精査レポートで検出；`npm audit --omit=dev --json`の詳細（17件，11 high，`fixed: ?`多数＝bundle済み）を取得済み．
