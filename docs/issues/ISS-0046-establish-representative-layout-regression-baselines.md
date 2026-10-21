---
id: ISS-0046
title: "Establish representative layout regression baselines"
type: issue
status: in-progress
date: "2026-10-21"
updated: "2026-10-21"
authors:
  - codex-main-leader
scope:
  - fixtures
tags:
  - test
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests:
    - fixtures/layout-baselines/cases.json
  results: []
  commands: []
---

# Establish representative layout regression baselines

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/54

## Execution update 2026-10-21

本人がIssueごとのCodex sol maxサブリーダー，Herdr worktreeによる並行開発，Devin・無料OpenCodeの活用を指示した．本ISSを作業の正本とし，以下は起票時に取り込んだGitHub仕様である．本文中の未起票・未実装・過去の権限境界は元の記録時点を表す．
D2を積極的に採用する最新方針を反映し，#61は採用を進める実装対象とする．個々のCLI・公開変数・外部参照仕様の選択は実装根拠と検証を添える．
この記録の作成自体は機能の完了を意味しない．mainへの直接書込・push・merge・GitHubコメント送信は各サブリーダーの担当外とする．

## Coordination

Main coordination branch: coord/issues-53-61-20261021．
GitHub IssueとISSの対応: #53 = ISS-0045，#54 = ISS-0046，#55 = ISS-0047，#56 = ISS-0048，#57 = ISS-0049，#58 = ISS-0050，#59 = ISS-0051，#60 = ISS-0052，#61 = ISS-0053．
#56の診断と#57の比較案は先行可能だが，CSS契約は#55と整合させる．#59は#58の参照解決部分だけを先行依存とし，検索UIの完了待ちにしない．#61は独立着手する．

## Implementation checkpoint 2026-10-21

#55／#57 向けの入口を `fixtures/layout-baselines/slide.md` と `fixtures/layout-baselines/cases.json` に固定した．14ページ・7組の stable case ID は同ディレクトリの README に記載した．本文，図のみ，不均等8:4列，図の縦積み，結果と脚注，表，数式と Mermaid を含み，境界版は一条件だけを変える．既存の overflow／text-overlap fixture を意図した失敗の対照に使う．

`template/layouts.md` の先頭ページ本文を再利用し，その内容が変わった場合に比較元も確認する unit test を追加した．ID・素材参照・一条件変更の検査3件は成功した．この段階では描画結果の検証は未完了であり，改善済みデザインとは扱わない．共有 CSS は変更していない．

初期環境には日本語フォントがなく，`fc-match 'Noto Sans JP'` は DejaVu Sans を返した．そのままの可読性評価は行わず，テーマが参照する Google Fonts の Noto Sans JP 400／700 を今回専用の `/tmp` に取得し，描画条件を固定して続行する．元原稿の commit 固定リンクは manifest に保存したが，my-decks の個別ページとの対応は未確認である．

OpenCode `opencode/glm-5.3-flash-free` への読み取り専用 inventory 委譲は，自動承認レビューにより外部モデルへの具体的な送信承認が不足するとして起動前に拒否された．補助による変更・評価はなく，担当 lead が調査と視覚解釈・テストを行う．新しい XR が必要なら番号の割当は main に委ねる．

親計画：#53．このIssueは評価用原稿・既存テスト・制作スキルの整備であり，構図の自動選択器や新しい評価サービスを導入する作業ではない．

## Problem

現在の制作スキルは実素材の早期描画と見直しを指示しているが，改善前後で「標準ケースに個別CSSがどれだけ必要か」「例外をどの指定で直せるか」を比較する共通例が不足している．
my-decksには図中心，不均等列，図の縦積み，結果図と説明などがあり，共通部品だけで書けるページと，寸法・整列の個別指定が多いページが混在する．
個別CSSの存在自体は欠陥ではなく，作成者が本人かエージェントかも原稿だけでは断定できない．

## Goal

同じ内容・構図を保ち，標準ケースに必要な調整を減らしたか，例外を直しやすくしたかを検証できるようにする．
描画不良の合否と，図内の読みやすさ・強調・内容保持のレビューを分ける．

## 変更範囲の案

- 既存template/fixturesとPlaywrightを再利用し，実原稿の構造を汎用的な日本語と自作の小さな素材へ置き換える．研究内容や写真のコピーはしない．
- 代表ケース：見出しと本文，図とキャプションだけのページ，図と説明の不均等二列，二つの図の縦積み，結果図と補足・脚注，表または数式・Mermaidを含むページ．実際の必要性を見て既存fixtureと統合し，固定のページ構成を制作に強制しない．
- 各ケースに標準版と境界版を設ける．境界版では日本語見出しが一行増える，キャプションが二行になる，縦横比が異なるなど，一度に一条件だけ変える．意図した過密例は警告・失敗を確認するために残す．
- 変更前後の原稿，描画画像，必要な独自ルール・inline指定・ラッパー・パラメータの差と，残した理由を記録する．測定方法を明記し，単純なコード行数の少なさを最適化しない．
- slide-edit/slide-reviewへ，「標準動作→既存の少数パラメータ→ページ固有CSS」の順で調整し，影響ページと隣接ページを再確認する手順を反映する．

## Acceptance criteria

- [ ] 上記の代表的な内容関係を覆う実行可能なケースと，対応する元原稿のパーマリンクがある．素材はMarpAgentへ掲載可能なものだけを使う．
- [ ] 現状の原稿・描画・個別指定を基準として保存し，標準版の未達項目と例外版の調整手順を記載する．座標合わせ等を不要にする目標の達成は#55/#56側で確認し，本Issueの完了条件には後続実装の完了を含めない．既存の意図的な演出は評価から分離する．
- [ ] 文字・図の欠落，強調の消失，情報の削除，見出しと根拠の不一致を，原稿短縮による改善として数えない．
- [ ] 図内ラベル・凡例の可読性を画像で確認し，既存validatorが測定できない範囲を明記する．「エラー0＝デザイン良好」としない．
- [ ] 人またはエージェントによる視覚指摘を，ページ・対象領域・理由・修正候補の形で残せる．未確認事項や好みの指摘は機械的な不合格へ昇格しない．
- [ ] 対象テーマ・ブラウザ・フォントの取得条件を記録し，フォントfallbackや未実行検査を成功扱いしない．
- [ ] 既存の画像出力・overview・validator・テスト経路を利用し，CIや評価基盤を無断で増やさない．共通CSS変更時は既存paper/scroll等の回帰も確認する．

## 対象外

全ページの候補生成，定型カード数の強制，AIによる単一の美観スコア，人の理解度向上の実証，Pele導入は対象外とする．
このIssueで見本を用意することと，後続Issueで改善効果を確認することは別である．

## 実装の入口と依存関係

最初に基準例を作成し，配置・Tailwind・labの各Issueが同じケースを参照する．
各Issueの変更後にはここで決めた方式で比較結果を残すが，本Issueを全実装が終わるまで不必要に開いたままにはしない．
主な入口は `template/layouts.md`，`fixtures/`，`tests/e2e/composition-utilities.spec.js`，`.agents/skills/slide-edit/SKILL.md`，`.agents/skills/slide-review/SKILL.md`．

## 根拠

- [既存配置契約](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/docs/theme-contract.md)，[ADR-0003](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/docs/decisions/ADR-0003-compose-slide-templates-with-shared-tailwind-utilities.md)．
- my-decks `c7d1b4523375c35b42d12f7b84533fd0aa407bdb` の [6月22日原稿](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/06-22-lab-seminar/slide.md)，[7月13日原稿](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/07-13-lab-seminar-fuzzy-dpt/slide.md)，[8月24日原稿](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/08-24-toshiba-research-introduction/slide.md)．
- 調査は静的な利用確認であり，この比較は未実施．本仕様は#53の本人方針を具体化した未実装案である．

## 正本記録

repo内ISSは未起票．実装開始時に既存記録を照合し，必要なら `uv run .github/records.py new issue` と `validate` で起票・検証し，本Issueへ正本リンクを追記する．手動のISS番号付与，既存ADRの採用・置換は行わない．
