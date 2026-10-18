---
id: ISS-0044
title: "Triage low-severity findings from the October 2026 review"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-18"
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - bin/marpx.js
  - scripts/
  - src/
  - themes/src/
  - tests/
tags:
  - cleanup
depends_on:
  - ISS-0032
  - ISS-0037
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Triage low-severity findings from the October 2026 review

## Problem

2026-10-17のリポジトリ全体精査で「低重要度（経過観察相当）」と評価した指摘が多数残った．個々は単独では低頻度・軽微だが未処理のままでは精査結果が失われるため，それぞれを「対応」か「意図的な放置（理由つき）」のどちらかに整理する必要がある．

対象（file:lineは精査時点）:

1. `bin/marpx.js`: `--strict`/`--format`がserve等モードで無警告無視される（`--hints`/`--autofix`はエラー化されているのに不整合）．
2. `scripts/presenter-cursor.js:25`: BroadcastChannel名が固定で，同一file:// origin上の複数デッキでカーソルが他デッキへ漏れる．
3. `scripts/marp-serve.js:97-105`: respawn時に旧子の未flush行が`outputTail`に混入し，過剰retry/重複タブ開きの原因になり得る（`ISS-0027`閉後の残置）．
4. `scripts/ci-validate-fixtures.js:94-105`: 子stdoutが1 MB超で`JSON.parse`が未捕捉クラッシュ（maxBuffer既定）．
5. `scripts/generate-design-tokens.js:59-67`，`scripts/lint-designs.js:44`: 失敗時に生スタック（終了コードは正しい）．
6. `src/markdown-source.js:72-75`: 閉じ`----`や末尾空白つき閉じ区切りでfrontmatter判定が漏れる．
7. `src/markdown-slides.js:12-46`: インデント付きコードフェンスもフェンス扱いし，`countTopLevelBullets`のヒューリスティックが歪む．
8. `src/slide-map.js:10-25,111`: `buildSlideMap`呼び出しごとに`createConfiguredMarp`を再構築（budouxモデルとconfig再計算；未計測）．
9. themes: コンパイル済み`--logos-*`の既定値`url(logos/logo_light.svg)`等が実在しない（`themes/src/_shared/_base.css:21-30`，`themes/lab.css:526-529`；`themes/logos/`不在）．上書きしない新規デッキはロゴが沈黙で消え，missing-asset検査はテーマ内部URLを見ない（リポ内デッキは全員frontmatterで上書き/`none`により回避済み）．
10. themes: `themes/src/lab.css:8`（muji/toshibaも同様）がGoogle Fontsをネットワーク`@import`し，オフライン環境ではfallbackフォントで計測される（clip/overlap/size検査の再現性が環境依存）．
11. themes: `section.github-light.invert`の組合せで，ライト背景にダークShikiトークンが適用され得る（`themes/src/_shared/_code.css:65-78`付近；colorschemesが後に読まれ優先するため）．
12. `src/preview-cli.js:9-32`: 「Deck not found」等の診断が入力順（ページ指定を先に書いた場合）で誤解を招く．
13. `tests/unit/preview-overview.test.js:55`: 固定`/tmp`直下を使用．
14. `scripts/run-node-tests.js:15-25`: symlink／ドットディレクトリ配下のテスト発見を静かにskipする．
15. `src/overview-preview.js:445-449`: reload後も500msポーリングが停止しない（微弱・無指向）．
16. `src/overview-preview.js:33-103`: 深い階層のURL断片をdepth 0相当に扱い，期待したページ位置に復元されない場合がある．
17. `src/marp.config.js:45-52`: 自己閉じ記法regex `[^>]*?` が属性値内の`>`を切り得る（markdown-itのescape済み出力では到達困難）．
18. `.github/records.py:960`付近: 日本語タイトルのslugが一律`record`になる（実害なし）．
19. prettier: 設定だけあり，どのgateにも入っておらず，33ファイルが非準拠のまま（`npx prettier --check .` 実測）．
20. CI: playwrightブラウザキャッシュなし（`.github/workflows/quality-gate.yml:24-28`）．
21. `decks/example/slide.pdf`（1.4 MB）がコミット済み生成物として残る．
22. browserless環境での`npm test`: 3件がfail（skipではなく；helperと不対称）→方針は`ISS-0038`のACに含む．

## Goal

上記全項目がtriageされる: 対応するものはcommitで解消し，放置するものは理由を添えて本リストで閉じる（または後続issueへ分割）．

## Acceptance criteria

- [x] 各項目が完了時点で「対応済み（commit/参照）」か「放置（理由）」のどちらかで本issue上に印が付く．
- [x] 全項目処理後にcheckboxが残らない（分割が必要な項目のみ後続issueへ移し，本issueで参照）．
- [x] 対応を含む変更では`uv run .github/records.py validate`が通る．

## Out of scope

高・中重要度の指摘（`ISS-0031`〜`ISS-0042`），テスト安定性（`ISS-0030`），プレビューbind（`ISS-0043`）．

## Approach

関係の近い項目から小さく潰す（例: 4,5,17はscripts側のエラー処理をまとめて，9,10,11はthemesを1コミットで，13,14はテスト小掃除）．放置判断にはユーザ確認を要するもの（例: 19のprettier強制追加 vs 削除，20のCIキャッシュ導入）を先に決めておく．

## Notes

2026-10-17: 精査レポートの低重要度節をそのまま収録．2件（mermaid tmp残骸・spawn error処理）は`ISS-0037`/`ISS-0032`へ吸収したため，本リストでは参照のみとする．

2026-10-18：原レポートの前提を現行コードと再現試験で精査し，全22項目を以下のとおり処理した．維持とした項目は再現していない不具合の修正や，計測根拠のない全体方針変更を行わない判断であり，未着手項目ではない．

| # | 結論 | 根拠・対応箇所 |
| --- | --- | --- |
| 1 | 対応済み | `bin/marpx.js`でvalidate以外の`--strict`／`--format`を拒否．`cli-args.test.js`で固定． |
| 2 | 対応済み | `presenter-cursor.js`のchannelを正規化deck URL＋native presenter sessionで分離．別deck・別sessionへ座標が届かず，同じpresenter/audience間では届くことを`presenter-cursor.test.js`で確認． |
| 3 | 対応済み | `marp-serve.js`のoutputTailをspawn単位へ移し，stdioがflushする`close`後にretry判定．ISS-0032の検証に含む． |
| 4 | 対応済み | `ci-validate-fixtures.js`を16MiB bufferへ変更し，子error／exit／不正JSONを診断．2MiB reportの成功と不正出力を回帰テスト化． |
| 5 | 対応済み | token生成・design lintのentrypointでoperationを示す短い診断を出す．欠落design／実行bin／designsディレクトリの3ケースを`design-cli.test.js`で確認．元のlintはspawn失敗を無言でexit 1としており，常に生stackだったわけではない． |
| 6 | 対応済み | `src/markdown-input.js`にfrontmatter境界を集約し，canvas・source・media解析へ適用．長い閉じdash，末尾空白，許可されるindentの扱いをMarpに合わせた．ISS-0036と関連testに含む． |
| 7 | 対応済み | `markdown-slides.js`で4スペース以上のindentをfenceと扱わず，閉じ長さとbacktick付きinfoも判定．`markdown-slides.test.js`で固定． |
| 8 | 維持 | 2枚のdeckで`buildSlideMap`を100回測り，中央値8.1ms，p95 15.1ms．現段階ではconfig再読込とMarp instanceの状態分離を維持し，未計測の高速化を優先しない． |
| 9 | 対応済み | 共有baseのロゴ既定値を`none`へ変更．存在しないasset URLを生成せず，明示指定した各deckのロゴを使用する．3テーマ再生成・鮮度検証済み． |
| 10 | 維持・文書化 | Google Fontsを使う既存外観を維持．同じfont版の導入またはdeck-local `@font-face`によるoffline再現条件を`docs/theme-contract.md`へ追記．フォント配布・全面差替えは行わない． |
| 11 | 対応済み | 共有code CSSで`github-light invert`のShiki配色をlightへ揃える．3テーマの実ブラウザ検証で確認． |
| 12 | 対応済み | `preview-cli.js`でページ番号が先行する入力を適切に診断．`preview-cli.test.js`で固定． |
| 13 | 対応済み | `preview-overview.test.js`の一時ディレクトリを`os.tmpdir()`から作成． |
| 14 | 維持・前提訂正 | ドットディレクトリは現行でも探索される．実fsで確認．symlink除外は循環／重複／repo外の意図しない実行を防ぐため維持し，`run-node-tests.js`へ理由を記した． |
| 15 | 対応済み | overviewのreload開始時とpagehide時にpolling停止．`overview-preview.test.js`で固定． |
| 16 | 維持・不再現 | 引用された箇所はURL断片の解釈ではなくSVG階層の抽出．`buildOverviewUrl(..., "deck/7")`の既存テストも成功し，主張に対応する再現根拠がなかった． |
| 17 | 対応済み・前提訂正 | BudouXが属性内の`&gt;`を戻すため通常renderで到達可能だった．`marp.config.js`の自己閉じtag判定をquoteに対応させ，`>`を含む属性の回帰テストを追加． |
| 18 | 維持 | 日本語slugが`record`でもファイル名のISS/ADR/XR IDは自動採番で一意．表示titleと参照IDも保持されるため，採番・検索・リンクに実害なし．slug規則の変更は不要． |
| 19 | 維持 | Prettierは既存の任意編集ツールとして残す．全ファイルの再formatと必須gate追加は本修正の判定を改善せず，大きな無関係diffを生むため実施しない． |
| 20 | 維持 | Playwrightの標準installでversionに合ったbrowserとOS依存を揃える現CIを維持．cacheによる短縮効果・復元コストを計測していないため追加しない． |
| 21 | 維持 | 既に配布物として追跡されているPDF snapshotを保持．現行の動作見本・CIの正本は`decks/example/slide.md`とし，PDFの自動同期や削除は行わない．必要時は通常のexportで更新する． |
| 22 | 対応済み | ISS-0038でChromium必須のunit preflightと環境限定skipを実装．browserlessの`npm test`は明示failとなり，個別skipだけで総緑化しない．READMEへ方針を記載． |

関連の回帰試験，実描画，失敗注入の詳細は各ISSおよびtestsを参照．後続issueへ分割が必要な未判断項目は残していない．

統合版の最終検証：`CHROME_NO_SANDBOX=1 MARP_AGENT_NO_OPEN=1 npm run quality:gate:strict`が成功した．unit 355件成功，fixture/exampleの厳格描画18件成功，E2E 69件成功＋Firefoxの既存CDP限定touch 1件対象外skip．依存監査gate，records 52件，`git diff --check`，ruffも成功．tyはPEP 723で宣言するPyYAML/jsonschemaを含む一時tool環境で成功した（`uvx --offline --with pyyaml --with jsonschema ty check .`）．
