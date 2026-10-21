# ISS-0047 body layout evidence

2026-10-21の既存測定から，代表PNG 5枚（計380,545 bytes）と条件・寸法を抽出保存した．画像を再描画・加工して置き換えていない．48枚の全量，フォント本体，生成CSSの複製，machine固有の絶対pathは含めない．mainのXR-0003から参照するための限定的な実装証跡であり，採用判断やACの最終合格をこの保存作業で追加していない．

## 保存内容と結論

| ケース | 旧版 | 新body | 旧版の代替修復 |
| --- | --- | --- | --- |
| 縦長二列，lab | [自然寸法・caption下切れ](figures/columns-before.png) | [同じ8:4 grid・高さ指定なし](figures/columns-after.png) | [既存 `.w-3/4` のみ](figures/columns-width-utility.png) |
| 長caption，lab | [自然寸法](figures/caption-before.png) | [captionを確保して残余高さへfit](figures/caption-after.png) | 旧版もclippingなし |

縦長二列のcaption下端は，旧自然寸法805.55px，新body 672px，旧幅utility修復659.25pxだった．図内24pxラベルの表示寸法は旧幅utility約18.51px，新body約18.80pxで，両者ともcontainを保つ．列幅とgapは同一である．旧版は別経路の `figure { height: 520px }` 相当のinline 1宣言でも修復できたが，既存幅utilityでも修復できるため，必要な個別高さ宣言の最少件数は旧・新とも0件である．新bodyはcase固有の520px／75%選択を省けるが，構造wrapperとclassは増える．総指定数やソース量の削減は立証していない．

長captionは旧・新とも2行で，旧図の高さ280px，新bodyのmedia領域479.25px，caption下端は旧467.55px／新672pxである．別の長脚注対照例は旧版でも修復不要で，個別高さ指定は0→0件だった．label・本文・条件・出典を削除した結果ではない．

[summary.json](summary.json) は全3テーマの寸法とfindingsを保持する．`repair` は2ケース×3テーマ×4条件の24描画，`caption` は元の8ページ比較から単図の標準／長captionだけを抽出した12測定である．修復／新bodyの18描画ではclipping・overlap・small-text・edge-crowdingが0件で，表示テキスト，alt，本文・captionのfont-size，bold／markerの文字と色，列幅の保持を確認した．旧自然寸法の縦長列3描画は意図した比較元として各2件のclippingを残す．図の科学的な正しさや一般的な理解度の改善を測ったものではない．

## 条件と入力の固定

[manifest.json](manifest.json) に各PNGと要約のSHA-256，元原稿・SVG・CSSのGit blob IDとSHA-256，18通りの変換後原稿hashを保存した．`rerun.cjs` はcommit名の付け替えに依存せず，Git blobから同じ入力を読み出す．通常のGit履歴が必要で，浅いclone等でblobが欠けていれば検証は失敗する．

- 基準原稿：`119fbbbedb7076394de166af783fd8e10dc23b58` の `fixtures/layout-baselines/slide.md`
- 旧CSS：`1711332`，新CSS：`44a841d`．後続のtypography変更を混ぜない
- Node 25.6.0，Marp Core 5.0.2，Playwright 1.58.2，Chromium 145.0.7632.6，Linux x64
- canvas／viewport：1280×720，DPR 1．remote Google Fontsを遮断
- HTML：Noto Sans JP variable TTF，SHA-256 `c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`
- SVG画像内：同じTTFから作った27文字のwoff2 subset，SHA-256 `86fe6d5d8ebd71a87280cebfe32b6e200a73d22c5b5a496cc26bc3fd68c72d8b`

ページのwebfontは外部SVG画像へ継承されないため，双方のSVGにも同じsubsetを埋め込んだ．初回に欠字が出た画像はここへ採用していない．CDPで記録されたfont familyの `Noto Sans JP Thin` は可変フォントのname情報であり，その名前だけで実際のweightを解釈しない．元のfont-sizeと同一font使用の確認範囲を越えた主張はしていない．

## 検証と再実行

保存したファイルと全入力recipeの照合はフォント本体・browser起動なしで行える．repository rootで実行する．

```sh
node docs/evidence/ISS-0047-body-layout/rerun.cjs --verify
node --check docs/evidence/ISS-0047-body-layout/rerun.cjs
```

描画には，manifestのhashと一致するTTFを `EVIDENCE_FONT_TTF` に，生成先woff2を `EVIDENCE_SVG_FONT` に指定する．SVG用subsetの元になった文字列は [svg-labels.txt](svg-labels.txt) に保存した．取得元URLとhashはmanifestにある．subset生成条件は次のとおりである．

```sh
uv run --with fonttools==4.67.0 --with brotli==1.2.0 pyftsubset "$EVIDENCE_FONT_TTF" \
  --text-file=docs/evidence/ISS-0047-body-layout/svg-labels.txt \
  --output-file="$EVIDENCE_SVG_FONT" --flavor=woff2
```

そのcheckout固有の `npm ci` と対応browser導入後，空の出力先へ実行する．保存済み証跡は上書きせず，新結果の `result.json` に実行時version・寸法・findingsを記録する．PNGのhashは保存時のbytesを認証するもので，異なるOS・browser・依存関係の新出力が同じhashになることを保証しない．

```sh
EVIDENCE_RUN_DIR=$(mktemp -d)
flock "$BROWSER_TEST_LOCK" node docs/evidence/ISS-0047-body-layout/rerun.cjs \
  --font "$EVIDENCE_FONT_TTF" --svg-font "$EVIDENCE_SVG_FONT" \
  --output "$EVIDENCE_RUN_DIR"
```

`BROWSER_TEST_LOCK` は実行環境で共有するlock fileを指す．`--suite repair --theme lab` で最小修復2ケースだけを，`--suite caption --theme lab` で長caption組だけを再実行できる．caption組は元の8ページを描画してから対象だけ保存し，PNG内のページ番号2/8を維持する．出力するPNGは，既存証跡と同じ代表5種類に限る．

保存時には `--verify`，構文検査，lab修復組と長caption組の限定再実行，`uv run .github/records.py validate`，`git diff --check` を実施した．限定再実行は別の空ディレクトリへ出力し，代表5枚すべてが保存済みPNGとSHA-256まで一致した．subset生成手順も同じwoff2のhashを再現した．このフォルダーのPNGは既存結果のまま維持した．
