---
id: ADR-0003
title: "Compose slide templates with shared Tailwind utilities"
type: decision
status: accepted
date: "2026-10-03"
authors:
  - codex
scope:
  - themes/src/_shared/_safelist.css
  - themes
  - template
  - .agents/skills/marp-slide-types
  - .agents/skills/marp-components
  - .agents/skills/theme-new
  - docs/theme-contract.md
  - scripts/ci-validate-fixtures.js
  - tests/e2e/composition-utilities.spec.js
tags:
  - templates
  - tailwind
  - authoring
depends_on: []
supersedes: []
issues: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm run marpx -- --theme
    - npm run quality:gate:strict
    - npm run marpx -- template/layouts.md --images png
    - npm run marpx -- template/layouts.md --pdf
    - uv run .github/records.py validate
---

# Compose slide templates with shared Tailwind utilities

## Context and Problem Statement

ユーザーは，企業の説明資料として情報密度を保ち，表や比較を端正に見せる枠組みを求めた．対象は既存テーマの配色・書体を直接変更することではなく，Tailwindの使い方とテンプレートの改善である．

従来のTailwind生成対象は文字サイズと配置補助の6クラスだけであり，`grid`や`flex`をスライドに書いても配置用CSSは生成されなかった．エージェントの参照例は専用の段組み・カード部品が中心で，幅や情報の関係を柔軟に組み立てるための共通語彙が不足していた．一方，デッキごとのクラス探索を行わない設計には，利用先の原稿に依存せず同じテーマCSSを配布できる利点がある．

## Decision Drivers

- 読者が比較・判断するための情報と条件を保ち，内容に合わせて幅と配置を選べること
- 構造と装飾を分け，段組みにしただけでカードの背景や文字サイズが決まらないこと
- 既存のテーマとpaperの見た目を保ち，全テーマで同じ配置用クラスが使えること
- スキルの見本と実際に描画できる原稿を一か所で管理すること
- デッキや説明文の語句が共通テーマの生成結果を変えないこと

## Considered Options

### Option 1：既存のカード部品と配色を刷新する

- 利点：既存デッキの印象を一括で変えられる
- 欠点：今回の依頼とは異なる．情報の関係を組み立てる自由度は増えず，過去の資料にも影響する

### Option 2：すべてのデッキをTailwindの探索対象にする

- 利点：多くのTailwindクラスを自由に使える
- 欠点：編集した原稿ごとにビルドが必要になり，利用先のファイルによって共通CSSが変わる．Web向けのクラスを使っても固定キャンバスやPDFの収まりは保証されない

### Option 3：明示生成する配置用クラスと描画可能なひな形を追加する

- 利点：既存のビルド境界を保ったまま，比較表，不均等な段組み，揃った工程説明を作れる
- 欠点：任意のTailwindクラスが使えるわけではなく，共通化するクラスの追加・再ビルド・検証が必要になる

## Decision Outcome

### Chosen Option

Option 3を採用する．`source(none)`と明示的なsafelistを維持し，grid／flex，列幅，間隔，整列，サイズ制約，表の数値表現に必要なクラスを全テーマへ追加する．構造だけを指定するクラスには，背景，罫線，配色，文字サイズを付与しない．既存のカード・callout・timelineは意味のある用途に選べる部品として残す．

`template/layouts.md`を比較表，主資料と補足，工程と成果物の実行可能な見本とする．新規デッキに全ページを自動挿入せず，必要なページの本文を選んで適用する．スキルは同じファイルを参照し，別コピーのひな形を保守しない．項目数や文章量を揃えることより，共通の比較軸，情報の優先順位，出典と条件を優先する．

Tailwindの明示的なクラス生成方法は[公式ドキュメント](https://tailwindcss.com/docs/detecting-classes-in-source-files)を参照した．

### Scope

共有safelistと生成済みテーマ，ひな形，レイアウト・部品・テーマ作成スキル，テーマ契約，描画fixtureとブラウザ検証に適用する．従来の部品の寸法・色・文字指定を変更しない．CSSのレイヤー優先順位を大規模に変更せず，配置用クラスは素のラッパーに適用する方針を明示する．

### Non-goals

新しいブランド，外部の有償UIテンプレート，デッキ単位のTailwindビルド，Web用のレスポンシブ画面，自動の「AIらしさ」採点は導入しない．情報の正しさや見せ方の自然さをテスト合格だけで保証しない．

## Consequences

### Positive

- 8:4や7:5の段組み，共通軸の表，工程ごとの整列をカードの装飾から独立して選べる
- 同じ見本をエージェントが参照し，CIが描画するため，存在しないクラスを例示するずれを検出できる
- 配布済みのテーマと既存デッキの視覚的な連続性を保てる

### Negative

- safelistにないクラスは利用できない．一度だけの要件にはscoped CSS，共通化する要件にはsafelistや共有部品の更新を用いる
- `.col`や`figure`など既存の部品は独自の配置規則を持つ．同じ要素へ相反する指定を重ねず，素のラッパーで構成する必要がある
- 有用な例を増やす場合も，実際の材料と描画結果を点検する作業が残る

### Neutral

- 新規デッキの最初の本文ページは自由なままにし，ひな形の順序を制作手順にしない
- 情報量は実際の可読性で評価し，箇条書きの数やカード数を合否条件にしない

## Validation

- 追加前のCSSでは，不均等なgridと横並びflexの描画テストが3テーマとも失敗することを確認した
- ひな形3ページを画像として確認し，比較表の軸，不均等な段組み，工程ごとの整列を実際の日本語で点検した．PDF出力も成功した
- 3テーマを再生成し，既存のデザイントークンに差分がなく，生成済みCSSは追加のみであることを確認した
- `quality:gate:strict`で単体271件，描画fixture 13件，E2E 16件が成功した．追加した配置検証6件は3テーマの不均等なgrid，間隔，整列，素のラッパーの装飾，数値列の右揃えをブラウザで確認した
- 変更した2スキルの共通frontmatterと本文を`skill-creator`の検査器で確認した．既存の呼出し方針を保持し，検査器の対象外となるメタデータは別途型を確認した．変更した参照ファイルを含むローカルリンク16件も確認した
- 独立した制作比較や人間による自然さの評価は行わず，実装と描画の検証範囲を報告する

## Related Records

ADR-0002は`slide.md`をラフから完成まで編集する制作フローを定める．本判断はその原稿内で内容に合う構造を選ぶための補完であり，ADR-0002を置き換えない．
