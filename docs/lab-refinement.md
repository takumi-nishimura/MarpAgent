# Lab visual refinement — ISS-0049

`theme: lab` に `lab-refined` を明示的に加える比較用の改良版．既定 lab の置換や研究原稿の一括移行は行わない．値の正本は `designs/lab/DESIGN.md`，対応先は `themes/src/lab/_refined.css`，生成物は既存の `themes/lab.css` とする．

```yaml
---
marp: true
theme: lab
class: normal lab-refined
---
```

スライドの `_class` は継承する class 全体を置き換えるため，表紙などでも選択を保持する場合は `<!-- _class: title lab-refined -->` と書く．移行を戻すときは `lab-refined` だけを除く．元の `**strong**`，`*em*`，`_em_`，`.marker`，`mark` はそのまま使う．

## Inventory

基準 revision は `1711332`．既存 fixture と `decks/example/slide.md` の内容・列順・画像は変更しない．追加の `fixtures/lab-refined-slide.md` は日本語の強調・複数行マーカー・明暗背景を検査する汎用 smoke fixture であり，#54 の代表 fixture を置き換えない．

| 対象 | 既定 lab の入口・実測 | 改良版の対応 |
| :--- | :------------------- | :------------- |
| 本文 | `_base.css` の 26px，描画時は line-height `normal` | `body-md` の 26px / 1.5 / 400 |
| 見出し | `_base.css` の em 倍率と browser の行間 | `display` / `headline-*` の size・weight・leading・tracking |
| 太字 | `_typography.css` の着色と weight 500 | 着色を維持し，要求済みの 700 を使用 |
| マーカー | `em` の背景，`.marker` の下線状背景，`mark` の塗り | 意味と位置を保持し，改行ごとに背景を描画．`.marker` の帯は既存の em と同じ透過率へ調整 |
| 図説明 | `_layouts.css` の 0.6em = 15.6px | `caption` の 19.5px / 1.3 |
| 脚注 | `_base.css` の 0.4em = 10.4px | `footnote` の 14px / 1.4 |
| 表 | 本文サイズと共通セル罫線 | `body-sm` の 22.75px / 1.35，既存セル寸法を token に対応 |
| 補足欄 | 共通のラベル・アイコン・背景 | 既存情報を保持し，角丸と罫線を token に対応 |

もとの DESIGN.md の数値 lineHeight は，インストール済み `@google/design.md` 0.3.0 の exporter が出力していなかった．lab の値を同じ単位なし数値の文字列として表記し，`--leading-*` を生成する．共通の generator，muji/toshiba の token と CSS は変更しない．

## Boundary and public interface

新しい選択肢は lab 専用 class `lab-refined` のみ．別テーマの複製は作らない．DESIGN.md の追加 typography / color / spacing token は既存の生成規約で公開し，既存の `--font-body` / `--font-display` と deck-local style による上書きを保つ．

`--lab-table-header`，`--lab-table-stripe`，`--lab-table-border` は改良版の表の色を生成 token から選ぶ局所変数．`--lab-callout-color` は各補足のラベル色に対応する罫線色．通常の明暗表示と名前付き scheme を保持する．画像・SVG 内部や研究図の色は変更しない．

`section > .paper-header` を持つ paper は対象外．共通 `_base.css`，`_layouts.css`，`_typography.css`，paper，scroll のソースは変更しない．#55 の `.body`，`.figure-natural`，残余領域・header gap・列幅・図の収め方を改良版で再定義しない．`--body-top-gap`，`--body-bottom-safe`，`--body-gap`，`--col-gap`，`--figure-gap` は #55 の配置契約に属する．

## Comparison and font environment

初回比較は現行の表紙・通常本文・図と説明・比較表・長い日本語と追加 smoke fixture を，同一 Markdown から描画する．旧 CSS，改良版を選ばない新 CSS，改良版を選ぶ新 CSS の3条件を分ける．スクリーンショットだけで収まりを保証せず，本文の同一性，行数，図と列の寸法も保存する．

この環境の `fc-list :lang=ja` には日本語フォントがない．実フォント比較には [Google Fonts の Noto Sans JP](https://github.com/google/fonts/tree/main/ofl/notosansjp) を `/tmp` へ取得し，元の Web import と同じ 400/700 の face を明示的に読み込む．使用ファイルの SHA-256 は `c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`．リポジトリへフォントは追加しない．別条件では remote import を止め，利用可能な sans-serif fallback の描画を保存する．日本語 font がない fallback は日本語の視覚的受入根拠には使わない．

font-family の computed style だけでは読込の証明にしない．browser の platform font 使用情報と font ファイル hash を比較結果へ残す．異なる OS や font version で同じ折返しになる保証はしない．

初回の最終候補は Chromium `145.0.7632.6`，1280×720，DPR 1 で比較した．Noto 条件では custom font の使用を確認し，fallback は DejaVu Sans / DejaVu Sans Bold だった．variable font の内部名は platform font 情報で `Noto Sans JP Thin` と報告されるが，face は 400/700 を登録し，computed weight と実際の強調の画像を併せて確認した．

現行 fixture の 11 ページを font 2 条件で比較した計22条件では，既定表示の画素は旧 CSS とすべて一致した．改良版では本文文字列がすべて一致し，選択した段落・見出し・表セル・caption の行数変化は観測しなかった．図と列の幅・順序も維持した．ただし行間と caption / footnote の大きさが変わり，本文や図の縦位置・必要高さは変わる．これは配置変更とは分けて評価し，未検査の原稿の収まりは保証しない．

太字の実 weight と caption / footnote の大きさを既定にすると，利用者の既存調整へ影響する可能性がある．この比較だけでは一般の互換性を証明できないため，単一 class による明示選択を採った．既定を維持した条件の画素一致と，選択時の寸法差がその根拠である．

比較原稿・CSS hash・使用 font・行数・PNG は `/tmp/marp-i57-review-v2-20261021/comparison.json` と同ディレクトリの画像に保存した．並列比較画面は `/tmp/marp-i57-review-v2-20261021/review.html`．初回条件を再現する一時スクリプトは `/tmp/marp-i57-compare.cjs` であり，#54 の正式比較への移行時にこの一時結果を同一条件として混ぜない．

## Validation and remaining integration

- `npm run marpx -- --theme lab`：再生成済み．
- `npm run design:lint`：全 design で error 0 / warning 0．
- `npm run design:tokens:check`：全 design 一致．
- `node --test tests/unit/theme-css.test.js tests/unit/design-cli.test.js`：27 pass．
- `flock /tmp/marpagent-parallel-20261021/browser-tests.lock node_modules/.bin/playwright test tests/e2e/lab-refinement.spec.js --project chromium --workers 1`：3 pass．既定値，名前付き scheme，原稿の上書き，paper，muji/toshiba を確認．
- `flock /tmp/marpagent-parallel-20261021/browser-tests.lock node /tmp/marp-i57-strict.cjs`：対象5 fixture の font 指定コピーを `-v --strict --format json --report-dir ...` で検査し，すべて `visualCheck.status: measured`，error 0．追加 smoke は finding 0，comparison / figure-heavy / long-japanese の source hint は維持．結果は `/tmp/marp-i57-strict-20261021/results.json`．
- `uv run .github/records.py validate`：61 records validated．

上記は初回 checkpoint 時点の検証記録である．その後，main の許可により #54 `119fbbb` と #55 `6560cc4`，`44a841d`，`f397ea5` を取り込み，全テーマを再生成した．#57 の token と lab 固有 mapping は保持し，shared mechanics は取り込んだ #55 のものを使用する．

## Stable layout integration

[安定した配置での比較記録](lab-refinement-stable-review.md) に，同じ実 font を使った23ページの新旧画像，具体的な wrap / 寸法差，strict の診断差と調整台帳を記録した．既定表示は23/23ページで画素一致し，改良版の本文も23/23ページで一致した．長い caption の行数は #54 の図説明で2→3行，#55 の二列で1→2行となり，`.body` の4構図は caption と media を収めた．

既存の #54 縦長図の境界例は新旧とも clipping が残る．元原稿へ局所調整を加えず，この点は未解消として保持する．関連 unit 45件，browser 43件は pass．#56 `2eb7616` の committed collector でも公開 class を認識したが，その branch 全体は取り込んでいない．full strict gate と最終受入は main に引き渡す．既定 lab の置換を承認済みとは扱わない．
