---
id: ADR-0002
title: "Author and revise decks directly in slide.md"
type: decision
status: accepted
date: "2026-10-03"
authors:
  - codex
scope:
  - .agents/skills
  - template
  - scripts/new-deck.js
  - scripts/generate-outline.js
  - bin/marpx.js
  - README.md
  - AGENTS.md
  - decks/example
tags:
  - authoring
  - skills
depends_on: []
supersedes: []
issues: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm run quality:gate:strict
    - node bin/marpx.js decks/example/slide.md -v --strict
    - uv run .github/records.py validate
---

# Author and revise decks directly in slide.md

## Context and Problem Statement

従来は`brief.md → outline.md → slide.md`の順で制作していた．先に決めた構成と実際の図や本文の収まりに差が生じ，描画後の改稿が`outline.md`との不整合を生む．逆にスライドから構成表を生成しても，同じ内容を一覧するだけなら独立した制作物を維持する必要がない．

ユーザーは，構成表との同期をなくし，実際のスライドを作りながら自然な説明へ整えるフローを選択した．見出しやキーワードからレイアウトを先に割り当てるより，伝える内容と根拠に合わせて見せ方を選ぶ必要がある．

## Decision Drivers

- 構成と本文を二重に管理せず，人間の編集をそのまま次の改稿に使えること
- 図やデータを早期に描画し，構成や密度の問題を仕上げ前に発見できること
- 箇条書きやカードの数を固定せず，内容と対象者に合った表現を選べること
- 小さな編集に余分な計画書や承認段階を要求しないこと
- 既存のデッキと明示的な旧CLI利用を壊さないこと

## Considered Options

### Option 1：outline.mdを制作計画として維持する

- 利点：描画前に構成だけを読む文書がある
- 欠点：本文・順序・レイアウトの変更を別ファイルに反映する必要があり，手戻りと不整合が残る

### Option 2：slide.mdからoutline.mdを生成する

- 利点：本文を正本にでき，構成表のずれを抑えられる
- 欠点：構成の確認には既存のoverviewが使える．別の生成物と生成タイミングが増える

### Option 3：slide.mdをラフから完成まで編集する

- 利点：構成・本文・図を一か所で改稿でき，試作による発見をすぐ反映できる
- 欠点：検討途中のページと完成ページが同居する．一時メモや未解決事項を納品前に確認する必要がある

## Decision Outcome

### Chosen Option

Option 3を採用する．`brief.md`は目的・対象者・制約・資料の短い記録とし，ページ順や本文を複製しない．`slide.md`にラフな構成を置き，重要または不確実なページを実際の材料で早期に描画し，同じ原稿を改稿する．全体の流れは既存の`--overview`などで確認する．短いデッキでは全体の作成と試作を一緒に進めてよい．

`outline.md`の作成・同期を標準フローから外す．既存ファイルは残して固有の意図を確認し，明示的に依頼された構成表の納品は尊重する．旧`--outline`は8項目の旧briefに対する互換機能として残し，stderrで非推奨を案内する．新briefの形式を旧生成器に合わせる必要はない．

### Scope

スライドの新規作成・追加・編集・レビューのスキル，レイアウト参照，ひな形，CLIの案内，README，AGENTS.md，サンプルデッキに適用する．既存の編集には`slide-edit`を追加する．briefは要求や資料の前提が変わったときに更新し，ページを並べ替えるたびには更新しない．

レイアウトはページの役割と根拠を確認してから選ぶ．一律の3点箇条書き，等分カード，毎ページの要約枠，機械的な見た目の変化を要求しない．ユーザーの参考資料や明示的なデザイン指定を優先し，短文化で条件・単位・不確実性・出典を落とさない．

### Non-goals

新しい中間形式や同期機構，構成管理UI，テーマの刷新，自動の「AIらしさ」採点は導入しない．自然な説明や科学的妥当性をレイアウト検証の合格だけで保証しない．paperの制作フローは変更しない．

## Consequences

### Positive

- 描画による発見や手作業の変更を，別の計画書へ戻さず原稿に反映できる
- 実際の素材と前後のページを見ながら，必要な量と構成を選べる
- briefの形式を満たすためだけの記述や，毎段階の確認待ちを省ける

### Negative

- 旧outline生成器は新しい短いbriefを前提にしない．互換機能として保守対象に残る
- 一時的なコメントがMarpの発表者ノートに出る場合があるため，納品時に削除または意図したノートへ整理する
- 見せ方の自然さには実際の制作と人間の評価が必要であり，指示文の更新だけでは改善の程度を測れない

### Neutral

- 構成確認は`slide.md`の見出しと描画一覧を使う
- レビューは古い構成表との一致ではなく，目的・根拠・話の流れ・描画結果を点検する
- 既存outlineを一括削除・再生成しない．サンプルの旧構成表は履歴であることを明記して保持する

## Validation

- CLIの回帰テストで旧outline生成，上書き防止，stderrへの非推奨案内を確認した．scaffoldのテストではbriefとslideを作り，outlineを作らないことを確認した
- `quality:gate:strict`で単体271件，描画fixture 12件，Chromium／Firefoxを含むE2E 10件が成功した
- 変更した5スキルの共通frontmatterと本文を`skill-creator`の`quick_validate.py`で検査した．共通検査器が扱わない既存の`argument-hint`，`disable-model-invocation`，`user-invocable`は別途型と既存の呼出し方針を確認し，削除せず保持した．変更した参照ファイルも含め，相互リンクを確認した
- サンプル15枚を描画して検証し，エラー・警告ともに0件だった．変更ページと前後の画像を確認し，管理対象のPDFを再生成した
- 独立エージェントによる制作比較や人間による自然さの評価は本変更に含めない．上記は動作と記述の整合性の確認であり，生成品質の実証ではない

## Related Records

この判断を置き換え元とする既存ADRや，採用根拠となるXRはない．ユーザーが選択した制作フローを記録する．
