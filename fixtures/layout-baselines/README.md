# 代表レイアウトの比較用基準

これは #54／ISS-0046 の benchmark scaffold である．現行の原稿・素材・描画を後続変更と比較する入口を用意する．標準ケースがすでに望ましいデザインになったことや，理解度の向上を示す成果物ではない．共有 CSS はこの変更では修正しない．

`slide.md` は汎用的な日本語と自作 SVG のみを含む．値は架空であり，研究内容・写真・非公開データの転用はない．`cases.json` が安定したケース ID，Markdown のページ番号，変更条件，元原稿の commit 固定リンクを持つ．レイアウトに関係しない ID 用コメントと `data-region` 属性は表示内容ではない．この順序やページ数を一般の資料制作へ強制しない．

| ページ | 標準 ID | 境界 ID | 一度に変える条件 |
| --- | --- | --- | --- |
| 1／2 | `body-standard` | `body-heading-wrap` | 日本語見出しの長さ |
| 3／4 | `figure-standard` | `figure-caption-wrap` | キャプションの長さ |
| 5／6 | `columns-standard` | `columns-portrait` | 同じ値・ラベルの図の縦横比 |
| 7／8 | `stack-standard` | `stack-taller-media` | 下段の図のキャンバス高 |
| 9／10 | `results-standard` | `results-footnote-wrap` | 出典脚注の長さ |
| 11／12 | `table-standard` | `table-extra-row` | 比較表の一行追加 |
| 13／14 | `diagram-standard` | `diagram-label-wrap` | Mermaid の一ノードのラベル |

見出し・キャプションが実際に何行になるかは，フォントとテーマを含む描画条件ごとに記録する．名前の `wrap` は確認対象であり，固定の行数をテストで強制する意味ではない．縦積みの境界版は下段素材の余白だけを増やし，図中のラベル・矢印の大きさを保つ．

`template/layouts.md` は正本のまま残す．表はその先頭ページの本文をそのまま使用し，不均等二列は同じ `grid-cols-12`／8:4 の構造を使う．本文は工程例の汎用的な表現を再利用した．図・脚注の関係は ISS-0046 の元原稿調査に挙げられた構造を汎用化したもので，元原稿の特定ページとの照合は未確認である．その制約は manifest の `verification` に残す．数式・Mermaid は新規の汎用例である．

## 実行と保存

既存の画像出力・overview・validator・Playwright を使う．追加の CI，評価サービス，美観スコアは導入しない．リポジトリルート，対応 Node，その checkout 固有の `npm ci` 済み環境で実行する．並行開発中のブラウザ実行は COORDINATION.md の共有 `flock` に従う．

```sh
node --test tests/unit/layout-baselines.test.js
npm run test:e2e -- tests/e2e/composition-utilities.spec.js --project=chromium --workers=1
npm run marpx -- fixtures/layout-baselines/slide.md -v --strict --report-dir out/layout-before/validation
npm run marpx -- fixtures/layout-baselines/slide.md --images png --output out/layout-before/slides.png
npm run marpx -- fixtures/layout-baselines/slide.md --overview
```

validator は欠陥のある境界例で終了コード1になり得る．`Visual check: measured` と実際のルール・ページ・重大度を保存する．fallback の `Findings: 0`，スキップ，未取得フォントを成功扱いしない．`--report-dir` の画像は指摘ページだけなので，全ページの比較には別途 `--images` を使う．overview は順序の確認，個別画像はラベルや脚注の確認に使い分ける．

既存の `fixtures/overflow-heavy-slide.md` と `fixtures/text-overlap-slide.md` を意図した過密・脚注衝突の対照例として残す．その期待値は既存の `scripts/ci-validate-fixtures.js` が持つ．これらの警告・失敗を新しい標準例の品質目標へ混ぜない．

E2E は同じ fixture を lab／muji／toshiba で描画し，素材の読み込み，列の比率，縦積みの順序，キャプション・脚注・強調・数式・図の存在を確認する．Google Fonts のリクエストを止めた既存テスト条件を引き継ぐため，ローカルフォントがなければ fallback 条件での構造検査である．日本語の可読性を検証したことにはならない．

## 変更前後を比較する

1. 比較前の revision と比較後の revision を固定し，両方に同じ `slide.md` と SVG を使う．テーマだけを比較するときはそれ以外の入力を同一に保つ．入力と描画で使ったテーマ CSS のコピー，画像，validator JSON，環境情報を別々の run ディレクトリへ残す．既存の結果を上書きしない．
2. テーマ／variant，ブラウザの正確な版，OS，1280×720 の canvas，viewport，DPR，Node・Marp・Playwright 版，フォントの取得元と実際の使用状況を記す．webfont を許可したか，キャッシュ・ローカル配布を使ったかも記す．フォント条件が違う結果を同等の比較にしない．
3. 標準と境界をまず既定動作で描画する．validator の重大度・ルール・ケース ID ごとの差と，画像からの視覚指摘を分けて記録する．エラー数だけの比較はしない．
4. 改善が必要なケースは，標準動作 → 既存の少数パラメータ／utility → 正当なページ固有 CSS の順で試す．一度に一つの変更理由を扱い，調整前後の原稿と画像を残す．例外を直すために標準版の入力を変更しない．
5. 変更したページと隣接ページを再描画し，overview で順序も確認する．共有 CSS を変えた担当は既存の paper／scroll 回帰も確認する．テストが測る構造と，人が判断する読みやすさをそれぞれ報告する．

調整量は CSS 行数の最小化で評価しない．ケースごとに以下を数え，追加・撤去・保持した理由を記す．共通のロゴ無効化は環境制御として一度だけ数え，ページの修正に混ぜない．

| 種類 | 数え方 |
| --- | --- |
| ページ固有 CSS | 一つの意図を持つ selector 群を一ルール単位とし，宣言数も併記 |
| inline 指定 | 要素数と宣言数を併記．同じ値の複製も要素ごとに数える |
| wrapper | 配置のための要素数．`figure`／`figcaption` などの意味的構造と分ける |
| utility／パラメータ | 変更した値・class・対象要素を列挙．単なる class 数を品質指標にしない |
| 意図した演出 | crop，scroll，色付き強調などの目的を記し，削減対象から分ける |

基準 fixture にはページ固有 CSS／inline 寸法指定を入れない．図が自然寸法のまま使えるかも観察対象になる．必要になった指定は比較後のコピーで試し，理由を残す．列 wrapper と縦積み wrapper は内容の関係を表すために保持する．

## 視覚レビュー

[review-template.md](review-template.md) を run ごとにコピーする．一指摘はケース／ページ，領域，画像，観測した理由，修正候補，確信度，確認状態を持つ．未確認事項や好みを機械的な失敗へ昇格させない．

確認対象は，図内ラベル・数値・凡例の読みやすさ，図と見出しの一致，必要な留保・出典・強調の保持，読み順，caption／footnote の位置である．画像の文字や media 同士の重なり，科学的な正しさ，理解度は現行 validator では保証できない．存在する文字が快適に読めるかも，単なる最小 font-size の合否と分けて判断する．

文字・図の欠落，強調消失，情報削除，比較条件の省略，見出しと根拠の不一致を改善として数えない．短縮が必要なら内容上の理由と失う情報を明記し，同じ入力による比較から分ける．初回の実行条件と観測は `baseline-2026-10-21.md` に記録する．
