---
id: ISS-0042
title: "Track production dependency audit findings"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-18"
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
    - npm run audit:dependencies
    - node --test tests/unit/dependency-audit.test.js
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

- [x] 本issueのNotesに，調査時点のaudit詳細（package名・severity・fixAvailable）と，それぞれの受け入れ/対応方針を記載する．
- [x] `markdown-it`（14.3.x）や`katex`の直接依存更新が可能なら上げ，audit件数の減少を確認する．
- [x] marp-cliの新版が間接依存を解消した場合に追従できるよう，`npm audit --omit=dev`をgate（または定期実行）に組み込み，基準を示す．
- [x] 脆弱性の新規報告が増えた場合にも対応方針を本issueに追記し，「本issue参照」をPRチェックの指針として示せる状態にする．

## Out of scope

`npm audit fix --force`による破壊的なメジャーアップ，dev依存の清理，セキュリティ欠陥の新規実装調査．

## Approach

まず直接依存の更新（markdown-it/katex等）を試し，bundle系は文書で受け入れを記録する．gateに件数増加で失敗させる方向づけを入れるか，定期実行のworkflowを置くかを決める（`.github/workflows/quality-gate.yml`）．

## Notes

2026-10-17: 精査レポートで検出；`npm audit --omit=dev --json`の詳細（17件，11 high，`fixed: ?`多数＝bundle済み）を取得済み．

2026-10-18：npmレジストリへ再照会し，実際の依存経路を`npm explain`で確認した．初期記述の「大半がbundle済みでfixAvailableなし」は正確ではない．Marp CLIの間接依存に加えBudouXの認証ツール依存も含まれ，`fixAvailable: true`でも現在の親packageの制約では更新できないものがある．

`markdown-it`を14.1.1から14.3.3へ更新し，互換範囲の`js-yaml` 4.3.2／5.5.0と`picomatch` 4.0.7をlockへ反映した．[markdown-itのadvisory](https://github.com/advisories/GHSA-253c-mchw-3w2r)の修正範囲に入り，監査は17件（high 11，moderate 4，low 2）から14件（high 9，moderate 3，low 2）へ減った．直接依存KaTeX 0.18.2は[修正済み](https://github.com/advisories/GHSA-238p-pmpm-9mq7)であり，残存するlowはMarp CLI配下の別コピーである．0.18.11は上流が破壊的変更を含む誤公開としてdeprecatedにしているため採用せず，0.19系への変更も本件には含めない．

調査時点の残存packageは次のとおり．`major`はnpmがMarp CLI 0.12.1への破壊的ダウングレードを提示することを表し，修正として採用しない．`true`はnpmの実際の返値であり，適用可能性を保証しない．

| Package | Severity | fixAvailable | 対応方針 |
| --- | --- | --- | --- |
| @marp-team/marp-cli | high | major | 現在の最新版4.5.1を維持し，上流の依存更新を追跡する． |
| @marp-team/marp-core（CLI配下4.4.0） | low | major | CLI配下の旧engine依存．本repoは明示的なCore 5.0.2を使用する． |
| @puppeteer/browsers | high | major | Puppeteerが2.13.2を固定．上流更新を待ち，未検証のoverrideは行わない． |
| @xmldom/xmldom（mathjax-full配下0.9.10） | high | true | 旧speech-rule-engineが完全固定．Core 5経路の別コピー0.9.12と区別し，旧engine側の更新を追跡する． |
| basic-ftp | high | major | get-uriの5系制約内に修正版なし．FTP／proxy経路の上流更新を待つ． |
| extract-zip | high | major | 修正版なし．ブラウザ配布物の取得・展開経路として追跡する．未信頼archiveを処理する用途へ拡張しない． |
| gaxios | moderate | true | BudouX→google-artifactregistry-auth→google-auth-library経由．uuid 9系制約を親の更新で解消する． |
| get-uri | high | major | basic-ftp由来．proxy依存の更新を追跡する． |
| katex（CLI配下） | low | major | CLI配下Core 4の依存．直接依存0.18.2と混同せず，CLI更新で追従する． |
| pac-proxy-agent | high | major | get-uri由来．proxy依存の更新を追跡する． |
| proxy-agent | high | major | pac-proxy-agent由来．proxy依存の更新を追跡する． |
| puppeteer-core | high | major | browser取得／proxy依存由来．Marp CLIと整合する更新を待つ． |
| speech-rule-engine（mathjax-full配下） | moderate | true | xmldomの固定依存が原因．旧MathJax 3系の上流更新を待つ． |
| uuid | moderate | true | gaxios 6系が9系を要求．強制的なmajor overrideを避け，親の更新を待つ． |

残存指摘を「ローカルMarkdownだけの影響」とは扱わない．上記のbrowser取得・proxy・認証依存も監視対象である．これは現在の依存構成に対する限定的な継続方針であり，任意の未信頼入力を安全に処理できるという判断ではない．

`npm run audit:dependencies`は本issueの調査結果を`.github/dependency-audit-baseline.json`と比較する．新しいaffected package／advisory／依存パス，重要度上昇，新たな互換修正の提示で失敗し，監査通信失敗・不正JSONも成功扱いしない．解消したpackageはbaseline除去候補として表示する．依存変更PRとmain反映時，毎週月曜02:00 UTC，手動実行で`.github/workflows/dependency-audit.yml`が実行する．baseline更新PRは本issueを参照し，新規項目の経路・修正可否・採用方針をNotesへ追記する．件数の据え置きだけで許可しない．

検証：比較ロジック5件（同件数の別advisory，severity上昇，新依存パス，新修正，通信異常を含む）が成功し，実レジストリを使った`npm run audit:dependencies`も14件の既知残存として成功した．
