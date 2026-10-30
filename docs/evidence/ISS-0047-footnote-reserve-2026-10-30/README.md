# ISS-0047 Phase 2：直下脚注の実測reserve

**限定修正は確認できたが，Issue55の広い完了条件は未達のままとする．**
Phase 1の標準4構図は旧方式で修復不要だった．この修正はその結果を変えるものではなく，
bodyの長脚注に必要だった手動reserveを除く．XR-0009は引き続きinconclusive，ISS-0047はin-progressである．

## Phaseの分離

- [Phase 1](../ISS-0047-layout-comparison-2026-10-30/README.md)：`c8dece4`で固定した993候補・63組の比較．このフォルダーの兄弟にある既存artifactは変更していない．`dc7dbcf`は保存patchの空context行に対するGit whitespace属性だけを追加した．
- Phase 2実装：`62cfcab2a9a17b2c51669496548f68c59a00c8e8`．通常スライド直下のbodyとfootnoteだけに適用する．本フォルダーが修正後の証拠である．
- 測定前のRED：4行脚注でbody下端672px，脚注上端628.625pxとなり，非侵入assertが失敗した．[失敗画像](checks/overlap-red.png)と[内容snapshot](checks/overlap-red-context.md)を保存した．これはPhase 1の日本語脚注とは別の決定的な回帰入力である．

## 最小修正と契約

脚注をflowに移すと絶対位置・順序とbodyローカルの余白指定の関係が変わるため，既存の描画script経路で脚注の境界を測る方式にした．
sectionの使用可能下端から直下脚注の最も高い上端までと，bodyの実際のrow gapをreserveにする．
`--body-bottom-safe` と実測値の大きい方を使い，指定した最低余白を残す．固定56pxを共通既定値に変更していない．

脚注のabsolute位置・文字・DOM順序・pagination，本文とcaptionの文字設定を維持する．図の領域だけが縮み，明示寸法，crop，figure-naturalは変更しない．
変更時／font読込／resize／印刷前に再測定し，縮尺をsection座標へ戻す．textの隠蔽・縮小，構図の切替はしない．

実装は85行のruntimeとCSSのfallback付き1宣言，engineへのscript追加，portable exportの既存hash許可リストへの1登録である．
JavaScriptが動くMarpAgent描画が必要であり，theme CSS単独・JavaScript無効時は従来のreserveに戻る．
native footer，入れ子の脚注，legacy，title，paper，scrollは既存の機構を使う．脚注同士の衝突や，本文自体が入らない場合は解決しない．
詳細は[公開契約](../../theme-contract.md#remaining-body-area-and-figures)を参照する．

## 固定条件と結果

Phase 1のrecipe，fixture，SVG，TTFとSVG subsetを再利用した．内容・構図・フォント・typographyは同一で，56px overrideを含まないbody既定の21ケース×3テーマを比較した．
HTTP(S)を遮断し，TTF／subsetのSHA256とCDPのcustom font使用を確認した．環境はNode25.6.0，Marp Core5.0.2，Playwright1.58.2，Chromium145.0.7632.6，1280×720，DPR1である．

beforeはPhase 1のCSSと現在のengineで再描画する．新しいprivate変数は旧CSSにconsumerがない．**63ケースすべてで，保存済みPhase 1のbody既定の全metricと完全一致した**．
この照合により，同じfixtureでも違う文字設定で有利なbeforeを作ることを防いだ．afterは実装commitのCSSとruntimeを使う．
新しいbefore PNGは21枚batchでの再描画であり，Phase 1の保存PNGを置換しない．ページ番号は本再比較の前後で同じである．

| 長脚注のtheme（各3条件共通） | 脚注上端 | body下端：前→後 | 離隔：前→後 | 脚注文字 |
| --- | ---: | ---: | ---: | ---: |
| lab | 667.8125px | 672→654.8125px | −4.1875→13px | 14px |
| muji | 677.3125px | 672→665.3125px | 5.3125→12px | 9.6px |
| toshiba | 677px | 672→664px | 5→13px | 10.4px |

63ケースのうち54ケースは全metricが不変で，長脚注の9ケースだけbodyが縮んだ．全63ケースのaudit（clipping，overlap，crowding，small-text），要素境界，12px以上の図内ラベル条件を満たした．
脚注の境界・style，本文とcaptionのtypography hash，内容hash，alt，列の左右位置・幅，縦積みgap，source order，paginationを前後で照合した．
見出し／captionの行数も維持した．Phase 1のlab長脚注はaudit上の文字衝突0件で，要素領域が4.1875px侵入していたこととは区別する．

### 指定負担

| 対象 | Phase 1 body → Phase 2 body |
| --- | --- |
| 標準4構図，4枚1組 | wrapper7→7，class15→15，gap parameter1→1，case固有サイズ0→0 |
| lab長脚注family | 著者が選ぶreserve値1→0（3caseでの宣言出現数3→0） |
| 長脚注familyの見出し／caption追加時の再調整 | 0→0．Phase 1でも一度選んだ56pxを全3条件に持ち越せた |
| 実行時に生成するprivate宣言 | 0→18（直下脚注がある18caseで1宣言ずつ）．著者が選ぶ固定値とは分けて数える |

旧方式との標準例比較はwrapper4→7，class12→15，gap parameter0→1，case固有サイズ0→0のままである．
旧縦長列の `height:460px` 1宣言で全9条件が収まる事実も変わらない．個別指定削減の一般化を証明したとは扱わない．

## 可読性とexport

[目視記録](review.md)では，固定fontの修正後12枚とbefore1枚，実PNG出力3枚，PDFから描画した6枚を直接確認した．
長脚注に割り当てる余白の分，図内ラベルも小さくなる．長脚注9caseのafterラベルは31.74〜37.88pxで，最大減少はlabの約1.47pxだった．
mujiの9.6px脚注は細かいままであり，この修正は可読性自体の改善ではない．

別のEnglish回帰入力を3テーマ×16:9／4:3で各2ページ（base，見出しとcaption追加）出力した．
HTMLでは脚注との離隔と文字・順序をassertし，PNGは12枚，PDFは6本12ページを保持した．
canvasは16:9の1280×720，4:3の1024×768で，PDFは960×540ptと768×576ptである．
4:3のHTML printプレビューは1280×720 viewport内で960×720に縮尺表示されるが，exportはnative寸法を保つ．
PDFはPyMuPDF2.0で全12ページの脚注4行・追加文言・留保・paginationと文字境界を抽出検査し，各2ページ目をnative pixel寸法へ描画した．
比較63ケース全部のPDF，PPTX，Firefox全回帰，投影距離での可読性は確認していない．

## 検証

- RED：body脚注非侵入の回帰が期待どおり失敗．portable strict offlineも新scriptの未登録で失敗してから登録した．
- GREEN：対象unit49＋engine／bundle36＝85件成功，skip0．
- strict Chromium：body／脚注／export／旧配置／構図／scroll／portableの79件成功，skip0．共有browser.lock下で実行した．
- 63組の測定，全12 PDFページの内容／境界，archive hash，records validator，diff checkを確認した．詳細と環境起因の失敗は[checks.json](checks.json)に残す．
- 最終の全体gateはlead担当であり，この対象検証を全体gateと呼ばない．依存・lockfile・workflowは変更していない．

## 再実行

artifact検証はbrowser不要である．現在のsourceが後日変わっても，記録blobをGitから照合する．

```sh
node docs/evidence/ISS-0047-footnote-reserve-2026-10-30/compare.cjs --verify
```

測定は実装commit `62cfcab` のsourceとmanifestにあるfontを用意する．新しい空出力先を使い，保存済みrunは置換しない．

```sh
flock /home/hapticslab/projects/MarpAgent/.cache/backlog-20261030/coordination/browser.lock \
  node docs/evidence/ISS-0047-footnote-reserve-2026-10-30/compare.cjs \
  --font .cache/layout-inputs/NotoSansJP.ttf \
  --svg-font .cache/layout-inputs/labels.woff2 \
  --output .cache/footnote-reproduction-new
```

実exportの回帰は `tests/e2e/body-footnote-exports.spec.js` に入力を含む．
検査対象PNG／PDFを保存するため，Playwrightの `--output` は新しい作業先を選ぶ．
PDFの抽出検査は，uv cacheにPyMuPDF2.0がある環境で次を使う．

```sh
sh docs/evidence/ISS-0047-footnote-reserve-2026-10-30/inspect-exports.sh \
  docs/evidence/ISS-0047-footnote-reserve-2026-10-30/exports \
  .cache/footnote-pdf-review-new
```

[summary](run/summary.json)は一覧用，[measurements.json.gz](run/measurements.json.gz)はbefore／afterの全metricである．PNG・PDF・script・ログのhashとsource blobは[manifest](manifest.json)に保存した．
