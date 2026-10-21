---
id: ISS-0048
title: "Clarify layout overrides and diagnose undefined classes"
type: issue
status: in-progress
date: "2026-10-21"
updated: "2026-10-21"
authors:
  - codex-main-leader
scope:
  - validation
tags:
  - feature
depends_on: ["ISS-0047"]
supersedes: []
artifacts:
  revisions:
    - 2eb7616
    - e3bd772
  manifests: []
  results: []
  commands: []
---

# Clarify layout overrides and diagnose undefined classes

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/56

## Execution update 2026-10-21

本人がIssueごとのCodex sol maxサブリーダー，Herdr worktreeによる並行開発，Devin・無料OpenCodeの活用を指示した．本ISSを作業の正本とし，以下は起票時に取り込んだGitHub仕様である．本文中の未起票・未実装・過去の権限境界は元の記録時点を表す．
D2を積極的に採用する最新方針を反映し，#61は採用を進める実装対象とする．個々のCLI・公開変数・外部参照仕様の選択は実装根拠と検証を添える．
この記録の作成自体は機能の完了を意味しない．mainへの直接書込・push・merge・GitHubコメント送信は各サブリーダーの担当外とする．

## Coordination

Main coordination branch: coord/issues-53-61-20261021．
GitHub IssueとISSの対応: #53 = ISS-0045，#54 = ISS-0046，#55 = ISS-0047，#56 = ISS-0048，#57 = ISS-0049，#58 = ISS-0050，#59 = ISS-0051，#60 = ISS-0052，#61 = ISS-0053．
#56の診断と#57の比較案は先行可能だが，CSS契約は#55と整合させる．#59は#58の参照解決部分だけを先行依存とし，検索UIの完了待ちにしない．#61は独立着手する．

親計画：#53．評価例：#54．共通配置の標準動作：#55．

## Problem

現在は `source(none)` と明示safelistで，共通CSSをデッキ内容から独立して生成している．
一方，safelist外のTailwindクラスを書いても使えず，validatorはデッキ内の未定義クラスをまだ警告しない．
また，レイヤー外の要素スタイルや `.col` 等の部品規則がutilityより優先される場合があり，ラッパーや個別CSSを重ねる必要が生じる．
「クラスが存在しない」「存在するが対象要素・上書き関係が違う」「高さ等の前提がない」を区別できると調整しやすい．

## Goal

よく使う例外調整を短い指定で表現し，エージェントが利用可能な指定と適用条件を確認できるようにする．
標準動作自体は#55で改善し，本Issueではその調整方法・診断・文書を整える．

## 変更範囲の案

1. #54の原稿から，列比率，整列，間隔，余白，文字揃え，行間，図の収め方に必要な語彙を抽出する．既存の `.place-*` やCSS変数を優先し，同じ目的のクラスを重複追加しない．
2. 基本値をテーマtokenへ接続し，公開する変数とutilityの適用対象をtheme contractに示す．ページ固有の値はinlineのCSS変数やscoped CSSでも指定できるようにする．
3. `base/components/utilities` とレイヤー外規則の優先順位を調査し，影響を限定して整理する．部品を直接調整できる場合と，意味のあるwrapperを使う場合を実行可能な例で示す．全CSSの一括レイヤー移行を前提にしない．
4. 共通テーマとデッキ内CSSから利用可能なクラスを確認し，未定義または利用条件不明の指定を，元行・ページ・候補付きで返す．診断に実際の適用状態まで扱う場合はcomputed styleを用い，名前の照合だけで効果を断定しない．
5. クラス一覧・例・生成CSS・テストを同じ契約から追跡できるようにする．新しいクラス生成方式そのものを導入する必要はない．

## Acceptance criteria

- [ ] よく使う調整が共通クラスまたは少数のCSS変数で書け，個別の `!important` や長いselectorを重ねずに済む例がある．何が減ったかを#54の比較方式で示す．
- [ ] inline/scoped CSSによる意図的な上書きを保持し，テーマ変更だけで構図を切り替えない．文字サイズutilityの既存のem/rem挙動を無断で変更しない．
- [x] 未生成のTailwindクラス，タイプミス，デッキ内で正しく定義したクラス，複合selector内のクラスを区別するテストがある．コード例内のclass文字列やMarpが付加するクラスを誤警告しない．
- [x] 動的または外部CSSなど，静的解析で判定できないものは「不明」とし，機械的に削除・改名しない．使われていないCSS marker classも即不合格にしない．
- [x] 診断は既存validatorの助言として始め，実際の描画欠陥のerrorと分ける．元ファイル・行・描画ページを既存slide mapへ対応付ける．
- [x] `h-full` の親高さなど，検出範囲と限界を文書化する．診断がないことを配置の適切さの保証にしない．
- [ ] 全配布テーマで公開クラスと変数が存在し，デッキを追加しても共通CSS生成結果が変化しない．生成済みthemesの鮮度テストも通る．
- [ ] 既存原稿の明示指定を保持し，互換性差分と移行例を確認できる．美観変更はlabの別Issueへ分ける．

## 対象外

全Tailwind語彙の開放，デッキ別JIT，レスポンシブな構図切替，独自CSSの禁止，コード量のみの最適化は対象外．
新しいクラス名や警告名は設計案であり，実装前の確認で確定する．

## 入口と依存関係

`themes/src/_shared/_safelist.css`，`_base.css`，`_layouts.css`，`_typography.css`，`src/deck-validator.js`，`src/slide-map.js`，`tests/unit/theme-css.test.js`，`docs/theme-contract.md`，配置関連skills．
診断の試作は#55と並行できるが，最終的な調整語彙と上書き規則は#55の領域契約と整合させる．

## 根拠

- [theme contract](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/docs/theme-contract.md)のTailwind BoundaryとDeck author policy．
- [ADR-0003](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/docs/decisions/ADR-0003-compose-slide-templates-with-shared-tailwind-utilities.md)，[明示safelist](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/themes/src/_shared/_safelist.css)．
- [Tailwind公式のcustom styles解説](https://tailwindcss.com/docs/adding-custom-styles)．実装ではリポジトリが固定する版の挙動を確認し，最新Webドキュメントの機能がそのまま使えると仮定しない．
- my-decksの静的利用確認は[PR #52の追記](https://github.com/takumi-nishimura/MarpAgent/pull/52#issuecomment-6251211532)．本Issueの効果は未測定．

## 正本記録

repo内ISSは未起票．実装開始時に既存記録を照合し，記録CLIによる作成・validateと本Issueへのリンクを行う．ADR-0003を維持する範囲と，別のproposed ADRが必要な契約変更を分ける．

## Notes

### 独立実装 checkpoint 2026-10-21

`src/class-diagnostics.js` で authored HTML と class directive を解析し，既存 validator に接続した．
既存の `parseSource` を使ってコード例と speaker notes 内のタグを除外し，HTML parser で属性の quote・entity・重複を処理する．
CSS は PostCSS と selector parser で調べ，コメント・宣言中の文字列・URLを class 定義と誤認しない．
HTML／CSS／selector／YAML の4つの parser は lockfile 内に既に存在した版を直接依存として明示し，新しい版への更新は行っていない．
YAML の値は Marp の解釈を維持し，宣言行は YAML AST の root key の source range から取得する．
block string 内の `class:`，flow mapping，複数行 comment directive の行対応も回帰テストを追加した．

診断スキーマは `ruleId: undefined-class | class-availability-unknown`，`severity: info`，`source: classes` とする．
`className`，`reason`，`unknownReasons`，`candidates`，使用箇所または継承元の `line` を追加し，
`slide / renderedSlide / sectionId / page` は既存 slide map を使う．
ファイルは既存 JSON/report の `deckPath` と SARIF の artifact location から特定できる．
hint は render の成功・省略によらず非 blocking であり，report 用スクリーンショットの対象を増やさない．

active な生成済み theme CSS，最後に有効な `style:`，HTML の global／scoped style を対象とする．
外部 stylesheet／import，script／動的 class，非列挙 selector，CSS parse failure は不明とし，自動修正しない．
配布 theme の既知の Noto Sans JP font import は class 語彙の対象外という契約で扱う．同じ URL の deck import は不明とする．
scaffold の section marker `normal` は意図的な無装飾の指定として認識する．
header／footer directive 内 HTML と外部文書の class は未検査であり，親高さや cascade／computed style の実効性は判定しない．
隠しスライドは既存原稿診断と同じく対象に残し，描画位置・page を null とする．

`docs/layout-adjustments.md` に，#55 の `.body`，`.figure-natural`，既存 `.place-*`，
`--visual-left / --visual-right / --visual-gap` と
`--body-top-gap / --body-bottom-safe / --body-gap / --col-gap / --figure-gap` に沿った指定先と上書き規則を定義した．
本 branch は共通 CSS，safelist，文字サイズの em/rem，生成済み theme を変更しない．
#55 の CSS を main が取り込むと，新部品の class も同じ生成 CSS inventory で認識する．
本 branch で `.body` の mechanics や `.figure-natural` の描画が確認できたという意味ではない．

無料 helper は `opencode/glm-5.3-flash-free` を使い，tool／ファイル操作なしの境界例列挙を180秒上限で1回依頼した．
12ケースの出力を自分で確認し，該当する実テストを実行した．隠しスライドを除外する提案は既存方針と異なるため不採用とした．
worker patch や独立 reviewer は使っていない．

実行済みチェック：

- `node --test tests/unit/class-diagnostics.test.js tests/unit/class-validation.test.js tests/unit/markdown-source.test.js tests/unit/slide-map.test.js`：33件 pass．
- `flock /tmp/marpagent-parallel-20261021/browser-tests.lock node --test tests/unit/validate-deck.test.js tests/unit/validate-observability.test.js tests/unit/validation-failures.test.js tests/unit/lint-deck.test.js tests/unit/scroll-validation.test.js tests/unit/hide-slides.test.js`：79件 pass，skip なし．
- `node --test tests/unit/theme-css.test.js tests/unit/package-json.test.js`：27件 pass．全3配布 theme の fresh build とデッキ非依存 safelist の既存検査を含む．

最終版で上記139件を再実行し，fail／skip は0件だった．
sandbox 内で `spawnSync` に EPERM が付く一方で status 0・空 stdout を返す現象を切り分けたため，
最終の Node テストは sandbox 外で実行した．生成 CSS／design token を書き換えて回避していない．
`uv run .github/records.py validate` は61記録の検証に成功した．

残る受入項目は #54 の比較例と #55 の mechanics を統合した後の調整量・明示指定の保持の確認である．
`src/deck-validator.js` の接点は import，`validateDeckMarkdown` の診断追加，SARIF properties に限定し，
#61 の renderer error builder は変更していない．main が統合確認するまで status は in-progress のまま維持する．
