---
id: XR-0003
title: Audit design capabilities and evaluation gaps
type: exploration
status: inconclusive
date: "2026-10-18"
authors:
  - chatgpt
scope:
  - .agents/skills
  - designs
  - template
  - src/deck-validator.js
  - src/visual-overflow.js
  - scripts/new-theme.js
  - fixtures
tags:
  - design
  - evaluation
  - authoring
depends_on: []
informs: []
evaluates:
  - ADR-0002
  - ADR-0003
supersedes: []
issues: []
artifacts:
  revisions:
    - 74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16
  manifests: []
  results: []
  commands:
    - env UV_CACHE_DIR=/tmp/marpagent-uv-cache uv run --offline .github/records.py new xr 'Audit design capabilities and evaluation gaps' --author chatgpt
    - env UV_CACHE_DIR=/tmp/marpagent-uv-cache uv run --offline .github/records.py validate
    - pdftoppm -scale-to 1280 -png /tmp/marpagent-existing-example.pdf /tmp/marpagent-existing-example
---

# Audit design capabilities and evaluation gaps

## Context and Question

2026-10-18 JSTの本会話で，本人はMarpAgentのデザイン性能を改善したいが具体的な計画はないと述べ，現状・問題点の把握と，参考記事からの機能候補の検討を依頼した．
本記録はコード・既存評価・参考資料の調査であり，新しい制作方式の採用や生成性能の実験結果ではない．
問いは，現状の機能が何を支援し，何を保証せず，どの改善候補を次に比較すべきかである．

## Motivation

CSS部品，制作スキル，描画検査は異なる役割を持つ．
部品の種類や自動指摘の件数だけでは，スライドの内容を適切に伝える能力の改善を判断できない．
既に解決済みの不具合と，未評価の品質を分け，次の作業の範囲を誤らないために調査した．

## Hypothesis

助手の検討仮説は，主要な不足が基本配置の実装だけにあるのではなく，実素材に応じた見せ方の選択，対案比較，図内の読みやすさの確認，改善効果の評価にあることである．
同じ入力からの制作比較が既に存在する場合や，必要な構図を既存部品で表現できない場合には，対応する部分を再検討する．
本調査はこの仮説を構造上の説明として検討し，性能差の因果効果は測定しない．

## Approach

1. GitHubからmainのSHA，再帰tree，管理対象のコード・規約・既存記録・作例，open PRとissue，最新CI結果を取得した．
2. テキストと取得できた画像の内容をGit blob SHAに照合し，制作手順，テーマ作成，描画検査，fixturesを読んだ．
3. 参考記事と，記事が紹介する一次サイトの配置原則，作例分類，デザインパターン，様式設定を確認した．
4. 確認済み能力，設計上の制約，既存記録による報告，助手の未採用案を分けた．

## Evaluation Conditions

- 対象revision：MarpAgent mainの `74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16`．
- 活動日：2026-10-18 JST．GitHub取得日も同日である．
- 読取範囲：`AGENTS.md`，`docs/records/README.md`，記録CLI，既存ADR 6件，XR 2件，ISS 44件，制作スキル，テーマ，検証実装，作例，fixtures，関連テスト．
- GitHub状態：取得時点でopen PRとGitHub issueは空であり，repo内ISS 44件はいずれもclosedだった．
- CI：上記SHAの[Quality Gate実行](https://github.com/takumi-nishimura/MarpAgent/actions/runs/39124978965)はsuccessだった．このCIは固定資料の機能回帰を確認する．
- 既存XRの取得範囲：XR本文と実装を読んだ．XR-0001/0002が参照する外部の研究デッキ原本や全観測結果を再取得・再測定したわけではない．
- 性能評価：LLMによる新規生成，制作条件の比較，人間による理解・美観の評価は実施していない．
- 実行環境：Node.js 25.6.0とnpm依存を一時環境へ取得した．package-lock.jsonのGit blobは取得前後で`aa881c882cc45f00f1dcf6505111d2a6ec297850`のままである．
- 現行sourceの再描画：Chromium headless shellの取得物をZIPとして展開できず，未実施である．最新CIの成功と今回のローカル未実施を区別する．
- 既存PDFの目視：`decks/example/slide.pdf`を取得し，Git blob `6df3fd7608bb62e3d430917fde961eff22c644cd`との一致を確認した．15ページで，metadataの作成・更新日は2026-10-03である．PDFページ3，4，6，7，8，9，10，12を確認した．これは10月18日のsourceからの再出力ではない．
- 会話出典：上記本人依頼と，ユーザーが示した[参考記事](https://note.com/sust_science/n/n8399bda76d71)．会話URL，conversation ID，turn ID，message IDは取得できていない．

## Observed Results

### 確認できた既存能力

| 対象 | 観測 | 根拠 |
| --- | --- | --- |
| 制作 | 短いbriefと同じslide.mdを使い，実素材を早期に描画して改稿する手順がある | [slide-new](../../.agents/skills/slide-new/SKILL.md)，ADR-0002 |
| 配置 | grid，flex，不均等列，表，図と本文，数値カード，工程列等がある | [theme contract](../theme-contract.md)，[layouts](../../template/layouts.md)，ADR-0003 |
| 様式 | lab，muji，toshibaの3テーマとDESIGN.mdのtoken正本がある | [design index](../../designs/README.md) |
| 参照テーマ | theme-newはlab由来の雛形を作り，source-urlを由来として記録する | [theme-new skill](../../.agents/skills/theme-new/SKILL.md)，[new-theme.js](../../scripts/new-theme.js) |
| 検査 | 切れ，対象範囲内の文字衝突，小さい文字，素材・数式・図の描画失敗等を描画計測とファイル確認で検出する | [deck-validator](../../src/deck-validator.js)，[visual-overflow](../../src/visual-overflow.js) |
| レビュー | 全体の流れ，根拠，重要な図の読み取りを点検する指示がある | [slide-review](../../.agents/skills/slide-review/SKILL.md) |

`marpx`の本体は雛形・描画・検証・出力を担い，意味の理解と構図選択はスキルを読む外部エージェントが担う．
専用LLM実行器がないこと自体を不具合とは扱わない．

### 品質評価と実装の境界

- ADR-0002とADR-0003は，独立した制作比較や人間評価を行っていないと明記している．
  既存の制作指示が妥当でも，改善幅の実証とはならない．
- XR-0001/0002は，共通の較正対象として同じ著者の完成済み8デッキ，69描画枚を使い，exampleとfixturesも確認したと報告している．
  これは生成方式の比較や受け手の理解度の評価ではない．
- `template/layouts.md`の実行可能な標準recipeは，比較表，主資料と補足，工程と成果物の3ページである．
  それ以外の構文例やfixturesも存在するが，研究図表から何を拡大・注釈・比較するかの制作事例は限られる．
- 共通CSSは許可リストのTailwind utilitiesだけを生成する．
  `docs/theme-contract.md`は，未定義classを使ったデッキにvalidatorがまだ警告しないと明記している．
  独自CSSで定義したclassは許可されるため，追加の検査でもそれを誤検出しないことが必要である．
- `theme-new --source-url`は参照ページの見た目を抽出する処理ではない．
  新テーマの雛形fixtureは2ページのテキストであり，代表的な実素材による参照適合の比較を行わない．
- `src/visual-overflow.js`はnested SVG内の文字を通常の文字測定から除外し，画像・SVGを主に矩形で扱う．
  PNGやSVGの内部ラベルが読みやすいことは，`text-too-small`の合格では保証しない．
- 同一block，media同士，数式内，意図的overlay等の衝突には対象外の範囲がある．
  色の区別，重要箇所の目立ちやすさ，意味上のグループ化は，機械検査の合否とは別にレビューする必要がある．
- 文字下限は明らかな判読困難の検出境界として較正された値であり，投影向けの推奨文字サイズではない．
  フォント代替による字幅の差も既知の環境依存である．
- ISS-0031の作例の切れはclosed/completedで，現行ゲートはexampleの描画計測を必須にしている．
  過去の不具合を現存扱いしない．
- 取得済み`overview-mode.png`は旧outline方式を描いている．
  この画像を現行mainからの生成品質の標本にはしない．

新テーマ雛形のCSSには，既存3テーマが読み込む`_shared/_scroll.css`のimportがない．
この静的な整合性の欠落は，内容の伝わりやすさの問題と分ける．
新規テーマでのscroll挙動の再現確認と修正は今回の範囲に含めない．

### 既存PDFから得た作例上の所見

代表ページの本文と見出し，列の整列は目視で読み取れる．
作例は部品紹介を目的としており，以下は編集上の改善候補であって，現行エージェントの平均的性能を示す測定ではない．

- PDFページ3と10では，補足Tipの有色面が大きい．
  主張と補足の重要度に応じた強調の選択をレビューする余地がある．
- ページ7，8，12は，同じoverview画像を縮小して用い，注目箇所の拡大や注釈を持たない．
  図を配置する操作に加え，何を見るかに応じた切出し・拡大・説明の対応付けが候補になる．
- ページ9の4，0，25.x，1は，レイアウト数，CSSの有無，Node版，制作方針という異なる意味の数値である．
  数値カードの外観例にはなるが，共通の比較軸を持つ実験結果の見せ方を学ぶ例とは区別する．

これらに対応する画像参照，文言，Tipは現行`slide.md`にも残る．
現行sourceの外観は再描画していないため，過去PDFの外観と現在の描画を同一とは扱わない．

### 参考資料の示唆

参考記事はデザイン原則，作例，パターン，テンプレート，素材の入口を整理している．
これらのサイトがMarpAgentの性能改善を実証しているわけではない．

- [伝わるデザインのレイアウト解説](https://tsutawarudesign.com/miyasuku4.html)：論理・関係に対応する配置と，余白・整列・グループ化・対比を扱う．
- [Coneのパターン集](https://speakerdeck.com/coneinc/pawapointonodezainpatanda-quan-zi-liao-zuo-cheng-shi-nishi-eru39noaidea)：関係の型と内容量に応じた表現の使い分けを扱う．
- [Slidelandの分類](https://www.slideland.tech/docs/category-list)：用途や図解，色，印象などから作例を探索できる．
- [Pitchの様式設定](https://help.pitch.com/en/articles/4059534-create-your-own-slide-style)：文字・図形・表・グラフ等の共通設定を扱う．
- [伝わるデザインの表とグラフ](https://tsutawarudesign.com/miyasuku1.html)：図表そのものの読取りやすさを扱う．

### 観測からの解釈

現在の構成では，部品を増やしても，適切な部品を選ぶ判断や実素材の解釈が改善するとは限らない．
また，表示不良の検査に合格しても，図中の重要な差，主張と根拠の対応，発表対象者への適合が良くなったとは判断できない．
したがって，改善候補を比べる際には，配置機能，エージェントの選択，図表の処理，評価条件を分ける必要がある．
これはコードと既存記録に基づく解釈であり，現行デザインが低品質であることの定量的証明ではない．

## Conclusion

`inconclusive`とする．
既存能力と評価上の空白は確認したが，どの機能がどれだけ生成品質を改善するかは未測定である．
本人が採用した新方針はなく，本記録の機能候補や優先順位を採用済みとして扱わない．
採用済みADRの更新・置換も行わない．

## Reusable Findings

### 未採用の機能候補

| 候補 | 最小の追加範囲 | 確認する効果 |
| --- | --- | --- |
| 同じ内容の構図比較 | 重要な代表ページだけ2〜3案を描画し，同じ主張・数値・留保を保って比較する | 関係の読み取り，修正負担 |
| 実素材を使う研究用recipe | 比較軸を揃えた結果図，注目領域と拡大図，数式と変数説明，連続動作の比較などを既存部品で実装する | 適用判断，図と説明の対応 |
| 図内の視覚レビュー | 図中ラベル，凡例，色の区別，重要領域をページと領域付きで指摘する | 見逃しと誤検出，読み取りやすさ |
| 参照デザインの具体化 | 観測した特徴とMarpへの適応を分け，表紙・本文・図表の代表ページへ適用する | 参照との適合と内容保持 |
| 利用可能なclassの診断 | 共通CSSとデッキ内CSSを照合し，効かない配置指定を注意として返す | 期待した配置との差と誤検出 |
| デザイン原則の助言 | 整列，近接，対比，一貫性を理由付きで提案する | 人の判断との一致，修正前後の改善 |
| 図表と素材の統一 | 元データ・軸・単位・出典を保ち，文字・色・線・注記を揃える | 正確さと資料全体の統一 |
| 採用例の再利用 | 本人が選んだ様式と適用条件だけを既存briefやDESIGN.md等に残す | 別内容への適用時の修正量 |

助手は，少数の代表ページの比較，実素材recipe，図内レビューを優先候補と考える．
機械検査が対象外の箇所を直ちに新しい失敗条件へ変更せず，客観的な欠陥とデザイン上の助言を区別する．

### 未実施の比較方法

- 比較資料，結果グラフ，概念図など，実際に使う代表的な内容を選ぶ．
- 同じモデル，素材，テーマ，総作業予算で，現行手順と一つの変更だけを比較する．
- 数値・単位・出典・留保の保持を確認し，見た目の評価とは別に記録する．
- 条件を隠した比較で，主張の分かりやすさ，関係の読み取り，図の判読，目的との適合を項目別に確認する．
- 人の修正時間・回数と描画不良を記録する．
  小さな試行は失敗型を見つけるためのものであり，一般的な優越性の確定には用いない．

既存ADRに従い，outlineの正本化，文字数によるblocking判定，固定カード数，強制的なレイアウト多様化を改善策にしない．
外部テンプレートの大量取込み，39パターンの全実装，アニメーションは，必要性が具体化してから別に検討できる．
PowerPointの編集可能性はMarpの通常PPTX出力とは別の制約として扱う．
[Marp CLIの説明](https://github.com/marp-team/marp-cli/blob/main/README.md?plain=1)では，通常PPTXは描画済み画像を中心とし，編集可能な出力は実験的で再現性に制約がある．

## Artifacts

- 調査revision：[74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16](https://github.com/takumi-nishimura/MarpAgent/commit/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16)．
- 既存作例PDF：[decks/example/slide.pdf](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/decks/example/slide.pdf)．
  上記blobとの一致とPDFメタデータを確認し，Popplerで1280×720のPNGへ変換した画像を目視した．
- CI：[Quality Gate](https://github.com/takumi-nishimura/MarpAgent/actions/runs/39124978965)．
- 出典箇所：本文のrepo内pathは上記revisionで確認した．
- 本人発言の参照範囲：2026-10-18 JSTの本会話にある現状把握と参考記事からの検討依頼のみ．
  不明な会話識別子や外部デッキのfull SHAは補っていない．
- 記録正本は本repoである．
  Draft PRでの提示，mainへの統合，Vault同期は別の状態として報告する．

## Revisit Conditions

- 現行スキルによる実資料の生成物と人間の修正例を比較できるとき．
- 図が多い資料や異なるテーマ・フォントで，既存検査の見逃し・誤検出が確認されたとき．
- 本人が改善対象と機能案を具体的に選んだとき．
- 表示用途やPowerPointでの編集要件が変わったとき．

## Related Records

- ADR-0002，ADR-0003の制作支援と検証範囲を直接調査したため，`evaluates`に記録する．
- ADR-0001とXR-0001/0002は，描画計測を採用した背景と検出器較正の根拠として参照した．
- ADR-0004/0005は数式・図の描画，ADR-0006はscroll機能の境界を確認するために参照した．
- ISS-0031の完了済み状態を確認した．
  本調査は同じ不具合の再発を報告していない．
