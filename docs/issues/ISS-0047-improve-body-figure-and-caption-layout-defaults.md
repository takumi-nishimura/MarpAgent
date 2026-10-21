---
id: ISS-0047
title: "Improve body figure and caption layout defaults"
type: issue
status: in-review
date: "2026-10-21"
updated: "2026-10-21"
authors:
  - codex-main-leader
scope:
  - themes
tags:
  - feature
depends_on: ["ISS-0046"]
supersedes: []
artifacts:
  revisions:
    - 6560cc4
    - 44a841d
  manifests:
    - docs/evidence/ISS-0047-body-layout/manifest.json
  results:
    - docs/theme-contract.md
    - docs/evidence/ISS-0047-body-layout/README.md
    - docs/evidence/ISS-0047-body-layout/summary.json
  commands:
    - node --test tests/unit/theme-css.test.js
    - npm run test:e2e -- tests/e2e/body-layout.spec.js tests/e2e/composition-utilities.spec.js --project=chromium --workers=1
    - npm run test:e2e -- tests/e2e/layout-compatibility.spec.js tests/e2e/body-exports.spec.js --project=chromium --workers=1
    - node docs/evidence/ISS-0047-body-layout/rerun.cjs --verify
---

# Improve body figure and caption layout defaults

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/55

## Execution update 2026-10-21

本人がIssueごとのCodex sol maxサブリーダー，Herdr worktreeによる並行開発，Devin・無料OpenCodeの活用を指示した．本ISSを作業の正本とし，以下は起票時に取り込んだGitHub仕様である．本文中の未起票・未実装・過去の権限境界は元の記録時点を表す．
D2を積極的に採用する最新方針を反映し，#61は採用を進める実装対象とする．個々のCLI・公開変数・外部参照仕様の選択は実装根拠と検証を添える．
この記録の作成自体は機能の完了を意味しない．mainへの直接書込・push・merge・GitHubコメント送信は各サブリーダーの担当外とする．

## Coordination

Main coordination branch: coord/issues-53-61-20261021．
GitHub IssueとISSの対応: #53 = ISS-0045，#54 = ISS-0046，#55 = ISS-0047，#56 = ISS-0048，#57 = ISS-0049，#58 = ISS-0050，#59 = ISS-0051，#60 = ISS-0052，#61 = ISS-0053．
#56の診断と#57の比較案は先行可能だが，CSS契約は#55と整合させる．#59は#58の参照解決部分だけを先行依存とし，検索UIの完了待ちにしない．#61は独立着手する．

## Implementation notes 2026-10-21

通常スライド直下の `.body` を残余領域の明示選択とした．`6560cc4` が公開契約の先行commit，`44a841d` が整列と旧配置互換の後続commitである．旧 `.fill` 単独の本文余白，図の自然寸法，表紙，paper，scrollの機構は変更しない．`.body` 内では見出し・説明・captionを非縮小とし，図だけを残り領域へcontainで収める．図自体の寸法を固定したい場合は `.figure-natural` を使い，inlineのwidth/heightと明示cropを維持できる．構図の自動切替，本文削除，文字縮小，overflowの隠蔽は追加していない．

公開調整点は `--body-top-gap: 10px`，`--body-bottom-safe: 48px`，`--body-gap: 0.5em`，`--col-gap: 1rem`，`--figure-gap: 0.5em` とし，既存の `--visual-left/right/gap`，`.place-*`，`.self-*` を継続利用する．旧 `.fill` のbottom reserveは `1.25em` のままである．新しいbodyを選ぶと図の高さ配分とbottom reserveが変わるため，移行はスライド単位で描画確認する．親の左／中央／右揃えは `.fit` の既定auto marginより優先し，子の明示 `.self-*` は保持する．高さの連鎖とcaption込みの制約，固定図と縦積みの調整順序はtheme contractとmedia／placement referenceに記載した．

`_base.css`，`_layouts.css` と生成theme CSSのみを共有実装として変更し，`_typography.css`，theme固有のfont/color tokens，validator，CLIは変更していない．#56／#57への先行契約はmainおよび調整担当に伝達した．新しいADR／XRの採番は行わず，公開契約の採用判断を別記録にする場合はmainが中央採番する．mainの統合検証までは本ISSをin-progressのままとする．

Devin `fusion-gpt-6-1-sol-xhigh-sidekick-swe-2-high` に `tests/e2e/layout-compatibility.spec.js` のみを委任した．OS隔離なしの起動は自動承認レビューが拒否したため実行せず，bubblewrap／socatを一時ディレクトリに展開してsandbox起動した．返却テストをleadが点検・実行し，lab／muji／toshibaの旧不均等列・4種整列・明示crop・表紙余白の18件が成功した．workerはproduction codeとcommitを変更していない．

最初のREDでは，captionを伴う図がfooter領域まで伸びることをブラウザーで確認した．`.figure-natural` のinline高さが旧figureのflex成長に上書きされる問題と，`.fit` のauto marginが左／右揃えを打ち消す問題も追加テストで再現してから修正した．対象検証は下記に記録する．sandbox内ではChromium IPCとdesignmdの同期子プロセスでEPERMが発生したため，同じコマンドを許可された通常プロセス環境で実行した．これらの環境エラーを成功に数えていない．

### Committed baseline comparison

#54の `119fbbb` がcommitされた後でのみ，その `fixtures/layout-baselines/` を読み，`git archive` で一時作業ディレクトリへ展開した．比較対象はfigure，columns，stack，resultsの標準／境界計8ケースで，本文・表・数式の6ケースは両条件から同じように除外した．変更前CSSは `1711332`，変更後CSSは `44a841d` である．原本および他worktreeは編集していない．

変更後はfigureページを `.body.box` で囲み，列ページを `.body.col.visual` と既存の2:1幅重みにし，縦積みwrapperを `.body.box` とし，結果ページでは図と補足本文を同じ `.body.box` に入れた．列gapは `--visual-gap: 1.5rem`，縦積みgapは `--body-gap: 1rem` に明示した．図，数値，caption，本文，脚注，boldとmarkerは保持した．ページ固有CSS，座標補正，空spacer，transformは両条件とも0である．基準例には元から個別寸法指定がないので，この比較を「指定数の削減」の根拠とはしない．追加は単図／結果用の各1wrapper，列の幅・gapパラメータ，縦積みgapだけで，個別のmax-heightやcaption高の再計算は不要だった．

| ケース | 変更前 | `.body` 選択後 |
| --- | --- | --- |
| 単図／caption一行追加 | 3テーマともclippingなし，図は自然寸法 | captionは1行／2行を維持し，本文下端672px以内でメディアが残余高さを使用 |
| 不均等列／縦長図 | 縦長版の図＋captionがlab 805.5px，muji 808.2px，toshiba 817.5pxまで伸び，各テーマ2件のclipping | 全テーマ0件，caption下端672px，containを維持 |
| 縦積み／下段素材の高さ追加 | 順序とcaptionは存在，素材高で全体高が変化 | 同じ残余領域に図2枚とcaption2個が収まり，順序を維持 |
| 結果と補足／長い脚注 | bold／markerと脚注は存在 | 本文と脚注が分離し，markerを保持．長い脚注はlab／toshiba 677px，muji 677.3pxから開始し，本文下端672pxと干渉しない |

変更後の8ケース×3テーマではclipping，overlap，small-text，edge-crowdingは0件だった．これは図内容の正しさや快適な読みやすさを保証する評価ではない．画像確認ではlabの縦長図・縦積み境界とmujiの長脚注結果について，ラベル，数値，矢印，caption，marker，出典が残ることを確認した．他の画像の完全な視覚レビューと，元my-decksの意図との照合は未実施である．

描画条件はNode 25.6.0，Marp Core 5.0.2，Playwright 1.58.2，Chromium 145.0.7632.6，1280×720，DPR 1である．Google Fontsの通信を止め，Google Fonts repositoryのNoto Sans JP可変TTF（SHA-256 `c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`）を両条件へ同じように埋め込んだ．CDPでも見出しのcustom font使用を確認した．外部SVG画像はページのwebfontを継承しないため，初回の欠字を見た実行は図内ラベル評価に使わず保存した．再比較では同じTTFからラベル27文字のwoff2 subset（SHA-256 `86fe6d5d8ebd71a87280cebfe32b6e200a73d22c5b5a496cc26bc3fd68c72d8b`）をSVG内へ両条件同一に埋め込んだ．図内ラベルの欠字が消えた画像で上記確認を行った．

全量の48画像とraw auditは当初session内の一時成果物として保存した．その後，mainの指示で代表5画像と全3テーマの関連寸法・条件・hashを [永続証跡](../evidence/ISS-0047-body-layout/README.md) へ抽出した．[manifest](../evidence/ISS-0047-body-layout/manifest.json) が履歴上の原稿・CSS・SVGをGit blobとSHA-256で固定し，[再実行harness](../evidence/ISS-0047-body-layout/rerun.cjs) が一時スクリプトを置き換える．48枚全量とフォント本体は恒久保存に含めず，保存範囲と比較の限界は同READMEに明記した．保存画像は既存結果からそのまま複製し，別出力先へのlab修復組／長caption組の再実行では5枚すべてのPNG hash一致を確認した．mainのXR-0003はこの相対パスの証跡を参照する予定である．

### Minimal repair comparison requested by main

mainが先行3commitのintegration取込とlab縦長列のbefore／after画像確認を完了した後，個別高さ指定の差だけを限定補足した．対象は同じcommit済み基準の `columns-portrait` と，元から収まる対照 `results-footnote-wrap` の2ケースである．CSSは旧 `1711332`／新 `44a841d` に固定し，前節と同じNoto TTF・SVG内subset，1280×720，DPR 1，Chromium 145.0.7632.6を使った．今回は8:4 gridの列幅とgapも新旧で固定し，2:1 flexへの変更を比較から除いた．

旧縦長列の自然寸法ではcaption下端がlab 805.55px，muji 808.17px，toshiba 817.55pxとなり，各テーマでclipping 2件が再現した．実用的な高さ修復は `<figure style="height: 520px">` の1宣言だけで成立した．520pxは，同じ48px bottom reserveを確保するための図全体の空き高さ（lab 536.25px，muji 534.06px，toshiba 524.25px）の最小値を20px単位で切り下げて一度だけ決めた値である．繰り返し探索，追加のmedia寸法，位置補正，空spacerは使っていない．captionを含む図全体の高さなので，caption高を別指定する必要もなかった．

新しい比較版は既存gridを1個の `.body` で囲み，gridへ `.fill`，既存の2列へ `.box` を追加し，`items-start` を `items-stretch` に変更した．列内の内容は上端から読む構成を保つ．既存の `grid-cols-12`，`col-span-8/4`，`gap-6` は変更せず，個別高さ・幅・gapのinline指定やCSS変数は追加していない．列幅と右列開始位置は旧版との差0.1px未満であることをassertした．構造wrapperが1個増え，classも増えるため，これをソース量や総class数の削減とは扱わない．

ただし，高さ修復だけを唯一の旧版の解にすると過大主張になるため，旧CSSの既存 `<figure class="w-3/4">` だけによる代替も測定した．この1 utilityでも図とcaptionは全テーマで収まり，図内ラベルは約18pxを保った．したがって，「旧版に個別高さ指定が必須で，新版で必ず1件減る」とは結論しない．高さ修復経路の比較では1→0件だが，既存width utilityを含む最少の個別高さ指定は旧・新とも0件だった．

| `columns-portrait` の修復経路 | 個別高さ宣言 | その他のcase固有サイズ指定 | caption下端 lab／muji／toshiba | 図内24pxラベルの表示寸法 |
| --- | --- | --- | --- | --- |
| 旧構造＋図全体 `height: 520px` | 1 | 0 | 655.75／657.94／667.75px | 18.37〜18.38px |
| 旧構造＋既存 `.w-3/4` | 0 | 幅utility 1個 | 659.25／648.17／671.25px | 18.00〜18.51px |
| 同じgrid＋新 `.body` の高さ連鎖 | 0 | 0 | 672.00／672.00／672.00px | 18.65〜19.16px |

`results-footnote-wrap` は旧構造のままで修復不要だった．旧版に高さや幅指定を加えていないので，新版との個別高さ比較は0→0件である．旧本文下端495.55／498.56／507.55px，新 `.body` 本文下端672px，脚注上端677.00／677.31／677.00pxで，全条件で脚注と分離した．新bodyは図を拡大して残余領域を使うが，この対照例だけを根拠に移行や調整削減が必要とは扱わない．

2ケース×3テーマ×4条件（無修復，旧高さ修復，旧幅utility，新body）の24描画を保存した．修復／新bodyの18描画ではclipping，overlap，small-text，edge-crowdingが0件，本文・captionのfont-size，正規化した全表示テキスト，alt，bold／markerの文字と色が無修復版と一致することをassertした．メディアはcontainで縦横比を保持し，本文下端672px以内と脚注への非侵入も確認した．leadはlabの高さ修復／新body，toshibaのwidth utility，mujiの新body対照画像を確認し，図内ラベル・数値・caption・補足・脚注が読めることを確認した．

結論は，この縦長列では新bodyが520pxや75%のcase固有サイズ選択を省ける一方，旧版でも既存utilityで修復できる，という範囲である．一般的な「必要な個別高さ指定数の削減」や元々収まる対照例での削減は立証していない．実装の拡張やAC最終項の自動合格扱いは行わず，この限定的な証跡をmainの受入判断へ渡す．

24描画の一時成果物から縦長列の旧／新body／旧幅utility修復の3画像と，長captionの旧／新2画像を [永続証跡](../evidence/ISS-0047-body-layout/README.md) に保存した．[寸法要約](../evidence/ISS-0047-body-layout/summary.json) は全3テーマの修復経路と対照例を保持する．一時絶対pathを参照せず，次のharnessでhashと原稿recipeを照合できる．描画を含む再実行のfont引数と共有lockの指定方法はREADMEに記載した．production／test codeは変更していない．

```sh
node docs/evidence/ISS-0047-body-layout/rerun.cjs --verify
node --check docs/evidence/ISS-0047-body-layout/rerun.cjs
uv run .github/records.py validate
git diff --check
```

### Targeted verification

ブラウザーを使うコマンドはすべて共通の `flock` の下で直列実行した．再実行時は環境で共有するlock fileを `BROWSER_TEST_LOCK` に指定する．

| 実行コマンド | 結果 |
| --- | --- |
| `npm run test:e2e -- tests/e2e/body-layout.spec.js tests/e2e/layout-compatibility.spec.js tests/e2e/body-exports.spec.js tests/e2e/composition-utilities.spec.js --project=chromium --workers=1` | 38件成功，skipなし |
| `node --test tests/unit/theme-css.test.js tests/unit/canvas-size.test.js tests/unit/scroll-slides.test.js` | 39件成功，skipなし，生成theme／tokensのfreshnessと著者向けclass／variableの存在も確認 |
| `npm run test:e2e -- tests/e2e/scroll-slides.spec.js --project=chromium --workers=1 -g 'bare HTML\|an opted-in body\|printing resets'` | 8件成功，3テーマのnormal／invertと4:3／A4，固定領域・印刷を確認 |
| `node --test --test-name-pattern 'paper canvas' tests/unit/visual-overflow.test.js` | 1件成功，実描画のA4 paperを確認，skipなし |
| `npm run marpx -- fixtures/body-layout-slide.md -v --strict --report-dir <report-dir>` | 4ページ，Visual check: measured，errors 0／warnings 0．実行時の一時出力先をparameter表記に一般化 |
| `git diff --check` および新規specの `node --check` | 成功 |

exportテストは同じ4ページのHTML・PNG・PDFを実際に生成し，print時のcaption／media／footerの境界，PNGの1280×720と4枚，PDFの4ページと960×540ptを確認する．PDFの全ページを別レンダラーで画像化したpixel比較，Firefoxの全回帰，統合strict gate，元my-decks全原稿の意図的配置の確認は本branchでは実行していない．統合strict gateと最終acceptanceはmainが担当する．

親計画：#53．基準例と比較方法：#54．

## Problem

my-decksでは，図の中央揃えや列幅に対して `display:flex`，`align-items`，`justify-content`，`max-height` 等の個別指定が繰り返される．
一方，`.box.fill.place-middle.place-center` だけで成立する図中心ページもあり，共通部品の使い方と実際の収まりに差がある．
共通CSSにはヘッダー後や表紙の固定余白もあるため，見出し・図・キャプションの条件が変わるたびに座標合わせを加えるのではなく，標準部品の領域計算を明確にしたい．
これは静的な原稿確認に基づく問題設定であり，個々の調整が不要であると実測したわけではない．

## Goal

標準部品を選んだ通常のページでは，本文領域・図・説明が自然に収まり，例外時も列比率・間隔・整列・図領域などの少数の指定で調整できるようにする．
構図は原稿に明示し，エージェントが描画確認後に変更する．CSSや実行時コードで左右・上下を自動切替しない．

## 変更範囲の案

1. ヘッダー，見出し，本文，脚注・ページ番号の領域契約を整理する．ヘッダー有無，複数行見出し，見出しが列内にあるケースを区別し，残り高さを明示的なbody-level wrapperで扱う．現行 `.fill` を優先的に改善する．
2. `figure` を画像・動画・SVGとキャプションの組として扱い，キャプションの高さを確保した残りへメディアを収める．メディアの縦横比を保ち，複数メディアの縦積みでも説明が押し出されないようにする．
3. `.col`，`.col.visual`，`.box`，`.fill`，`.place-*` の対応範囲を整理する．列比率，内部整列，ギャップを別々に指定できるようにし，同じ意図の指定を複数箇所へ重ねる必要を減らす．
4. 例外は，既存のCSS変数または整合する少数の調整点で扱う．クラス名・変数名の最終決定は実装案でレビューし，旧指定を無断で削除しない．

## Acceptance criteria

- [x] #54の図中心，不均等二列，図の縦積み，結果図と補足の標準例が，座標合わせ，空div，位置補正transform，ページ固有のCSSルールなしで成立する．必要な構図・列比率の明示は許容する．
- [x] 見出しまたはキャプションが一行増える境界例で，図との重なりや脚注への侵入を起こさない．内容量が本当に収まらない例では明確に診断し，隠したり文字を縮めたりしない．
- [x] メディアは縦横比を保つ．既定ではcropしない．意図して指定されたcropや図の表示範囲は保持する．
- [x] 幅・高さ・キャプション込みの制約が干渉する例の調整手順を文書化する．「高さ100%にはどの親領域が必要か」などの前提を示す．
- [x] 列の上端・中央・下端揃えと，図と説明の組が，指定どおり描画されることをブラウザで測る．HTML/画像/PDFの同じ内容でも確認する．
- [x] 既存lab/muji/toshiba，16:9・4:3，paper・opt-in scroll・表紙の既存テストを確認する．共通CSSの変更が意図的な既存配置へ与える差を列挙する．
- [x] 旧原稿で実質的な見た目の変更が必要な場合は，互換動作または明示選択と移行例を提示し，元デッキを一括書換えしない．
- [ ] 標準例の個別指定が減り，例外の調整手順が短く明確になったことを，原稿差分と描画で示す．指定数の削減だけを合格理由にしない．

## 対象外

構図の自動探索，テーマ連動の構図変更，本文の自動削除，文字縮小，無断crop，スクロールによる自動修復，Pele導入は対象外．
図の内容を読んで最適な配置を保証するものではない．

## 実装の入口

`themes/src/_shared/_base.css`，`_layouts.css`，`_paper.css`，`_scroll.css`，`docs/theme-contract.md`，配置・メディアのskill references，`tests/e2e/composition-utilities.spec.js`．
CSSの標準動作をこのIssue，利用可能なTailwind語彙と診断を別Issueで扱う．同じプロパティの設計を二重に進めないよう，共通の配置契約を先に決める．

## 根拠

- [上流の共通配置CSS](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/themes/src/_shared/_layouts.css)と[base](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/themes/src/_shared/_base.css)．
- [6月22日原稿](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/06-22-lab-seminar/slide.md)，[7月13日原稿](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/07-13-lab-seminar-fuzzy-dpt/slide.md)，[8月24日原稿](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/08-24-toshiba-research-introduction/slide.md)．元内容・素材は移管しない．
- 本人の方針と未採用案の区別は#53を参照する．実装・描画比較は未実施．

## 正本記録

repo内ISSは未起票．実装開始時に現行記録を照合し，記録CLIで作成・validateし，本Issueと相互参照する．公開CSS契約の実質的な選択は必要に応じてproposed ADRへ分離する．

## Main final integration 2026-10-21

最終コードbe3fc23でmainがstrict gate（unit504件，fixture18件，browser113件成功，既存Firefox対象外1件skip），固定D2実CLI7件，D2入りZIP2件を実行し，失敗なしを確認した．条件と限定確認の範囲は[統合記録](../design-assets-integration.md)を参照する．ローカル統合の受け入れと公開レビューを区別し，状態はin-reviewを維持する．
個別指定数の一般的な削減は未確認のため，最後の完了条件は未チェックとする．旧width utilityでも縦長図を修復でき，wrapper数は増える．captionを含む収まりと調整方法の明示を今回の実装効果とする．
