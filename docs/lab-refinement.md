# Lab slide typography — ISS-0049

`theme: lab` の既定表示に，文字階層・行間・caption・脚注・色付き強調の改善を反映する．追加 class は不要．値の正本は `designs/lab/DESIGN.md`，対応先は `themes/src/lab/_visual.css`，生成物は既存の `themes/lab.css` とする．研究原稿の内容や構図は自動で変更しない．

```yaml
---
marp: true
theme: lab
class: normal
---
```

表紙は `<!-- _class: title -->`，暗い背景は `<!-- _class: normal invert -->` のままでよい．旧比較用の `lab-refined` がある原稿では，その語を `class` / `_class` から除く．その selector・別名・新しい opt-out は設けない．新規原稿の強調は次の3種類から選ぶ．既存の `.marker` も互換用として保持する．

## Emphasis and contextual highlighting

| 役割 | 記法 | labの表示 |
| :--- | :--- | :--- |
| 文中の語句に力点を置く | `*強調*`／`_強調_` | 文字の下30%に細い帯 |
| 結論や注意の重要性を示す | `**重要**` | 色付きの太字 |
| 引用・説明で取り上げる範囲を示す | `<mark>注目範囲</mark>` | 淡い背景塗り，上下に透明な隙間 |

markの例は，原文「結果は`<mark>同じ測定条件に限り有効</mark>`である」のように，説明が指している範囲を示すものとする．「要確認」という状態ラベルや重要性の段階はmarkの用途に含めない．文字色・自然な改行を保ち，複数行では各行に背景を描く．背景の中央80%を塗り，上下10%ずつは透明にする．左右paddingは0.08em．行高やfont weightをmark側で変更しない．

新しい明暗例は[lab-emphasis-slide.md](../fixtures/lab-emphasis-slide.md)．採用判断は[ADR-0011](decisions/ADR-0011-separate-lab-emphasis-from-contextual-highlighting.md)へ記録した．`.marker`は既存の細い帯として動作するが，新規原稿では導入しない．旧原稿を編集する場合は意図を確認してemまたはmarkを選び，自動置換や警告は行わない．旧typography fixtureの.marker／「要確認」は過去の比較と互換性確認用に保持する．

## Inventory

既定変更の比較基準は `1f303a5` の plain lab，実装は `9bd58e1`．既存 fixture と `decks/example/slide.md` の内容・列順・画像は変更しない．active fixture は `fixtures/lab-typography-slide.md` へ改名し，通常・表紙・invert の追加 class を除いた．日本語の強調・複数行マーカー・明暗背景を検査する汎用 smoke であり，#54 の代表 fixture を置き換えない．

| 対象 | 変更前の入口・実測 | 新しい既定 lab の対応 |
| :--- | :------------------- | :------------- |
| 本文 | `_base.css` の 26px，描画時は line-height `normal` | `body-md` の 26px / 1.5 / 400 |
| 見出し | `_base.css` の em 倍率と browser の行間 | `display` / `headline-*` の size・weight・leading・tracking |
| 太字 | `_typography.css` の着色と weight 500 | 着色を維持し，要求済みの 700 を使用 |
| 強調と注目 | `em` の背景，`.marker` の下線状背景，`mark` の塗り | emは細い帯，markは上下に隙間のある淡い背景．`.marker`は既存原稿向けの細い帯 |
| 図説明 | `_layouts.css` の 0.6em = 15.6px | `caption` の 19.5px / 1.3 |
| 脚注 | `_base.css` の 0.4em = 10.4px | `footnote` の 14px / 1.4 |
| 表 | 本文サイズと共通セル罫線 | `body-sm` の 22.75px / 1.35，既存セル寸法を token に対応 |
| 補足欄 | 共通のラベル・アイコン・背景 | 既存情報を保持し，角丸と罫線を token に対応 |

もとの DESIGN.md の数値 lineHeight は，インストール済み `@google/design.md` 0.3.0 の exporter が出力していなかった．lab の値を同じ単位なし数値の文字列として表記し，`--leading-*` を生成する．共通の generator，muji/toshiba の token と CSS は変更しない．

## Boundary and public interface

既存 lab を更新し，別テーマや恒久的な追加 class は作らない．DESIGN.md の typography / color / spacing token は既存の生成規約で公開し，既存の `--font-body` / `--font-display` と deck-local style による上書きを保つ．比較用名 `strong-refined` / `muted-refined` は同じ値の `strong-ink` / `muted-ink` に改名した．`accent-strong` は header 罫線と paper 用に保持し，広い token の置換は行わない．

`--lab-table-header`，`--lab-table-stripe`，`--lab-table-border` は lab の表の色を生成 token から選ぶ局所変数．`--lab-callout-color` は各補足のラベル色に対応する罫線色．通常の明暗表示と名前付き scheme を保持する．画像・SVG 内部や研究図の色は変更しない．

`--lab-mark-fill`は明暗に応じて`--color-mark-fill`／`--color-mark-fill-invert`を選ぶ．`--spacing-mark-inline`はmarkの左右paddingであり，DESIGN.mdの`spacing.mark-inline`から生成する．局所的な背景色や余白の上書きも可能である．

`section > .paper-header` を持つ paper は対象外．共通 `_base.css`，`_layouts.css`，`_typography.css`，paper，scroll のソースは変更しない．#55 の `.body`，`.figure-natural`，残余領域・header gap・列幅・図の収め方を lab 側で再定義しない．`--body-top-gap`，`--body-bottom-safe`，`--body-gap`，`--col-gap`，`--figure-gap` は #55 の配置契約に属する．

既存 lab は描画が変わる．本文のサイズを保っても，`normal` だった行高の明示，太さ，caption / footnote の拡大により，折返し・本文や図の縦位置・必要高さが変わり得る．原稿の明示 crop，局所 font や caption の上書きは保持し，実際の font で更新後の収まりを確認する．文字を小さくして欠けを隠したり，留保を省略したりしない．

## Historical marker feedback

以下はすべての帯を揃えた時点の記録である．現在のmarkは上のEmphasis and contextual highlightingに従い，emと異なる背景塗りを使う．

表示1枚目（原稿2枚目）の「一行と〜」が太く，「要確認」の塗りが上の行へ重なるように見える指摘を，固定400/700 font で確認した．文字は `em` / `.marker` / `mark` とも Regular・weight 400であり，強調の太さの差ではなかった．変更前の背景帯は11.1px / 14.8px / 37pxで，隣接行の帯と `mark` の隙間は2px．実際の重なりは0だが，厚さと全面塗りの差が目立つ状態だった．

lab の `.marker` と `mark` を，既存 `em` と同じ下30%・色の不透明度40%の帯へ揃えた．`mark` の文字色は本文を継承し，暗い背景でも読めるようにする．文字 weight・行高・padding・`box-decoration-break: clone` は変更しない．この font 条件では帯がすべて11.1px，行間の背景の隙間は27.9pxになり，本文・折返し・文字の fragment 座標は変わらなかった．帯の数値は inline box の実測と computed 背景から計算した CSS px である．

`background` / `color` による局所上書き，色付き strong，paper，muji/toshiba と名前付き明暗 scheme を確認した．共通 CSS や caption の処理は変更しない．[今回の明暗 before / after・font / CSS / 入力 hash・測定条件](evidence/ISS-0049-marker-feedback/README.md) を別に保存し，過去の証跡は保持する．

## Caption wrapping feedback

日本語captionにも従来からBudouXの文節区切りが適用される．今回の追加は行長の均しで，paper以外のlabの`figcaption`に`text-wrap-style: balance`を指定する．本文・見出しの折返し方式は変更しない．`.nobr`と`white-space: nowrap`を尊重し，意図的に従来の詰め方を使うcaptionには`style="text-wrap-style: auto"`を指定できる．

固定fontの代表例では，短い行／長い行の幅が英語0.310→0.958，日本語0.258→0.942になった．どちらも2行のままで，全文・日本語の12箇所の文節区切り・図とcaptionの寸法は保持した．[画像・条件・測定値](evidence/ISS-0049-caption-feedback/README.md)を新しい証跡へ保存した．ChromiumとFirefoxで計8件の回帰が成功し，Mac/Safari実機は未確認．長文やfont変更で同じ行数を保証するものではない．

## Default change validation

plain lab の太字700を期待するテストで，旧 CSS の実測500により RED を確認した．lab 専用 mapping を既定へ移して同じテストが GREEN となった．追加の選択用 class はテストにも原稿にも不要．

- テーマ再生成，`design:lint`（全 design error / warning 0），`design:tokens:check` は成功．
- 関連 unit 52件，rendered unit 22件，関連 browser 46件が成功し，skip 0．browser は共有 lock と同じ fontconfig で直列化した．
- browser は plain lab の文字階層，invert・名前付き scheme，deck-local の font・行高・caption・脚注上書き，paper の独立した尺度，muji/toshiba，16:9 / 4:3 の `.body`，旧配置，HTML・PNG・PDF export を確認した．muji/toshiba の compiled CSS は変更前と hash が一致する．
- rendered unit の脚注期待値は10.4pxから14pxへ更新した．小さすぎる脚注の負例には0.4emを明示し，端寄せの検査用原稿は行高を固定した．readability floor・overlap・clipping の閾値は変更しない．

[既定 lab の新しい固定 font 比較](evidence/ISS-0049-lab-default/README.md) は `1f303a5` plain lab → 新しい plain lab を比較する．過去の variable font ではなく，#54 と同じ400/700の実ファイルを使い，hash・条件・使用 font・wrap と既知の欠けを別に保存する．full gate と最終統合は main が担当する．

この条件で本文37/37ページ一致，caption の wrap 差2箇所．代表2組は旧 opt-in と画素一致した．新旧とも #54 の縦長図1ページの clipping は残り，その他の clipping / overlap / small text は0．追加 strict 4条件（typography，body 16:9 / 4:3，Core 5）はすべて measured / finding 0．既定を保った過去の23/23画素一致と，今回の既定更新を取り違えない．

main は担当実装 `9bd58e1` を統合側 `7b33018` へ取り込み，過密検査用 fixture の行高を固定した `4029409` で全体を確認した．unit504件・strict fixture18件・browser113件が成功し，既存Firefox対象外1件だけskip．実D2 7件とD2入りZIP 2件はskipなしで成功した．[統合検証manifest](evidence/integration-2026-10-21/lab-default-validation.json) に修正前後・コマンド・環境・ログhashを保存した．

## Historical comparison and font environment

以下は既定変更前の記録であり，現在の既定の互換性を示す結果ではない．当時の class の有無による比較と数値を保持する．旧証跡は変更せず，active fixture 改名前の revision から再現する．

初回比較は現行の表紙・通常本文・図と説明・比較表・長い日本語と追加 smoke fixture を，同一 Markdown から描画する．旧 CSS，改良版を選ばない新 CSS，改良版を選ぶ新 CSS の3条件を分ける．スクリーンショットだけで収まりを保証せず，本文の同一性，行数，図と列の寸法も保存する．

この環境の `fc-list :lang=ja` には日本語フォントがない．実フォント比較には [Google Fonts の Noto Sans JP](https://github.com/google/fonts/tree/main/ofl/notosansjp) を `/tmp` へ取得し，元の Web import と同じ 400/700 の face を明示的に読み込む．使用ファイルの SHA-256 は `c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`．リポジトリへフォントは追加しない．別条件では remote import を止め，利用可能な sans-serif fallback の描画を保存する．日本語 font がない fallback は日本語の視覚的受入根拠には使わない．

font-family の computed style だけでは読込の証明にしない．browser の platform font 使用情報と font ファイル hash を比較結果へ残す．異なる OS や font version で同じ折返しになる保証はしない．

初回の最終候補は Chromium `145.0.7632.6`，1280×720，DPR 1 で比較した．Noto 条件では custom font の使用を確認し，fallback は DejaVu Sans / DejaVu Sans Bold だった．variable font の内部名は platform font 情報で `Noto Sans JP Thin` と報告されるが，face は 400/700 を登録し，computed weight と実際の強調の画像を併せて確認した．

現行 fixture の 11 ページを font 2 条件で比較した計22条件では，既定表示の画素は旧 CSS とすべて一致した．改良版では本文文字列がすべて一致し，選択した段落・見出し・表セル・caption の行数変化は観測しなかった．図と列の幅・順序も維持した．ただし行間と caption / footnote の大きさが変わり，本文や図の縦位置・必要高さは変わる．これは配置変更とは分けて評価し，未検査の原稿の収まりは保証しない．

太字の実 weight と caption / footnote の大きさを既定にすると，利用者の既存調整へ影響する可能性がある．この比較だけでは一般の互換性を証明できないため，単一 class による明示選択を採った．既定を維持した条件の画素一致と，選択時の寸法差がその根拠である．

初回比較の原稿・CSS hash・使用 font・行数・PNG は一時 run に保存した．この初回結果と，後述する安定した配置での比較結果を同一条件として混ぜない．参照用の代表画像と実行 harness は [保存した比較証跡](evidence/ISS-0049-lab-refinement/README.md) にある．

## Historical validation and integration

- `npm run marpx -- --theme lab`：再生成済み．
- `npm run design:lint`：全 design で error 0 / warning 0．
- `npm run design:tokens:check`：全 design 一致．
- `node --test tests/unit/theme-css.test.js tests/unit/design-cli.test.js`：27 pass．
- `flock <browser-lock> node_modules/.bin/playwright test tests/e2e/lab-refinement.spec.js --project chromium --workers 1`：3 pass．既定値，名前付き scheme，原稿の上書き，paper，muji/toshiba を確認．
- `flock <browser-lock> node <initial-validation-harness>`：対象5 fixture の font 指定コピーを `-v --strict --format json --report-dir ...` で検査し，すべて `visualCheck.status: measured`，error 0．追加 smoke は finding 0，comparison / figure-heavy / long-japanese の source hint は維持．一時 run 名は一般化した．
- `uv run .github/records.py validate`：61 records validated．

上記は初回 checkpoint 時点の検証記録である．その後，main の許可により #54 `119fbbb` と #55 `6560cc4`，`44a841d`，`f397ea5` を取り込み，全テーマを再生成した．#57 の token と lab 固有 mapping は保持し，shared mechanics は取り込んだ #55 のものを使用する．

## Historical stable layout integration

[安定した配置での比較記録](lab-refinement-stable-review.md) に，同じ実 font を使った23ページの具体的な wrap / 寸法差，strict の診断差と調整台帳を記録した．[代表 before / after 3組・測定 summary・harness](evidence/ISS-0049-lab-refinement/README.md) を保存した．既定表示は23/23ページで画素一致し，改良版の本文も23/23ページで一致した．長い caption の行数は #54 の図説明で2→3行，#55 の二列で1→2行となり，`.body` の4構図は caption と media を収めた．

既存の #54 縦長図の境界例は新旧とも clipping が残った．元原稿へ局所調整を加えず，この点は未解消として保持する．当時の関連 unit 45件，browser 43件は pass．#56 `2eb7616` の committed collector でも公開 class を認識したが，その branch 全体は取り込んでいなかった．当時の比較は既定 lab の置換を承認したものではない．今回の既定更新とその確認結果は，上の Default change validation と新証跡に分ける．
