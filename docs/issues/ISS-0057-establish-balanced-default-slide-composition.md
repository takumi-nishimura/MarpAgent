---
id: ISS-0057
title: "Establish balanced default slide composition"
type: issue
status: in-review
date: "2026-11-01"
updated: "2026-11-01"
authors:
  - codex
scope:
  - slide-layout
  - themes
  - templates
tags:
  - layout
  - regression
depends_on: []
supersedes: []
artifacts:
  revisions:
    - 2a4f937bbe6f4565a21ba8c7867e2e30948b3e50
    - 1f46c8234b7a10c1718563e9e9f2f5ece3b0988f
  manifests:
    - docs/evidence/ISS-0057-default-composition-2026-11-01/manifest.json
    - docs/evidence/ISS-0057-default-composition-2026-11-01/acceptance.json
  results:
    - docs/evidence/ISS-0057-default-composition-2026-11-01/
  commands:
    - npm run test:d2
    - npm run test:zip:d2
    - MARP_AGENT_REQUIRE_VISUAL=1 node scripts/ci-validate-fixtures.js
    - MARP_AGENT_STRICT_E2E=1 npm run test:e2e -- --workers=1
    - npm run audit:dependencies
---

# Establish balanced default slide composition

## Problem

紹介用作例の確認で，通常ページの文字が左上へ詰まり，短い本文を中央へ置くと見出しから離れすぎることが指摘された．本文領域のgapとMarkdown由来のmarginも二重加算される．mainの2a4f937bbe6f4565a21ba8c7867e2e30948b3e50へ描画テスト8件を加えると，既定原稿のbody，読み幅，16:9／4:3の枠と見出し間隔，過密本文の上側への侵入，段落・表の間隔の全8件が失敗した．

## Goal

新しい通常ページを共通の本文領域から作れ，説明・表は本文量によらない間隔で見出しに続く．図との位置合わせなど，意図した中央配置も利用できる．過密な内容は上の見出しへ侵入せず，縮小・隠蔽で欠陥を見えなくしない．テーマ・ひな形・配置ガイドを揃え，最新mainの脚注予約と共存させる．

## Acceptance criteria

- [x] Labの通常ページの文脈ヘッダー，見出し，本文の余白と階層を共通tokenとCSSで定義する．
- [x] 新規原稿と標準見本は見出しの下に直接bodyを持ち，短い説明・表を既定で見出しの近くへ配置する．
- [x] 本文内の間隔の二重加算を解消し，読み幅の指定と上端配置を併用できる．
- [x] 中央配置で高さが足りない場合は本文領域の上端へ寄せ，内容を隠したり縮めたりしない．
- [x] 既存の脚注予約，図のnatural／cropの選択，表紙・紙面・scrollの動作を保つ．
- [x] 3テーマの生成物，標準ひな形，スキルの配置参照，文書を揃え，#70のスキル再編を維持する．
- [x] 構造の回帰試験，既存fixture・出力の確認と，条件を記録した描画の目視点検を行う．

## Out of scope

紹介用作例全体の構成・文章・画像更新，README全体の改稿，個人サイトのブログ，スキルの入口の再変更，既存資料の一括移行，読みやすさや理解度の実験的な実証．

## Approach

designs/lab/DESIGN.mdのtokenとthemes/src/lab/_frame.cssで通常ページの枠を定義する．共通のbase／layoutsで見出しとbodyの間隔，本文内のgap，safe center，読み幅を扱う．通常のMarkdown引用にも境界を付ける．templateと配置ガイドを共通bodyの使用に揃える．compiled CSSは最新のsourceから再生成し，脚注のmarpagent-body-bottom-reserveを保持する．

既存の重なり検出テストは，本文と脚注を同じ高さへ明示配置する小さな変更として分ける．衝突量の期待値は保持し，テーマやfontによってテスト用の衝突自体が消えることを避ける．

## Notes

基点はPR #70統合後の2a4f937bbe6f4565a21ba8c7867e2e30948b3e50．BudouXとスキル再編はmainにある状態で作業する．紹介用作例の未公開改稿は元の作業コピーへ保持し，このPRへ混在させない．

この記録は最新mainの記録CLIで採番した．旧作業コピーの未公開layout記録は，mainに後から入った別内容のISS-0054と番号が重複していた．旧記録のIDやmainのISS-0054を書き換えず，元ファイルと過去の検証結果を作業証跡として保存した．mainのISS-0054とのsupersedes関係は設定しない．過去の混在作業コピーの成功件数を，このPR候補の検証結果として流用しない．

## Implementation and validation

Labの通常ページは，左右5%・最大64px，48pxの文脈ヘッダー，19.5pxのラベル，24pxのヘッダーからの間隔を使う．本文領域ではheading gapとblock gapを分け，読み幅の指定をboxで上書きしない．middle placementはsafe centerとし，高さが足りない内容は本文の上端から見える状態を保つ．通常の引用は本文サイズのまま罫線・背景・内側余白を持つ．これらをdefault scaffold，3構図の標準見本，配置ガイドへ反映した．

既定の枠・間隔に関する8件と，3テーマの引用3件は変更前に失敗し，変更後は11件すべて成功した．既存の重なり検出ケースも基点で失敗し，本文と脚注を同じ高さへ配置した独立コミットで，同じ期待値のまま成功した．歴史的なbenchmarkの原稿・CSS・PNGは書き換えていない．

配色の確認で，追加した引用背景が暗色で明るく残る3件と，小型のLab文脈ヘッダーがDracula配色で約3.03:1となる1件を再現した．引用背景を現在の前景・背景色のmixへ，文脈ヘッダーを前景色へ揃えた．最終の描画回帰は15件成功し，引用24条件とLabヘッダー8条件を含む．最終の観測では引用の最小contrast比は約5.94:1，Lab文脈ヘッダーは約6.57:1だった．全資料のWCAG適合を主張するものではない．

最終受入れの対象runtime revisionは1f46c8234b7a10c1718563e9e9f2f5ece3b0988fで，開始時の作業コピーはcleanだった．macOS arm64，Node 25.6.0，uv 0.13.6，D2 0.9.0を使った．CIのuvは0.13.1であり，このローカル実行をLinuxのhosted runnerと同一の環境とは扱わない．fontはworkflowと同じ元TTFのchecksumとfonttools 4.60.1／weight 400を使った．

| Check | Result |
| --- | --- |
| 記録検証 | 79件成功 |
| 全単体試験 | 全540件をfile単位のconcurrency=1で実行し，538 passed，0 failed，既存platform対象外2 skipped |
| strict fixture描画 | 18件成功．主作例15枚と標準見本を含み，描画を省略した成功ではない |
| strict browser E2E | workers=1で156 passed，0 failed，既存Firefox対象外1 skipped．PDF・PPTX・HTML・画像，脚注，紙面，scrollを含む |
| 固定D2受入れ | 7 passed，0 failed，0 skipped |
| portable D2 ZIP受入れ | 2 passed，0 failed，0 skipped |
| 依存監査 | reviewed ISS-0042 baselineに一致して成功．脆弱性ゼロの主張ではない |
| スキルと参照 | 8件のfrontmatterは基点とbyte単位で同一．59件のローカルリンクを解決．core field投影の8件をhost validatorで検証 |

npm run ci:fullの構成検査を個別に実行し，単体fileとbrowser workerを直列化した．そのコマンドを一括で実行して成功した結果とは区別する．初回のD2試験へ後段用のMARP_AGENT_REQUIRE_VISUAL=1を誤って継承させ，意図的なbrowser不在を検査する1件が失敗した．そのログは保存し，CIのD2段階と同じく後段用のflagを外して7件を再実行し，全件成功した．portableの2件も同じ条件で再確認した．初回の失敗を削除・成功へ置換していない．

配色修正後の最終revisionでは，flagを段階ごとに設定した新しい実行で全構成検査が成功した．最終のbrowser出力画像・PDFとlogは，次のテスト実行や作業コピーの削除より先に証跡へ保存した．

## Rendered comparison and limits

[比較条件と画像](../evidence/ISS-0057-default-composition-2026-11-01/review.md)に，3テーマと4:3の固定入力による計116枚の描画，fontの実使用probe，寸法とauditの観測値を残した．3テーマの対照全体と，Labの長い見出し・caption・縦長図・縦積み・長い脚注・追加行の表を目視した．

Labの短文の見出し間隔は9.75px→35.75px，明示した読み幅は1200px→720pxとなった．natural図とcaptionの間隔はLabで9.75pxを維持した．固定原稿の縦長図の境界ケースは未解消で，各テーマにclippingが2件残る．Labの最大はみ出しは83px→85pxであり，改善した例として数えない．このPRは既存資料の自動移行や，読みやすさ・理解度の実験的検証を完了したものではない．

この検証後に加えた証跡と記録は文書のみであり，runtime・テーマ・ひな形・試験コードの内容を変えていない．
