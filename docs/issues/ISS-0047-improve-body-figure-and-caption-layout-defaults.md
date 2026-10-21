---
id: ISS-0047
title: "Improve body figure and caption layout defaults"
type: issue
status: in-progress
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
  manifests: []
  results:
    - docs/theme-contract.md
    - /tmp/marpagent-i55-body-validation/report.json
    - /tmp/marpagent-i55-baseline119-font/comparison.json
  commands:
    - node --test tests/unit/theme-css.test.js
    - npm run test:e2e -- tests/e2e/body-layout.spec.js tests/e2e/composition-utilities.spec.js --project=chromium --workers=1
    - npm run test:e2e -- tests/e2e/layout-compatibility.spec.js tests/e2e/body-exports.spec.js --project=chromium --workers=1
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

Devin `fusion-gpt-6-1-sol-xhigh-sidekick-swe-2-high` に `tests/e2e/layout-compatibility.spec.js` のみを委任した．OS隔離なしの起動は自動承認レビューが拒否したため実行せず，bubblewrap／socatを `/tmp` に展開してsandbox起動した．返却テストをleadが点検・実行し，lab／muji／toshibaの旧不均等列・4種整列・明示crop・表紙余白の18件が成功した．workerはproduction codeとcommitを変更していない．

最初のREDでは，captionを伴う図がfooter領域まで伸びることをブラウザーで確認した．`.figure-natural` のinline高さが旧figureのflex成長に上書きされる問題と，`.fit` のauto marginが左／右揃えを打ち消す問題も追加テストで再現してから修正した．対象検証は下記に記録する．sandbox内ではChromium IPCとdesignmdの同期子プロセスでEPERMが発生したため，同じコマンドを許可された通常プロセス環境で実行した．これらの環境エラーを成功に数えていない．

### Committed baseline comparison

#54の `119fbbb` がcommitされた後でのみ，その `fixtures/layout-baselines/` を読み，`git archive` で作業用 `/tmp` へ展開した．比較対象はfigure，columns，stack，resultsの標準／境界計8ケースで，本文・表・数式の6ケースは両条件から同じように除外した．変更前CSSは `1711332`，変更後CSSは `44a841d` である．原本および他worktreeは編集していない．

変更後はfigureページを `.body.box` で囲み，列ページを `.body.col.visual` と既存の2:1幅重みにし，縦積みwrapperを `.body.box` とし，結果ページでは図と補足本文を同じ `.body.box` に入れた．列gapは `--visual-gap: 1.5rem`，縦積みgapは `--body-gap: 1rem` に明示した．図，数値，caption，本文，脚注，boldとmarkerは保持した．ページ固有CSS，座標補正，空spacer，transformは両条件とも0である．基準例には元から個別寸法指定がないので，この比較を「指定数の削減」の根拠とはしない．追加は単図／結果用の各1wrapper，列の幅・gapパラメータ，縦積みgapだけで，個別のmax-heightやcaption高の再計算は不要だった．

| ケース | 変更前 | `.body` 選択後 |
| --- | --- | --- |
| 単図／caption一行追加 | 3テーマともclippingなし，図は自然寸法 | captionは1行／2行を維持し，本文下端672px以内でメディアが残余高さを使用 |
| 不均等列／縦長図 | 縦長版の図＋captionがlab 805.5px，muji 808.2px，toshiba 817.5pxまで伸び，各テーマ2件のclipping | 全テーマ0件，caption下端672px，containを維持 |
| 縦積み／下段素材の高さ追加 | 順序とcaptionは存在，素材高で全体高が変化 | 同じ残余領域に図2枚とcaption2個が収まり，順序を維持 |
| 結果と補足／長い脚注 | bold／markerと脚注は存在 | 本文と脚注が分離し，markerを保持．長い脚注はlab／toshiba 677px，muji 677.3pxから開始し，本文下端672pxと干渉しない |

変更後の8ケース×3テーマではclipping，overlap，small-text，edge-crowdingは0件だった．これは図内容の正しさや快適な読みやすさを保証する評価ではない．画像確認ではlabの縦長図・縦積み境界とmujiの長脚注結果について，ラベル，数値，矢印，caption，marker，出典が残ることを確認した．他の画像の完全な視覚レビューと，元my-decksの意図との照合は未実施である．

描画条件はNode 25.6.0，Marp Core 5.0.2，Playwright 1.58.2，Chromium 145.0.7632.6，1280×720，DPR 1である．Google Fontsの通信を止め，Google Fonts repositoryのNoto Sans JP可変TTF（SHA-256 `c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`）を両条件へ同じように埋め込んだ．CDPでも見出しのcustom font使用を確認した．外部SVG画像はページのwebfontを継承しないため，初回の欠字を見た実行は図内ラベル評価に使わず保存した．再比較では同じTTFからラベル27文字のwoff2 subset（SHA-256 `86fe6d5d8ebd71a87280cebfe32b6e200a73d22c5b5a496cc26bc3fd68c72d8b`）をSVG内へ両条件同一に埋め込んだ．図内ラベルの欠字が消えた画像で上記確認を行った．

入力Markdown，CSS，48枚の画像，raw auditは `/tmp/marpagent-i55-baseline119-font/`，再実行用スクリプトは `/tmp/marpagent-i55-compare.cjs` に保存した．一時パスはこのsession内の証跡であり，恒久的な比較記録を採用する場合はmainがXR等へ保存先を割り当てる．

### Targeted verification

ブラウザーを使うコマンドはすべて `flock /tmp/marpagent-parallel-20261021/browser-tests.lock` の下で直列実行した．

| 実行コマンド | 結果 |
| --- | --- |
| `npm run test:e2e -- tests/e2e/body-layout.spec.js tests/e2e/layout-compatibility.spec.js tests/e2e/body-exports.spec.js tests/e2e/composition-utilities.spec.js --project=chromium --workers=1` | 38件成功，skipなし |
| `node --test tests/unit/theme-css.test.js tests/unit/canvas-size.test.js tests/unit/scroll-slides.test.js` | 39件成功，skipなし，生成theme／tokensのfreshnessと著者向けclass／variableの存在も確認 |
| `npm run test:e2e -- tests/e2e/scroll-slides.spec.js --project=chromium --workers=1 -g 'bare HTML\|an opted-in body\|printing resets'` | 8件成功，3テーマのnormal／invertと4:3／A4，固定領域・印刷を確認 |
| `node --test --test-name-pattern 'paper canvas' tests/unit/visual-overflow.test.js` | 1件成功，実描画のA4 paperを確認，skipなし |
| `npm run marpx -- fixtures/body-layout-slide.md -v --strict --report-dir /tmp/marpagent-i55-body-validation` | 4ページ，Visual check: measured，errors 0／warnings 0 |
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

- [ ] #54の図中心，不均等二列，図の縦積み，結果図と補足の標準例が，座標合わせ，空div，位置補正transform，ページ固有のCSSルールなしで成立する．必要な構図・列比率の明示は許容する．
- [ ] 見出しまたはキャプションが一行増える境界例で，図との重なりや脚注への侵入を起こさない．内容量が本当に収まらない例では明確に診断し，隠したり文字を縮めたりしない．
- [ ] メディアは縦横比を保つ．既定ではcropしない．意図して指定されたcropや図の表示範囲は保持する．
- [ ] 幅・高さ・キャプション込みの制約が干渉する例の調整手順を文書化する．「高さ100%にはどの親領域が必要か」などの前提を示す．
- [ ] 列の上端・中央・下端揃えと，図と説明の組が，指定どおり描画されることをブラウザで測る．HTML/画像/PDFの同じ内容でも確認する．
- [ ] 既存lab/muji/toshiba，16:9・4:3，paper・opt-in scroll・表紙の既存テストを確認する．共通CSSの変更が意図的な既存配置へ与える差を列挙する．
- [ ] 旧原稿で実質的な見た目の変更が必要な場合は，互換動作または明示選択と移行例を提示し，元デッキを一括書換えしない．
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
