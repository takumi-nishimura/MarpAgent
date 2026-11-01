---
id: ISS-0056
title: "Unify slide authoring skills and clarify review scope"
type: issue
status: in-review
date: "2026-11-01"
updated: "2026-11-01"
authors:
  - codex
scope:
  - authoring-skills
  - documentation
tags:
  - refactor
  - skills
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Unify slide authoring skills and clarify review scope

## Problem

[GitHub Issue #66](https://github.com/takumi-nishimura/MarpAgent/issues/66)を追跡する．mainのdd9fb176971577d9c166eb7cf05795eeaec537a6では，slide-new／slide-edit／slide-addが同じslide.mdの編集と描画・検証を扱い，相互参照と共通の注意事項を重複して持つ．slide-reviewは点検と修正の両方を扱うが，単に点検を依頼したときの非編集動作と，執筆中の自己点検との分担を明確にする必要がある．

## Goal

新規作成・既存ページの改稿・追加は一つの執筆入口から進められ，点検だけの依頼では原稿を変更しない．執筆中の描画・自己点検・修正は同じタスクで完結する．現行の資料保全と検証上の制約を保ち，利用者向け説明と参照先を揃える．

## Acceptance criteria

- [x] 新規作成・改稿・追加をslide-authorで扱い，既存原稿を再scaffoldしない．
- [x] slide-reviewの既定は非編集とし，明示された修正は同じタスクでslide-authorの手順を使う．
- [x] 出典・留保・人の編集，媒体の所有・相対ファイルsymlink規約，描画とvalidatorの限界を維持する．
- [x] brief.mdの役割を目的・制約・資料の記録とし，通常の編集でoutline.mdの作成・同期を要求しない．
- [x] description・引数・自動選択の扱いと本文を揃え，旧名の移行方法を説明する．
- [x] AGENTS.md・README・紹介用デッキの参照とPDFを更新し，現行ガイドのローカルリンクを解決できる．過去記録の名称は保持する．
- [x] 新規作成・局所改稿・ページ追加・点検のみの4依頼の手順と変更範囲を確認し，メタデータ・参照・記録を検証する．

## Out of scope

テーマ・レンダラ・CLIの変更，共通レイアウトの改善，紹介資料全体の構成・文章の改稿，個人サイトのブログ更新，独立レビューエージェントの必須化．

## Approach

slide-authorへ3つの執筆スキルを統合し，状態と依頼範囲から新規・改稿・追加を選ぶ．既存の配置・部品・検証リファレンスを共有し，条件ごとの分岐を一つの入口内で完結させる．slide-reviewは点検の入口として残し，修正が依頼された場合だけ執筆手順へ進む．

.agents/skills/slide-author/SKILL.mdを執筆手順の正本とし，slide-new／slide-edit／slide-addの各SKILL.mdを置き換える．.agents/skills/slide-review/SKILL.md，AGENTS.md，README.mdのAI Agent Usage，decks/example/slide.mdのスキル説明と派生PDFを揃える．

旧3名は互換aliasを残さず廃止し，READMEの移行表で保存済みprompt・クライアント側参照の更新を案内する．Git履歴と過去の観測記録はそのまま保持する．執筆入口は既存の改稿・追加と同じ通常の自動選択を許可し，旧slide-newだけのdisable-model-invocationは統合入口へ引き継がない．新規作成だけを別の明示呼出し入口へ戻さないための選択であり，対象の確認と既存原稿の保護は本文へ明記する．paper-newなど他のスキルの選択設定は変更しない．

## Notes

実装開始時の最新mainとopen PRを確認した．基点はdd9fb176971577d9c166eb7cf05795eeaec537a6（BudouX修正のPR #69統合後）であり，open PRはなかった．作例・テーマの既存ローカル変更は別の作業コピーへ保持し，このPRへ移していない．

記録はuv run .github/records.py new issueで採番した．現行CLIに状態変更用subcommandはないため，frontmatterで状態を更新し，同CLIのvalidateで検証する．

## Validation

macOS arm64，Node 25.6.0，TMPDIR=/private/tmp，基点のlockfileに対するnpm ciで確認した．これは手順に沿ったlead自身の確認とCLI操作であり，独立したagent評価や各clientの自動選択を実測した結果ではない．

| Request | Route and scope | Check |
| --- | --- | --- |
| 新規デッキを作る | slide-authorの新規分岐で対象を確認してscaffold | brief.mdとslide.mdを作成し，outline.mdは作成されない．既存の同じ対象への再scaffoldは失敗し，原稿・素材のhashは不変 |
| 既存の1枚を改稿する | 同じ入口でslide.mdの対象ページと隣接ページを読む | 3枚のfixtureの中央ページだけを改稿し，前後ページ，brief，素材参照は不変 |
| 結びの前へ1枚追加する | 同じ入口で挿入箇所と新しい材料を扱う | 3枚から4枚へ増え，既存3枚の原稿を保持 |
| 変更せず点検する | slide-reviewでautofixなしのstrict検証と読み直し | 描画検証はmeasuredで成功し，原稿・brief・素材のhashは検証前後で不変 |

8スキルのYAMLを解析し，nameとディレクトリ，description，引数hintと呼出し設定の型を確認した．共有参照を含む44件のローカルMarkdownリンクはすべて解決した．旧名の残存箇所は移行案内と過去の観測記録であり，廃止されたスキルへの現行リンクはない．

ホストのskill-creator quick_validateはargument-hintを未知keyとして拒否した．基点のslide-edit／slide-reviewも同じ理由で失敗する．この既存形式を検証器のために削除せず，core fieldだけへ投影した8件はすべて成功した．生のfrontmatterをquick_validateが全面的に受理した結果とは扱わない．

記録検証は78件成功，npm run test:ciは56件成功，body-class-contract／theme-cssの関連単体試験は30件成功した．git diff --checkも成功した．全unit・全browser E2E・D2／portable ZIPを含むci:fullは再実行していない．

紹介用デッキ15枚をstrictで描画し，measured，errors 0，warnings 0となった．PDFを再生成して15ページを抽出し，新しい2つのスキル名を確認した．同じ描画環境で基点の原稿と変更後をPNG比較すると，スキル説明の物理13ページだけが変わり，他14枚はbyte単位で同一だった．変更ページを変更前後とも原寸で目視した．ワークフロー図や，別作業コピーにある紹介用作例の再構成は含まない．
