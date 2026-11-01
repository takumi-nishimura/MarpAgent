---
id: ISS-0057
title: "Establish balanced default slide composition"
type: issue
status: in-progress
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
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Establish balanced default slide composition

## Problem

紹介用作例の確認で，通常ページの文字が左上へ詰まり，短い本文を中央へ置くと見出しから離れすぎることが指摘された．本文領域のgapとMarkdown由来のmarginも二重加算される．mainの2a4f937bbe6f4565a21ba8c7867e2e30948b3e50へ描画テスト8件を加えると，既定原稿のbody，読み幅，16:9／4:3の枠と見出し間隔，過密本文の上側への侵入，段落・表の間隔の全8件が失敗した．

## Goal

新しい通常ページを共通の本文領域から作れ，説明・表は本文量によらない間隔で見出しに続く．図との位置合わせなど，意図した中央配置も利用できる．過密な内容は上の見出しへ侵入せず，縮小・隠蔽で欠陥を見えなくしない．テーマ・ひな形・配置ガイドを揃え，最新mainの脚注予約と共存させる．

## Acceptance criteria

- [ ] Labの通常ページの文脈ヘッダー，見出し，本文の余白と階層を共通tokenとCSSで定義する．
- [ ] 新規原稿と標準見本は見出しの下に直接bodyを持ち，短い説明・表を既定で見出しの近くへ配置する．
- [ ] 本文内の間隔の二重加算を解消し，読み幅の指定と上端配置を併用できる．
- [ ] 中央配置で高さが足りない場合は本文領域の上端へ寄せ，内容を隠したり縮めたりしない．
- [ ] 既存の脚注予約，図のnatural／cropの選択，表紙・紙面・scrollの動作を保つ．
- [ ] 3テーマの生成物，標準ひな形，スキルの配置参照，文書を揃え，#70のスキル再編を維持する．
- [ ] 構造の回帰試験，既存fixture・出力の確認と，条件を記録した描画の目視点検を行う．

## Out of scope

紹介用作例全体の構成・文章・画像更新，README全体の改稿，個人サイトのブログ，スキルの入口の再変更，既存資料の一括移行，読みやすさや理解度の実験的な実証．

## Approach

designs/lab/DESIGN.mdのtokenとthemes/src/lab/_frame.cssで通常ページの枠を定義する．共通のbase／layoutsで見出しとbodyの間隔，本文内のgap，safe center，読み幅を扱う．通常のMarkdown引用にも境界を付ける．templateと配置ガイドを共通bodyの使用に揃える．compiled CSSは最新のsourceから再生成し，脚注のmarpagent-body-bottom-reserveを保持する．

既存の重なり検出テストは，本文と脚注を同じ高さへ明示配置する小さな変更として分ける．衝突量の期待値は保持し，テーマやfontによってテスト用の衝突自体が消えることを避ける．

## Notes

基点はPR #70統合後の2a4f937bbe6f4565a21ba8c7867e2e30948b3e50．BudouXとスキル再編はmainにある状態で作業する．紹介用作例の未公開改稿は元の作業コピーへ保持し，このPRへ混在させない．

この記録は最新mainの記録CLIで採番した．旧作業コピーの未公開layout記録は，mainに後から入った別内容のISS-0054と番号が重複していた．旧記録のIDやmainのISS-0054を書き換えず，元ファイルと過去の検証結果を作業証跡として保存した．mainのISS-0054とのsupersedes関係は設定しない．過去の混在作業コピーの成功件数を，このPR候補の検証結果として流用しない．
