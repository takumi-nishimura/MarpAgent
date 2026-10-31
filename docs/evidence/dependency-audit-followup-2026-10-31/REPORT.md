# Issue67 dependency remediation acceptance

共有修正は `c89b9146b33c94a3ddbff6536d5c66c844b15143`．同じ revision の clean checkout から最終 `npm ci` を行い，`npm run ci:full` と実レジストリの `npm run audit:dependencies` が成功した．この archive はその後の文書追加であり，完全受入れした revision 自体と混同しない．

## 修正の選択

`mj-context-menu@1.0.0 > rimraf@6.1.3 > glob` に限って `14.0.3` を指定した．Marp CLI 4.5.1，Core 5.0.2，MathJax 4.1.3，既存 Puppeteer override は維持している．

| lock の変更 | 変更前 | 変更後 |
| --- | --- | --- |
| glob | 13.0.6 | 14.0.3 |
| minimatch | 10.2.6 | 11.0.3 |
| path-scurry | 2.0.2 | 3.0.0 |
| @isaacs/nonrecursive-glob-match | なし | 1.0.3 |
| lru-cache | path-scurry 配下の 11.5.3 | root 配下の同じ 11.5.3 |

公式 npm metadata では `@mathjax/src 4.1.3`，`mj-context-menu 1.0.0`，`rimraf 6.1.3` が最新で，親の通常更新では fixed major に届かなかった．Core の `latest` は 4.4.0，`next` は現行 5.0.2 なので，tag だけを根拠に更新していない．取得した回答と元 stdout hash は [upstream-metadata.json](upstream-metadata.json) に保存した．

[glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) の修正版は 14.0.2，[minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) は 11.0.1．ただし glob の通常 CJS／ESM export は依存を含む配布 bundle であり，**glob 14.0.2 の内包 minimatch には今回の展開上限がない**．外部 minimatch だけを更新してもこのコードを置換できない．公式 tarball の integrity，両形式の bundle／sourcemap hash，guard の有無を [package-source-evidence.json](package-source-evidence.json) で確認した．到達性担当の小規模実行でも `braceExpandMax:1` に対する生成 pattern 数は 13.0.6／14.0.2 が4，14.0.3 が1だった．

[14.0.2 → 14.0.3 の公式差分](https://github.com/isaacs/node-glob/compare/v14.0.2...v14.0.3) は runtime TypeScript を変えず，依存を更新し，minimatch の宣言下限を `^11.0.2` に上げている．[glob 14 changelog](https://github.com/isaacs/node-glob/blob/v14.0.3/changelog.md) の matcher 表現・debug option・ignore／Windows 等の変更も確認した．rimraf が使う公開 API は `glob`／`globSync` と absolute string 配列であり，内部 matcher API を使わない．literal CLI 削除，CJS／ESM の同期・非同期削除，cwd／ignore／dot／空 match，walk 中の abort を有限 fixture で検証した．すべての pattern・OS に対する major 互換性を主張するものではない．判断の出典と除去条件は [source-selection.json](source-selection.json) にある．

npm の lock 再生成は既存 Tailwind WASI artifact 内の6つの bundled metadata も追加したため，その無関係な追加だけを除いた．親 artifact は不変で，最終 `npm ci` は成功した．詳細は [lock-normalization.json](lock-normalization.json)．

## 到達性と代替案

immutable main `357ccfcaa725b6ab4f9686f98e9fdca486d51ea4` の独立調査では，Core は `@mathjax/src/mjs` の TeX／SVG API と4 font extensions を実使用していた．この package 全体の削除は数式機能を失う．menu の配布 JS 79ファイル・154 import はすべて相対参照で，rimraf の実使用は自身の clean／prepare script だった．通常の deck／material 入力から問題の glob API へ値を渡す経路は確認されなかった．

これは固定 config の source と限定 trace に基づく判断であり，任意の config／plugin／JavaScript の非到達証明ではない．CLI の旧4 trace は一次根拠から除外した．採用した最終再実行は，既定 Core entry 1件を独立 copy へ置換した計測実験である．親子の cwd／lock が一致し，copy 外 resolve／load は0，file load 1,008件の source hash が一致した．無変更の CLI 起動の独立性を証明するものではなく，provenance 訂正で browser は再実行していない．最終報告の116ファイルの hash を検証し，最終 REPORT／CLI-PROVENANCE と trace の hash・制限を [reachability-summary.json](reachability-summary.json) に残した．監査の抑制や baseline の拡大には使っていない．

menu の rimraf を upstream で devDependency へ移す案は有効な将来候補だが，対応する公式 release は未公開だった．ローカル削除や fork，数式 adapter の置換を追加するより，実際の caller と配布コードを確認した限定 override を採用した．親が修正版を通常依存に含めるか不要依存を除去した際は，fresh audit と回帰を通して override を外す．

## 監査の前後

| 実レジストリ照会 | production packages | high | moderate | low | raw audit exit | gate exit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 変更前 b9e2504，旧 lock | 12 | 1 | 9 | 2 | 1 | 1 |
| 最終 c89b914，新 lock | 7 | 1 | 3 | 3 | 1 | 0 |

[変更前 raw JSON](audit-raw-before.log)／[gate](audit-gate-before.log)，[最終 raw JSON](audit-raw-final.log)／[gate](audit-gate-final.log) は正確な出力を保持した．`@mathjax/src`，menu，rimraf，glob，minimatch の新規指摘が消え，Core の severity は low に戻り，直接 Core 5 の affected path も消えた．

残存は `@xmldom/xmldom` high，gaxios／speech-rule-engine／uuid moderate，CLI／旧同梱 Core／KaTeX low の7 package．**raw audit は引き続き exit 1** で，gate 成功は既存 ISS-0042 baseline 内に戻ったことを意味する．dev を含む最終 npm ci の監査表示は9件（high 3，moderate 3，low 3）であり，全脆弱性を解消したとは扱わない．

baseline SHA256 は変更前後とも `181d2718ac3153409387f67d7d29c444b1ba2ad3bf54a608e4e3e5de34712092`．旧 lock は `0110761e135d67493d6a7fa42341b9ac23bd99b8ef63f8f2c056f241e6fa7ec1`，新 lock は `44f3f12399951b53f092c4ea3d8c3d30899f12de53858c458b87e9dbbb2c66fd`．既存の歴史的監査 summary も変更していない．

## 実行した検証

完全受入れは 2026-10-31 12:54:27–12:56:06 UTC，revision `c89b9146b33c94a3ddbff6536d5c66c844b15143` で行った．[最終 install](npm-ci-final.log) と [full gate](ci-full-final.log) の前後の revision／status／lock hash は対応する `.json` に残り，いずれも clean である．

| 検証 | pass | fail | skip |
| --- | ---: | ---: | ---: |
| records | 76 records | 0 | 0 |
| pinned D2 integration | 7 | 0 | 0 |
| portable D2 ZIP | 2 | 0 | 0 |
| strict unit | 539 | 0 | 0 |
| strict fixture/example | 18 | 0 | 0 |
| Chromium E2E | 126 | 0 | 0 |
| Firefox E2E | 14 | 0 | 1 |

E2E は12 workers，retry 0．唯一の既存 skip は `scroll-slides.spec.js:264` の native touch panning で，Firefox では CDP を使えない条件によるもの．ブラウザ不足による skip はない．[full-results.json](full-results.json) に実ログから数えた内訳を保存した．

共有 `coordination/browser.lock` を `flock` で取得し，Node 25.6.0，npm 11.8.0，uv 0.13.1，D2 0.9.0，fonttools 4.60.1 由来の Noto Sans JP static weight 400，isolated Fontconfig，Playwright 1.58.2，Chromium 145.0.7632.6／Firefox 146.0.1 を用いた．workflow と同じ D2 archive／variable font の checksum と static font の hash を照合した．実体 hash と環境は [environment.json](environment.json)，実行環境変数は [ci-full-final.json](ci-full-final.json)．

主要コマンドは次のとおりで，argv・時刻・状態・終了コード・ログ hash は各 run JSON に保存した．

```sh
npm ci --fetch-retries=0 --fetch-timeout=20000
node --test tests/unit/mathjax-cleanup-dependencies.test.js tests/unit/marp-engine.test.js tests/unit/dependency-audit.test.js
flock /home/hapticslab/projects/MarpAgent/.cache/backlog-20261030/coordination/browser.lock npm run ci:full
npm audit --omit=dev --json --fetch-retries=0 --fetch-timeout=20000
npm run audit:dependencies
uv run .github/records.py validate --strict-relations
```

full gate のコマンド例には環境指定を省略している．実際には pinned uv を PATH の先頭に置き，`MARP_AGENT_D2_PATH`，`MARP_AGENT_D2_FONT_PATH`，`FONTCONFIG_FILE`，`MARP_AGENT_ZIP_D2_ARTIFACT_DIR`，workflow 同様の `CHROME_NO_SANDBOX=1` を設定した．

重点単体回帰は19 pass／0 fail／0 skip．旧依存と隔離候補の同一5 probe は旧版3 pass／2 fail，候補5 passだった．旧版の abort 後 traversal は3 reads，候補は1 readで停止した．展開上限を4にした有限 pattern は旧版64 alternatives，候補4．最終の追跡テストには default bundle の CJS／ESM 上限検査も追加している．[旧版](api-before.log)，[隔離候補](api-candidate.log)，[重点回帰](focused-unit.log) を参照．

追加 export probe では inline／display 数式と bbm／bboldx／dsfont／mhchem の6種について，変更前後の HTML と CSS の hash がすべて一致した．HTML／PDF／1280×720 PNG／strict-offline ZIP を生成し，source を rename した後の relocated ZIP を network blocked の Chromium で開いた．6 math containers と4種類の非空 vector glyph，error 0，remote requests 0を確認した．PNG も目視し，各 glyph と式が収まることを確認した．[比較前](math-before.json)，[比較後](math-after.json)，[出力 manifest](math-export-results.json)，[実行ログ](math-exports.log) が根拠である．この追加 probe は commit 前の候補で実行したもので，clean revision の full gate と区別する．

## 証拠の扱いと残る範囲

コピーした run JSON と，以下2件を除く `*.log` は元ファイルと byte 一致する．`api-before.log` の空行2箇所と `ci-full-final.log` の空行1箇所だけ，Git whitespace 検査のため空白文字を除去した．その他の byte・path・ANSI・出力順は維持し，manifest に元 hash／保存版 hash／正規化規則を併記した．run JSON の `log.sha256` は元の durable capture を指す．元ログは変更していない．`upstream-metadata.json` は npm stdout JSON の parse／再serialize，`reachability-summary.json` と `source-selection.json` は明示した派生要約で，元ファイルの hash を残した．[manifest.json](manifest.json) と [MANIFEST.sha256](MANIFEST.sha256) が archive 全体を照合する．再現用 probe は新しい作業ディレクトリで実行し，保存済み結果を上書きしない．

browser bulk，配布 tarball，font，PDF／PNG／ZIP の binary はこの compact archive に含めない．元の資源・成果物・完全な到達性資料は `/home/hapticslab/projects/MarpAgent/.cache/backlog-20261030/coordination/issue67` および `coordination/tools/full-acceptance-20261030` に保持し，選択した hash を収録した．

本受入れは Linux/WSL と指定ブラウザでのローカル実行であり，GitHub hosted CI，Windows の全 glob semantics，任意 config の安全性を代替しない．downstream my-decks の適用・独立検証は別担当で，この時点の upstream 証拠だけでは完了扱いにしない．文書更新後の [strict record 検証](records-final.log) は76 recordsで成功した．文書 commit は `c89b914` からの非 docs 差分が空であることを検証し，その後に runtime／lock が変わる場合は影響に応じて受入れをやり直す．
