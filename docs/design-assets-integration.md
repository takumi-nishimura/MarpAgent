# デザイン・アセット・D2の依存関係と受け入れ追跡

親：[#53 / ISS-0045](issues/ISS-0045-coordinate-design-improvements-and-asset-distribution.md)．更新：2026-10-21．比較基準：`1711332cdf3fcd30182dba16e9b5b4cb77324837`（上流main `74f287d`にISSを取り込んだ時点）．
mainが統合と受け入れを判断し，#53は境界・証跡・未確認事項を記録する．この文書の整備は並行実装の待ち条件にしない．

## 方向性と履歴の区別

| 根拠 | 扱い |
| --- | --- |
| [PR #52：10月18日の初期案](https://github.com/takumi-nishimura/MarpAgent/pull/52#issuecomment-6250652201) | テーマ・Pele・自動配置の調査と助手案．導入・効果の実証ではない |
| [PR #52：同日の本人方針と利用確認](https://github.com/takumi-nishimura/MarpAgent/pull/52#issuecomment-6251211532) | 構図は原稿でエージェントが確認・調整し，色付き太字とマーカーを維持，Peleは導入しない．下流の個別CSS・同一blob・絶対symlinkは静的な観測であり，作者の断定・自動重複除去・所有元移動の許可ではない |
| [PR #52：10月19日の作業分割](https://github.com/takumi-nishimura/MarpAgent/pull/52#issuecomment-6251779249) | 個別調整を減らし，例外を調整しやすくする方向とZIP候補を具体化．CLI名・schema・CSS変数・順序の個別採用ではない |
| [#53：10月20日のD2検討](https://github.com/takumi-nishimura/MarpAgent/issues/53#issuecomment-6283591341)，[コードブロック案](https://github.com/takumi-nishimura/MarpAgent/issues/53#issuecomment-6284716041) | 当時は検討・設計段階．D2の性能・スライド内可読性の比較は未実施 |
| 10月21日の本人指示とmain更新 | D2を積極的に採用し，#61を実装する．9名のCodex gpt-6.1-sol maxサブリーダーによる並行作業．過去の「未採用」を現在の実装禁止として扱わない |

D2採用は，スライド全体の自動構図切替，Mermaidの置換，Pele導入を意味しない．D2の実行方式・既定layout・公開設定名等は，実装根拠と検証を添える設計項目として残す．研究内容・写真を転記せず，既存の明示crop・scroll・scoped CSSと留保・出典を保持する．

## 担当と受け入れ追跡

実装・検証の詳細な正本は各ISS．「checkpoint提出」は契約案の共有，「検証報告」はrevision・コマンド・結果の受領，「受け入れ」はmainによる統合確認を表す．表の未受領・未確認は，未実装や失敗の断定ではない．他worktreeの未コミット差分は取り込まない．

| 作業／担当 | 境界と必要な受け入れ証跡 | checkpoint | 検証報告／main受け入れ |
| --- | --- | --- | --- |
| [#54 / ISS-0046](issues/ISS-0046-establish-representative-layout-regression-baselines.md)／marp-i54-lead | 汎用化した代表原稿，旧revisionの描画と調整量，境界例，視覚レビュー手順．図内可読性とフォント条件も記録 | 未受領 | 未受領／未確認 |
| [#55 / ISS-0047](issues/ISS-0047-improve-body-figure-and-caption-layout-defaults.md)／marp-i55-lead | 本文領域・図・captionの寸法契約．#54の原稿差分と描画，複数行見出し・caption，旧fill・paper・scroll・他テーマの回帰 | `.body`契約案をmain経由で受領 | 未受領／未確認 |
| [#56 / ISS-0048](issues/ISS-0048-clarify-layout-overrides-and-diagnose-undefined-classes.md)／marp-i56-lead | #55に沿うutility・上書き規則，未定義／独自定義／不明の区別．元行・ページ付き助言，コード例の除外，全テーマの生成鮮度 | 未受領 | 未受領／未確認 |
| [#57 / ISS-0049](issues/ISS-0049-refine-lab-typography-and-visual-hierarchy.md)／marp-i57-lead | labの文字階層・token・強調．同一構図の新旧画像，実フォント，折返し差，移行方法．配置改善との効果を分離 | 未受領 | 未受領／未確認 |
| [#58 / ISS-0050](issues/ISS-0050-discover-and-reuse-repository-media-assets.md)／marp-i58-lead | 共通参照解決と診断，その上の一覧・検索・相対ファイルsymlink流用．所有元・使用行／ページ・hiddenの区別，安全なdry-runと非上書き | resolverの署名は未受領 | 未受領／未確認 |
| [#59 / ISS-0051](issues/ISS-0051-export-portable-html-asset-bundles-as-zip.md)／marp-i59-lead | #58のresolverを使うHTML資源収集・ZIP．別の一時場所で元repoなし・ネットワーク遮断の閲覧，参照書換え，外部依存，ノート等の除外，失敗時の既存出力保持 | plan/write API案をmain経由で受領 | 未受領／未確認 |
| [#60 / ISS-0052](issues/ISS-0052-select-another-preview-port-when-the-default-is-occupied.md)／marp-i60-lead | 隣接するpreview修正．既定PORTの有界探索，明示PORTの尊重，実起動競合・URL・watch notifier・終了処理の回帰 | 未受領 | 未受領／未確認 |
| [#61 / ISS-0053](issues/ISS-0053-render-d2-code-fences-through-the-configured-marp-engine.md)／marp-i61-lead | D2 adapter・fence・共通engine・失敗伝達．固定版の実描画，全出力，SVG/BudouX/ID，cache，失敗・timeoutと非D2回帰 | 採用方向を確認，実装契約は未受領 | 未受領／未確認 |

#53の文書checkpointは提出済み．機能受け入れは全件未確認．#53の完了は#54〜#59と#61の統合確認を待つ．#60は隣接作業として回帰を追跡し，親機能の新しい前提にはしない．[my-decks #2](https://github.com/takumi-nishimura/my-decks/issues/2)は別repo所有であり，正常なrepo内参照を収集するZIPの前提にはしない．

## 共有インターフェース

以下はmainへ渡す統合案であり，API・CSSの共有checkpointを受け取ったこと自体を採用や検証完了にしない．各担当は独立して実装し，未確定点をmain経由で解消する．

### 本文・utility・外観

- #55案は通常スライドの直下に明示する`.body`．その内側の`.fill`が残り高さを使い，figureは縮まないcaptionを確保して画像・動画・SVGを残りへ縦横比を保って収める．明示crop・inline寸法を尊重する．旧`.fill`単独，title，paper，opt-in scrollの挙動は保持する契約案である．
- 既存`--visual-left`，`--visual-right`，`--visual-gap`，`.place-*`を再利用する．追加候補は`--body-top-gap`，`--body-bottom-safe`，`--body-gap`，`--col-gap`，`--figure-gap`．#55が`_base.css`／`_layouts.css`とbody/media契約を所有する．
- #56はこのwrapperにutilityと診断を合わせる．#57はlab固有のtypography・tokenを所有し，body/header-gap計算を#55へ残す．#55は`_typography.css`やテーマ固有h1/h2 tokenを変更しない．#57は文字変更による折返し差を報告する．
- `source(none)`と明示safelistを維持する．新しい公開クラス・変数・対応するテストを同じ契約へ反映する．生成CSSの競合はソースを統合して再生成し，各段階の描画を比較する．

### 参照解決とZIP

基準時点の`src/media-assets.js`には次の既存境界がある．#58が互換性を保って共通化し，#59は収集ポリシーと書換えを担当する案とする．

| 境界 | 維持する契約／必要な受け渡し |
| --- | --- |
| `extractMediaReferences(raw)` | `[{reference, index}]`．原稿参照の抽出を共有するが，これだけで出力HTML・CSS・SVGの依存を収集し終えたとはしない |
| `resolveLocalReference(reference, baseDir)` | ローカル絶対pathまたは`null`という既存の返り値を保持．CSS/SVG内は各資源自身のディレクトリを基準にする |
| `findMissingAssets(deckPath, markdown, {slideMap})` | 既存の欠落診断とhidden除外，slide mapの対応を保持．ZIPの厳格化を通常validatorへ一律適用しない |
| #58の追加resolver API | 署名・schemaは#58が提示する．少なくとも参照分類，解決pathとrealpath，repo内外，symlink診断，query/fragmentを#59が再実装せず使える境界を提案．元ファイル・行・slideId・hiddenの対応を失わない |

既存resolverは絶対参照・file URLも解決するため，解決成功とZIPへの収集許可を分ける．remote/data/fragmentは誤収集せず，外部通信を開始しない．内部の絶対pathをmanifest・README・配布HTMLへ漏らさない．`copyDeckForRender`はデッキ全体の描画用コピーであり，ZIPの収集器として流用しない．

#59から受領した`src/portable-bundle.js`のAPI案：

```js
planPortableBundle({ html, deckPath, repoRoot, strictOffline, maxFiles, maxBytes })
  // -> { manifest, files, errors }
writePortableBundle(plan, { outputPath, force })
```

計画段階では原稿・素材・既存ZIPを書き換えず，書込みは一時領域から成功時に確定する境界を提案する．`files`の格納先・内容とmanifest，参照書換え先の一致，エラー時にwriteへ進まないことを受け入れで確認する．#58のresolver checkpointは早期にmainへ渡すが，#59は検索UIの完成を待たない．

### D2と共通描画

- #61がadapter／plugin／`marp.config.js`の登録を所有する．図の正本はMarkdown，成果物は共通engineから出力する．#59専用のD2事前変換や別engineは追加しない．初版の自己完結SVGは#58/#59の完成を前提にしない．
- エラーDOMは既存の`data-marpagent-render-error="d2"`と`data-marpagent-render-message`に接続し，audit結果は`{kind: "diagram", engine: "d2", message, source, count}`から既存`diagram-render-error`へつなぐ案とする．現行`src/visual-overflow.js`はMermaid専用selectorであり，属性の追加だけでは不足する．`src/deck-validator.js`のMermaid固定文言も更新対象になる．
- プレビューの位置付きエラー，validationの失敗，配布exportの非ゼロ終了を同じ実行結果から伝達する．成功cacheへの失敗混入，非ゼロ終了の部分SVG，ID衝突，BudouXの再改行を検証する．擬似CLI試験と固定版D2の実描画を分け，未実行を成功にしない．
- 初版で外部参照を扱わない場合も，自己完結性と制限を検証する．外部素材対応を追加する段階で，#58の診断・依存追跡と#59のZIP・外部依存報告へ接続する．

## 競合と統合順の提案

mainが実際のcommitとcheckpointに合わせて統合する．以下は統合順であり，開発開始を直列化する指示ではない．

1. #54の変更前原稿・描画・条件を固定する．#60は独立して先行統合できる．
2. デザイン系を#55の寸法契約 → #56のutility・診断 → #57の外観の順に統合し，各段階を#54の基準と比較する．#56の診断と#57の比較案は先行開発できる．
3. アセット系を#58のresolver部分 → #59のZIP → #58の残る一覧・検索・流用の順に統合する案とする．resolverとUIを別commitで渡せれば，UI待ちを避けられる．
4. #61は独立開発を続け，共有ファイルの最終接続は#56/#58/#59後を既定案とする．単独での実描画に加え，D2を含むZIPを統合後に再確認する．#61を#55〜#59の実装開始・単独受け入れの前提にしない．
5. mainが統合revisionで全体のstrict gateと残る横断受け入れを確認する．各担当の成功報告だけでは親を閉じない．

| 競合箇所 | 調整する境界 |
| --- | --- |
| `themes/src/_shared/`，`themes/*.css`，`docs/theme-contract.md` | #55のmechanics → #56のutility → #57のlab外観．生成CSSの片側採用でソースの変更を落とさない．D2のwrapperは#61から同じ寸法契約へ接続 |
| `src/deck-validator.js`，関連unit tests | #56の助言 → #58の欠落診断互換 → #61のengine別エラー．severity・元行・slide identity・JSON/SARIF/reportの整合を維持 |
| `bin/marpx.js`，CLI/help/export tests | #58の操作 → #59のZIP mode／dry-run／output → #61の失敗伝達．mode排他と既存`--dry-run`／timeout／output制約の拡張漏れを確認 |
| `marp.config.js`，`src/visual-overflow.js` | #61の共通登録とD2エラーselector．#59が描画処理を複製せず，生成済みSVGの依存を正しく扱う |
| `scripts/marp-serve.js`，`src/preview-runtime.js` | #60の主担当箇所．現時点で`bin/marpx.js`の直接変更は必須と確認していない．非ポート失敗，notifier再試行，終了シグナルの回帰を確認 |
| README／skills／media reference | 各担当の機能節をmainが統合する．#53は本書と親ISSだけを編集し，他担当レコードを更新しない |

## 未確認事項と親の完了条件

- [ ] #54の基準を使い，#55/#56の調整削減と#57の外観を原稿・画像・実フォントで個別に判定する．必要情報・強調・図内ラベルの可読性を別途確認する．
- [ ] #58/#59のrealpath境界，循環・親symlink・日本語path・query/fragmentと書換えを確認する．ZIPには通常ファイルだけを収め，hidden専用素材・話者ノート・brief・`.env`・`.git`等の混入と個人path漏れを検証する．外部依存を列挙し，strict offlineでは未解決を失敗にする．
- [ ] #61の実行制限・終了処理・SVG検査・部分出力・cacheと設定優先順位を確認する．D2なしの従来原稿と，D2なしの閲覧環境を分けて検証する．
- [ ] mainから割り当てられた場合に限り，ZIPのprivacy/pathとD2のsubprocess/SVGを限定レビューする．これらは具体的なリスクであり，日常的な一般レビュー担当を追加しない．未割当のレビューを完了扱いしない．
- [ ] 各行へ対象revision・正確なコマンド・結果・未実行条件・証跡pathを記録し，mainが統合revisionと受け入れ結果を追記する．失敗・skip・フォントfallbackを成功に数えない．

ブラウザを使う検査は同時実行を避け，この並行作業では`flock /tmp/marpagent-parallel-20261021/browser-tests.lock <command>`で直列化する．担当は関連する検査を実行し，mainが`npm run quality:gate:strict`を実行する．レコード変更時は`uv run .github/records.py validate`を実行する．本書作成時点では文書・記録の検証だけを行い，機能の描画・ZIP/D2受け入れは未実施である．
