---
id: ADR-0015
title: "Separate cover and body styling and derive contents from deck structure"
type: decision
status: accepted
date: "2026-11-20"
authors:
  - codex
scope:
  - slide authoring and theme scaffolding
tags:
  - slide-design
depends_on: []
supersedes: []
issues: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Separate cover and body styling and derive contents from deck structure

## Context and Problem Statement

既存のテーマ生成は研究室テーマの設計文書を複製し，共通CSSが表紙の配置まで決めていた．発表者は表紙と本文を別々に調整し，原稿で繰り返すヘッダーから目次を生成したい．

## Decision Drivers

* 通常の文章はMarkdownで書ける．図とキャプションの対応，可変列数，入れ子の段組みを表現できる．
* 著者が章名や目次項目を重複して管理する手間を減らす．

## Considered Options

用途別のひな型は開始点が明確だが，用途の分類とデザインを結び付ける．共通の描画基盤に表紙と本文のテーマを載せる構成では，一つの発表内でも表現を選べる．

## Decision Outcome

### Chosen Option

Marpを使い，共通の段組み・図配置とテーマの表紙・本文スタイルを分離する．聴衆や目的に応じた判断例はエージェント向け文書で扱う．目次はデッキ内に明示的な章があれば章から，それ以外は有効なヘッダーの連続区間から生成する．ページ見出しはそのページの内容に専念できる．

### Scope

今後の原稿とテーマ作成を対象とする．図を含む行は配置された領域の残り高さを利用し，キャプションを表示する高さを先に確保する．

### Non-goals

過去の原稿の移行と用途別profileの追加は対象外とする．

## Consequences

### Positive

表紙の変更を本文から独立させられる．章を明示する場合，章内でヘッダーを変えても目次は安定する．

### Negative

最初の章指定を追加すると，デッキ全体の目次の情報源が変わる．

### Neutral

標準Markdownで表しにくい図説明や段組みにはHTMLを使う．

## Validation

表紙だけを変えた場合の本文，残り高さに並ぶ図のキャプション，章とヘッダーの継承をそれぞれ描画して確認する．

## Related Records

ADR-0014で定めた共有素材の参照形式を引き続き使用する．
