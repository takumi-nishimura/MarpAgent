# 最終統合受入れ 2026-10-30

検証対象は `77e1029ee745cb2d4c49b1e63c5c5f8e97562e3c`．隔離 integration checkout での `npm ci`，共有 browser.lock 下の `npm run ci:full`，`npm run audit:dependencies` がすべて終了コード0となった．開始・終了とも同じ HEAD で clean，lock の SHA256 も一致した．この文書は完了済み実行の保存であり，保存先 branch での再実行結果ではない．

| Gate | 成功 | 失敗 | skip |
| --- | ---: | ---: | ---: |
| Record validation | 74 | 0 | 0 |
| D2 0.9.0 | 7 | 0 | 0 |
| Portable ZIP D2 | 2 | 0 | 0 |
| Strict unit | 529 | 0 | 0 |
| Strict rendered fixtures | 18 | 0 | 0 |
| Chromium E2E | 126 | 0 | 0 |
| Firefox E2E | 14 | 0 | 1 |

E2E は12 workers，retryなし，計141件中140件成功．skip は `tests/e2e/scroll-slides.spec.js:264` の native touch injection が Chromium CDP を使うための既存 Firefox 除外である．browser不足による skip はない．脚注 runtime 15件，3テーマ×2比率の HTML／PNG／PDF export 6件，strict offline bundle の脚注 runtime unit も成功した．

Production dependency audit は既知7 package が元の ISS-0042 baseline 内に収まり，baseline は変更していない．脆弱性0件という意味ではない．install log の9件は dev を含む監査であり，production gate の7件とは対象範囲が異なる．

## 実行条件と由来

Mars の WSL2／Linux x64 で，Node 25.6.0，npm 11.8.0，uv 0.13.1，Playwright 1.58.2，Puppeteer 25.13.0，Chromium 145.0.7632.6，Firefox 146.0.1 を確認した．D2 archive／元fontの SHA256 は workflow と一致し，fonttools 4.60.1 で生成済みの Noto Sans JP static weight400 を再検証した．ブラウザにも同じ static font を隔離 Fontconfig 経由で提供した．実体・archive・font・Fontconfig・workflow の SHA256 は [元の実行 manifest](run.json) の `environment` に保存している．

lock SHA256 は `0110761e135d67493d6a7fa42341b9ac23bd99b8ef63f8f2c056f241e6fa7ec1`．正確な argv・開始終了時刻と clean before／after は [manifest](manifest.json) と [run.json](run.json) にある．`ci:full` 内の strict script が visual／E2E 必須設定を有効にする．

## 保存した証拠

* [full gate log](logs/ci-full.trimmed.log)：元ログの442行目だけ，行末 ASCII space／tab を除去した．その他の本文・件数・順序は同一．元 SHA256 は `a49f72c105ec350af7ce173f6b4afd11cab45d8aafb24ab7faa24e9363bef0f6`．
* [audit log](logs/audit-dependencies.log) と [install log](logs/npm-ci.log)：元の bytes をそのまま保存した．
* [run.json](run.json)：元の acceptance.json を byte一致で保存した．当時の絶対パスと PATH は出典情報であり，他環境での再利用先を指定するものではない．
* [manifest.json](manifest.json)：保存ファイルと原本の hash，実件数，保存先と検証対象の差分を記録した．[SHA256SUMS](SHA256SUMS) は repository root から archive を検証する一覧である．

元の124ファイルは保存前にすべて hash 照合した．今回の最終実行には失敗がなく，前回 `0b0fdc0` の初回フォント失敗と補完後の成功を含む151ファイルの証跡も変更していない．browser画像・PDF・ZIP全量，font／browser／D2本体はこの compact archive に複製していない．元 manifest が記録する実行先には残る．

## 保存先と検証対象の比較

保存開始時の branch は `codex/20261030-backlog-report`，HEAD は `e905b96c07b71d287ff628f9ebf15a1c0a05b65d`．この時点では PR64 の CI／依存変更をまだ含まず，検証済み tree と同一ではない．比較は `docs/**` と root `README.md` のみを除外し，それ以外の全追跡ファイルを mode／Git blob と差分ファイルの SHA256 で照合した．次の5パスが異なる．

* `.github/workflows/dependency-audit.yml`
* `.github/workflows/quality-gate.yml`
* `package-lock.json`
* `package.json`
* `tests/unit/ci-workflow.test.js`（保存開始時の branch には存在しない）

root README も異なるが，上記比較では文書として除外した．双方の blob・SHA256 と inventory fingerprint は [manifest](manifest.json) の `archiveBaseComparison` にある．この docs unit は runtime／dependency／test を変更しない．

lead が CI 証跡担当完了後の PR64 branch を取り込んだ後に，repository root で次を実行する．終了コード0がその時点の比較成立を示す．取り込み前の同一性や，未実施の merge を成功済みとは記録しない．

```sh
git diff --exit-code 77e1029ee745cb2d4c49b1e63c5c5f8e97562e3c HEAD -- . ':(exclude)docs/**' ':(exclude)README.md'
```

文書だけの保存では browser を再実行しない．上記比較が失敗した場合は差分を調べ，runtime／dependency 変更があれば影響する受入れを再実行する．記録の現在の整合性と archive は別途次で検証する．

```sh
uv run .github/records.py validate --strict-relations
sha256sum --check docs/evidence/integration-2026-10-30/SHA256SUMS
git diff --check
```

## 判定の限界

local full gate の成功を hosted GitHub Actions の成功，採用，公開，mergeと同一視しない．既存browserを再利用しており，新規 `--with-deps` 導入そのものの再現ではない．Firefox は設定された overview／reload／scroll の範囲で，native Puppeteer Firefox BiDi PDF の既知制限は対象外である．

ISS-0045／ISS-0047 は in-progress，ADR-0013 は proposed を維持する．広い個別指定削減のACは未達のままで，この full gate の成功によって達成扱いにしない．2026-10-21と XR-0009 Phase 1／2 の過去の観測・結論・artifactは変更しない．
