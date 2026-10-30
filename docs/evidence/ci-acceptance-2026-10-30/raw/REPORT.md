# 統合受入れ結果

対象は `0b0fdc00d0a02be789390e9915bd4001057e895c`，branch は `codex/20261030-integration`．開始・終了とも clean で，追跡ファイル・branch の変更はない．

`npm ci`，日本語フォント補完後の `npm run ci:full`，`npm run audit:dependencies` は終了コード0．D2／browser 操作は共通 browser.lock で直列化した．

| Gate | 成功 | 失敗 | skip |
| --- | ---: | ---: | ---: |
| Record validation | 73 | 0 | 0 |
| D2 | 7 | 0 | 0 |
| Portable ZIP D2 | 2 | 0 | 0 |
| Strict unit | 528 | 0 | 0 |
| Strict rendered fixtures | 18 | 0 | 0 |
| Chromium E2E | 105 | 0 | 0 |
| Firefox E2E | 14 | 0 | 1 |

Firefox の skip は Chromium CDP 専用の native touch injection に対する既存除外である．E2E は12 workers，retry なし．audit は既知7 package が baseline 内に残り，baseline は変更していない．

初回 full gate は日本語フォント不足で E2E 117成功・2失敗・1 skip．fc-list に日本語フォントがなく，失敗画像にも字形欠落が見られた．検証済み Noto Sans JP 400 を実行プロセス専用 Fontconfig に登録すると，対象2ファイル11テストと全 gate が成功した．初回ログ・画像は保存済み．設定と font は coordination/tools 内だけに置き，テストや追跡ファイルは変更していない．

実行条件は Node 25.6.0，npm 11.8.0，uv 0.13.1，D2 0.9.0，fonttools 4.60.1，Noto Sans JP static weight400，Playwright 1.58.2，Chromium 145.0.7632.6，Firefox 146.0.1，Puppeteer 25.13.0．D2 archive と元の variable font は workflow の SHA256 と一致．各実体の SHA256 は environment.json／browser-font-setup.json にある．

lock SHA256: `0110761e135d67493d6a7fa42341b9ac23bd99b8ef63f8f2c056f241e6fa7ec1`．

詳細は [acceptance.json](acceptance.json)，最終 full gate は [ci-full-fonts.log](ci-full-fonts.log)，audit は [audit-dependencies.log](audit-dependencies.log)．各コマンドの引数・時刻・終了コード・環境・前後の HEAD／status／lock は同名 JSON に記録した．初回は [ci-full.log](ci-full.log) と initial-e2e-artifacts，最終の成果物は final-e2e-artifacts と portable-zip-fonts にある．manifest.sha256 はこのディレクトリ内の証跡ファイルの checksum 一覧である．

この結果は上記 revision に限る．後から加わる layout evidence／変更は未検証なので，lead が差分に応じて再実行範囲を選ぶ．ローカル WSL2 の実行であり hosted GitHub workflow の結果ではない．既存 Playwright browser を再利用し，不足した日本語フォントは隔離設定で補ったため，Ubuntu の新規 --with-deps 導入そのものは再現していない．Firefox E2E は設定された overview／reload／scroll の範囲で，Puppeteer native Firefox BiDi PDF の既知制限は対象外である．
