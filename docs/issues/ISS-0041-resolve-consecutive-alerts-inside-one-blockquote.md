---
id: ISS-0041
title: "Resolve consecutive alerts inside one blockquote"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - scripts/github-alerts-plugin.js
tags:
  - markdown
  - parser
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Resolve consecutive alerts inside one blockquote

## Problem

`scripts/github-alerts-plugin.js:34-79`の変換トリガは`blockquote_open`のみなので，1つのblockquote内にアラートが連続する記法を解決できない．

実測:

```markdown
> [!NOTE]
> a
>
> [!WARNING]
> b
```

GitHub上では2つの独立したアラートとして描画されるが，本プラグインを通すと`<div class="note"><p>a</p><p>[!WARNING]<br/>b</p></div>`となり，2つ目は装飾されない平文の`[!WARNING]`がスライドに現れる．GitHub表示との乖離は，validatorが装飾の有無を比較しないため，見過ごされやすい．

## Goal

GitHubの表示と同じように，1つのblockquote内で連続するアラート区切りが複数のアラート`div`として正しく解決される．

## Acceptance criteria

- [ ] 上記のサンプルMarkdownが，`note`と`warning`の2つの`div`要素としてレンダされる（fixtureテストで固定）．
- [ ] 1つのblockquote内に3つ以上のアラートが続く場合も同様に解決される．
- [ ] 既存の単一アラートのfixtureテストが回帰なしで通る．

## Out of scope

アラートの種別追加，`[!X]+`系のGitHub拡張syntax全網羅，他plugin（Mermaid等）への波及．

## Approach

トークンレベルの走査でblockquote内の段落区切りをまたいだ`[!TYPE]`開始行を検出し，その時点で`div`のclose/openを挿入する（`github-alerts-plugin.js`内のトークン→HTML変換の主体に手を入れる）．

## Notes

2026-10-17: 精査レポートで検出（scripts/領域の精読）；実レンダで再現済み．
