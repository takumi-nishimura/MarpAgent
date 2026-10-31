# ISS-0047 の個別指定と再調整の比較

2026-10-30の限定比較では，**標準4構図の個別指定削減は支持されなかった**．旧方式は見出し・caption が1行増えても修復不要だった．body は縦長列のサイズ選択を省けるが，wrapper／class が増え，現行 lab の長脚注では追加の余白指定が必要だった．ISS-0047の最後の完了条件は未達のまま保つ．

旧証跡 [ISS-0047-body-layout](../ISS-0047-body-layout/README.md) と `fixtures/layout-baselines/baseline/` は変更していない．本比較は，元のfixtureと現在の3テーマの同じCSS上で，従来のmarkup／utilityと `.body` を比較する追加証跡である．[固定条件・候補・計数規則](PROTOCOL.md)，[入力recipe](recipes.cjs)，[全63組の要約](run/summary.json)，[原稿](run/inputs/)，[画像確認](review.md)，[XR-0009](../../explorations/XR-0009-measure-layout-adjustment-effort-against-minimal-legacy-repairs.md)を参照する．

## 標準4構図

各構図について3テーマ×元の内容／見出し増加／caption増加を比較した．見出しまたは最後のcaptionが実際に1行から2行へ増えたことを両方式でassertした．以下の指定量は1スライド当たりで，テーマと増加条件によらず同じである．総class数は脚注の `.footnote` を含む．

| 構図 | wrapper 旧→body | class token 旧→body | case固有の幅utility／サイズ宣言 旧→body | 構図維持のinline parameter 旧→body | 増加後の再調整 旧／body |
| --- | ---: | ---: | ---: | ---: | ---: |
| 単図 | 0→1 | 0→1 | 0→0 | 0→0 | 0／0 |
| 不均等8:4列 | 3→4 | 8→11 | 0→0 | 0→0 | 0／0 |
| 二図の縦積み | 1→1 | 3→1 | 0→0 | 0→1（gap） | 0／0 |
| 結果図＋補足＋脚注 | 0→1 | 1→2 | 0→0 | 0→0 | 0／0 |

4枚1組ではwrapperが4→7，classが12→15，gap parameterが0→1で，case固有サイズは0→0だった．classを寸法宣言と合算した「改善スコア」は作らない．標準36組すべてが旧方式でも修復不要なので，この入力集合から標準例一般の削減は示せない．

選択後の原稿差分は [lab](run/inputs/lab.patch)，[muji](run/inputs/muji.patch)，[toshiba](run/inputs/toshiba.patch) に保存した．無修復・不採用候補を含む入力はrecipeから復元する．

## 例外と持ち越し

旧方式の主要対照は各figureに付ける既存幅utilityの有限候補から選んだ最少修復である．二図では片方だけの修正も含む直積36候補を測った．「高さ指定が必須」という対照ではない．

| 縦長列 | 元の内容で選ぶutility | 見出し＋1行 | caption＋1行 | 元の指定から変更する対象数（見出し／caption） |
| --- | --- | --- | --- | --- |
| lab | `w-1/2` | `w-1/2` | `w-1/4` | 0／1 |
| muji | `w-3/4` | `w-1/2` | `w-1/4` | 1／1 |
| toshiba | `w-3/4` | `w-1/2` | `w-1/4` | 1／1 |

この9組では旧方式のcase固有サイズ選択1件をbodyで0件にできた．ただしwrapperは3→4，classは9→11となる．旧utilityの図内ラベルは12.00〜18.51px，bodyは16.55〜19.16pxだった．captionがfigureの自然幅を変えるため，utilityの比率だけでは図の実寸は決まらない．現在のlabはcaptionの文字寸法が旧証跡と異なり，旧証跡の `w-3/4` をそのまま一般化できない．

**同じ縦長列は `figure style="height: 460px"` の1宣言でも全3テーマ・全増加条件に通り，再調整0件だった**．図内ラベルは14.98〜16.13pxで，旧幅utilityの最小12pxより大きい条件もある．これはwidth utilityによる修復と別の有効な最少1指定の選択肢である．したがって上表の再選択5件を「旧方式に不可避の再調整」とは呼ばない．bodyの利点はこの範囲で460pxなどのcase固有値を選ばなくてよいことである．

下段のキャンバスが高い縦積みは，toshibaで見出しが増えたときだけ旧方式に幅utility1件が必要だった．元の内容からの追加は1件だが，上段へ `w-3/4` を最初から1件付けると3条件を通る．bodyはcase固有サイズ0件，gap parameter1件で通る．この組の下段ラベルは旧の選択21.00pxに対しbody20.47pxであり，すべての図が読みやすくなるわけではない．

長脚注は全テーマで旧方式の修復0件だった．bodyの既定48px reserveでは，labの本文要素下端672pxと脚注上端667.8125pxが4.1875px重なった．既存auditの文字衝突は0件であり，これは要素領域の非侵入条件による指摘である．`--body-bottom-safe: 56px` の1宣言で本文下端664px，離隔3.8125pxとなり，見出し／captionが増えても再調整不要だった．muji／toshibaは既定のまま通る．この3条件のbody側サイズ指定1件を削減数から隠さない．

全63組では旧幅utility経路のサイズ選択は10件（縦長列9＋縦積み1），bodyはサイズ宣言3件（labの長脚注）だった．同時に構造負担が増え，標準例では削減0件である．この内訳を合計だけで一般的な削減に読み替えない．

## 描画と保存範囲

993候補描画から63組を選び，両方式の計126描画でauditのclipping／overlap／small-text／edge-crowdingは0件だった．body既定は63組中60組が比較上の収まり条件を満たし，上記reserve修正後は63組すべてが満たした．全候補で表示テキスト，素材・alt・順序，typography，8:4列の幅・左位置，縦積みgapを方式間で照合した．高さの再配分やcontainの描画範囲は観測結果であり，同一pixel配置を保証しない．

36枚の未加工PNG（2,968,446 bytes），63組の寸法と計数，993候補の全測定をgzipで保存した．[manifest.json](manifest.json)に入力blob／SHA-256と保存ファイルのSHA-256がある．画像右下のページ番号は候補デッキ内の番号であり，ケースIDはファイル名とJSONで対応する．PNGの出所を21枚の選択デッキと混同しない．

PNG22枚を1280×720で直接確認した．未確認14枚と，保存対象外の90枚は寸法・内容の自動照合のみであり，完全な視覚レビューとは扱わない．caption／脚注の小ささ，図とcaptionの距離，投影距離での読みやすさはaudit合格と区別した．所見と確認した画像へのリンクは [review.md](review.md) にある．

## 再実行

Node 25.6.0，Marp Core 5.0.2，Playwright 1.58.2，Chromium 145.0.7632.6，Linux x64で測定した．`npm ci` は当該worktreeに独立して用意する．フォントは旧証跡と同じTTF／subsetのhashを要求する．フォント本体はコミットしない．取得元・hashはmanifest，subsetの作成手順は旧証跡READMEにある．

```sh
node docs/evidence/ISS-0047-layout-comparison-2026-10-30/rerun.cjs --verify
flock "$BROWSER_TEST_LOCK" node docs/evidence/ISS-0047-layout-comparison-2026-10-30/rerun.cjs \
  --font "$EVIDENCE_FONT_TTF" --svg-font "$EVIDENCE_SVG_FONT" --output "$NEW_RUN_DIRECTORY"
node docs/evidence/ISS-0047-layout-comparison-2026-10-30/package.cjs \
  --run "$NEW_RUN_DIRECTORY" --output "$NEW_ARCHIVE_DIRECTORY"
```

出力先は既存結果を上書きしない空／新規ディレクトリにする．今回のlockは coordination の `browser.lock`，元のrunは担当worktreeの `.cache/layout-run-05` だったが，再現にその絶対pathは不要である．入力ファイルの現行hashが異なる場合は固定Git blobを読む．engine／auditは実行checkoutのモジュールなので，異なる版での描画を同じ実験と呼ばず，厳密な再現はmanifestのrevisionで行う．異なる環境のPNG hash一致は保証しない．

`run/all-trials.json.gz` は通常のgzip JSONであり，`gzip -dc` で全候補のtypography・寸法・findingsを読める．[選択原稿](run/inputs/)はassetパスを元fixtureの表記で保持した閲覧用コピーで，独立配布デッキではない．全修復候補はrecipeから復元できる．

## チェックと残る判断

- `node --test tests/unit/theme-css.test.js tests/unit/body-class-contract.test.js tests/unit/canvas-size.test.js tests/unit/layout-baselines.test.js tests/unit/scroll-slides.test.js`：49件成功，skipなし．
- 共有lock下のstrict Chromiumで `body-layout`，`layout-compatibility`，`body-exports`，`composition-utilities`：41件成功，skipなし．exportは既存4ページfixtureのHTML／PNG／PDFの実出力，境界，画像寸法，PDFページ数を確認する．
- 比較harnessの全実行・入力／保存hash照合・構文検査，records validate，diff checkを実施した．[チェック記録](checks.json)を参照する．

新しい63組のPDF全ページ比較，PPTX，Firefox全回帰，元my-decks全原稿，投影距離での読取，作業時間の利用者実験は未実施である．共有CSS，依存関係，workflowは変更していない．最終のwhole gateはleadが行う．

未解決なのは「追加の構造指定と引き換えにcase固有サイズ選択を省ける範囲」を現行の一般的削減という完了条件の代わりに受け入れるか，元々複数の個別指定を持つ代表原稿でさらに測るかという判断である．本比較では受入条件を変更せず，ISS-0047をin-progressのまま残す．
