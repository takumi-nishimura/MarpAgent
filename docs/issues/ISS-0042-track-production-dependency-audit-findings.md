---
id: ISS-0042
title: "Track production dependency audit findings"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-30"
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

### PR #62 integration audit 2026-10-21

PR #62のDependency Auditが，新たに直接依存へ加えたfflate 0.8.2を検出して失敗した．[GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98)は不正なZIP64を`unzipSync`で読む際の無限ループで，0.8.3が修正版である．productionの配布処理は`zipSync`による作成だけで，`unzipSync`は生成したZIPを検査するテストで使用している．この利用範囲を理由にbaselineへ追加せず，直接依存を互換修正版0.8.3へ固定した．package-lockの変更もfflateだけである．

更新前の実レジストリ結果を既存監査に与えると，`fflate: new vulnerable package (moderate)`でexit 1となることを確認した．更新後は15件から既知残存14件へ戻り，同じ監査がexit 0となった．監査baselineは変更していない．ZIPと監査の既存unit21件も成功し，失敗・skipなし．統合全体と実D2入りZIPはmainの最終検証で確認する．

### PR #64 dependency remediation 2026-10-30

PR #64の既知の監査失敗（run `40440480639`，head `0c2adee`）を受け，main `6a6c943`のlockから再調査した．Node 25.6.0／npm 11.8.0で`npm audit --omit=dev --json --fetch-retries=0 --fetch-timeout=20000`を実行すると16件（high 11，moderate 3，low 2），exit 1となった．既存gateも`chromium-bidi: new vulnerable package (high)`と`zod: new vulnerable package (high)`の2件でexit 1になり，過去に受け入れた14件へ戻ったとは扱わない．

[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)はZod `<4.6.6`を対象とし，修正版を4.6.6とする．[上流修正](https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd)はv4のcollection上限を要素解析より先に検査する変更であり，v3 APIへの修正を保証するものではない．npm配布情報と配布物の実コードを確認し，次の候補を比較した．

| 候補 | 一次情報・実行結果 | 判断 |
| --- | --- | --- |
| 宣言済みの互換範囲でlockを更新 | `npm view @marp-team/marp-cli version dependencies --json`では最新版4.5.1がPuppeteer `^24.43.1`を要求する．24系の最終版24.43.1はBiDi `14.0.0`を固定し，BiDiはZod `^3.24.1`を要求する．`npm view zod@3 version --json`の最終版は3.25.76で，修正版なし． | この範囲では解消できない． |
| BiDi 14配下のZodだけを4.6.6へoverride | 独立コピーしたBiDi 14の`parseObject(7, z.string())`で比較すると，3.25.76は`InvalidArgumentException`，4.6.6は`TypeError: Cannot read properties of undefined (reading 'map')`となる．BiDi 14は`parseResult.error.errors`を参照している． | エラー処理を壊すため不採用．package番号だけを4系にしてv3 APIを使い続ける回避も採用しない． |
| BiDiだけをZod 4対応版へoverride | 157.0.8082-0はZod `^4.6.5`を要求するが，旧`lib/cjs/bidiMapper/BidiMapper.js`が配布物に存在しない．Puppeteer 24.43.1はこのパスを直接requireしている． | 親側のimport変更も必要なため不採用． |
| Marp CLI配下のPuppeteerを25.13.0へ固定 | `npm view puppeteer-core@25 version dependencies.chromium-bidi --json`で，25.0.2～25.12.0はZod 3依存のBiDi 16.0.1／17.0.2を固定し，25.13.0で157.0.8090-0へ切り替わる．そのBiDiはZod `^4.6.5`を要求し，lockは修正版4.6.7を解決する． | Node 25でのAPI確認と下記回帰検証を経て採用． |

配布情報の参照先：[Marp CLI 4.5.1](https://registry.npmjs.org/@marp-team/marp-cli/4.5.1)，[Puppeteer 24.43.1](https://registry.npmjs.org/puppeteer-core/24.43.1)，[BiDi 14.0.0](https://registry.npmjs.org/chromium-bidi/14.0.0)，[Puppeteer 25.13.0](https://registry.npmjs.org/puppeteer-core/25.13.0)，[BiDi 157.0.8090-0](https://registry.npmjs.org/chromium-bidi/157.0.8090-0)．

採用するoverrideは`@marp-team/marp-cli@4.5.1`の`puppeteer-core: 25.13.0`だけに限定した．これはMarp CLI自身の`^24.43.1`宣言を超えるため，上流が保証するsemver互換更新とは呼ばない．[Puppeteer 25の破壊的変更](https://github.com/puppeteer/puppeteer/releases/tag/puppeteer-core-v25.0.0)を照合し，Marp CLIの配布コードが削除された`Browser.isConnected()`や同期版`defaultArgs()`／`executablePath()`を使用しておらず，`launch()`と`Browser.connected`を使用することを確認した．本repoのNode制約`>=25 <26`はPuppeteerの`>=22.12.0`を満たし，CommonJSからのrequireとCLI実行も成功した．Marp CLIを次に更新するときは，この版限定overrideの必要性と上流の対応範囲を再確認する．

| 依存 | 更新前 | 更新後 |
| --- | --- | --- |
| puppeteer-core | 24.43.1 | 25.13.0 |
| @puppeteer/browsers | 2.13.2 | 3.2.4 |
| chromium-bidi | 14.0.0 | 157.0.8090-0 |
| productionのzod | 3.25.76 | BiDi配下4.6.7 |
| devtools-protocol | 0.0.1608973 | 0.0.1696802 |
| webdriver-bidi-protocol | 0.4.1 | 1.0.1 |

直接依存のバージョンは変更していない．lockの追加14項目・削除50項目・更新5項目はこのbrowser依存ツリーに対応する．残る1項目の差はルートZod 3.25.76の`dev: true`への変更で，`@google/design.md`からのdev依存は残る．`@puppeteer/browsers` 3.2.4が`extract-zip`と旧proxy依存を必須依存から外したため，その旧ツリーも除去される．

検証はLinux／WSL2，Node 25.6.0，Playwright 1.58.2，既存Chromium headless shell 145.0.7632.6で行った．browserを起動し得るunitとE2Eは共通の`flock /home/hapticslab/projects/MarpAgent/.cache/backlog-20261030/coordination/browser.lock`で直列化した．sandbox内では子プロセスの`EPERM`が出たため，該当検証は通常の承認を経て制限外で再実行した．

```sh
npm install --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000
npm ci --offline --no-audit --no-fund
npm ls puppeteer-core chromium-bidi zod --all
npm audit --omit=dev --json --fetch-retries=0 --fetch-timeout=20000
npm run audit:dependencies

# Run browser-capable checks under the shared lock.
flock /home/hapticslab/projects/MarpAgent/.cache/backlog-20261030/coordination/browser.lock \
  node --test tests/unit/dependency-audit.test.js tests/unit/package-json.test.js \
  tests/unit/marp-engine.test.js tests/unit/marp-browser.test.js \
  tests/unit/conversion-runtime.test.js tests/unit/portable-export.test.js \
  tests/unit/portable-bundle.test.js
flock /home/hapticslab/projects/MarpAgent/.cache/backlog-20261030/coordination/browser.lock \
  npm run test:e2e:strict -- tests/e2e/cli-smoke.spec.js \
  tests/e2e/body-exports.spec.js tests/e2e/core5-rendering.spec.js \
  --project=chromium --workers=1
```

- `npm ci --offline --no-audit --no-fund`：341 packageの再インストールに成功した．lockのSHA-256は前後とも`0110761e135d67493d6a7fa42341b9ac23bd99b8ef63f8f2c056f241e6fa7ec1`で一致する．
- 関連unit：50件成功，失敗・skipなし．Core 5のCommonJS／CLI経路，browser選択，timeout・子プロセス終了，portable export，audit比較を含む．
- strict E2E：35件成功，失敗・skipなし．PDF・PPTX・HTML・PNG，スクリーンショット，overviewと終了処理，本文組版，MathJax・Mermaid・Shikiを確認した．
- 再インストール後は同じstrict E2Eの`cli-smoke.spec.js`を`--grep 'export smoke: Core 5 features in pdf, pptx, html, and images$'`で実行し，1件成功，失敗・skipなし．
- BiDi明示指定：Marp CLIへ`--browser chrome --browser-protocol webdriver-bidi --browser-path <headless-shell>`を与え，`template/core5-components.md`をPDFとPNGへ出力できた．更新後の実BiDi parserは不正入力を`InvalidArgumentException`として返す．配下Zod 4.6.7の`z.array(z.preprocess(counter, z.string())).max(1).safeParse([1, 2])`は要素解析0回・上限違反1件となり，旧Zodの要素解析2回・違反3件との差も確認した．
- 記録・差分：`uv run .github/records.py validate`は71件成功，`git diff --check`も成功した．

更新後のproduction監査は7件（high 1，moderate 3，low 3），raw `npm audit`は残存指摘のためexit 1のままである．新規のZod／BiDi指摘とbrowser周辺の既知指摘7 packageが消え，baselineを変更せず実レジストリを用いる`npm run audit:dependencies`がexit 0になった．残存はhighの`@xmldom/xmldom`，moderateの`gaxios`／`speech-rule-engine`／`uuid`，lowの`@marp-team/marp-cli`／CLI配下`@marp-team/marp-core`／`katex`である．解消済みbaseline項目の除去候補はgateが引き続き表示する．

追加のFirefox 146.0.1によるBiDi PDF出力は，更新前24.43.1の独立コピーと更新後25.13.0の両方で`browsingContext.create`応答待ちから進まず，35秒の外側timeoutで終了した．同一input・config・browser，`--browser-timeout 20`で比較し，終了時の`Target closed`も両方に見られた．初回の更新後単独試行も60秒でtimeoutしている．この観測はFirefox出力の成功や原因の特定を意味しない．Firefox，macOS／Windows，proxyを介したbrowser取得，全品質gateの受入は本検証では完了していない．統合担当の最終検証と区別する．Zod 3はdev依存に残り，既知のproduction 7件も残るため，「全依存の脆弱性を解消した」とは扱わない．
