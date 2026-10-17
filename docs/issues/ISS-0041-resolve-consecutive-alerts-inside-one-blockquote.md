---
id: ISS-0041
title: "Resolve consecutive alerts inside one blockquote"
type: issue
status: closed
resolution: abandoned
resolved: "2026-10-18"
date: "2026-10-17"
updated: "2026-10-18"
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
  commands:
    - node --test tests/unit/github-alerts.test.js
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

初回レポートはGitHub上では2つの独立したアラートとして描画されると主張していたが，2026-10-18のGitHub Markdown APIによる再検証で誤りと確認した．GitHubも本プラグインも1つのnoteの中に2つ目の平文`[!WARNING]`を残す．このサンプルでは表示規則の乖離はない．

## Goal

GitHubの表示と同じように，1つのblockquote内で連続するアラート区切りが複数のアラート`div`として正しく解決される．

## Acceptance criteria

当初の「1つのblockquoteを複数alertへ分割する」2条件は，GitHub互換の前提が誤りだったため撤回した．閉鎖時の確認結果は次のとおり．

- [x] GitHubの実出力を調べ，1つのblockquote内の後続markerをbodyとして保持する回帰テストを追加した．
- [x] `>`なしの空行で分けた2つ・3つのblockquoteが，各alertとして描画されることを確認した．
- [x] 既存の単一アラートと複数段落のテストが回帰なしで通る．

## Out of scope

アラートの種別追加，`[!X]+`系のGitHub拡張syntax全網羅，他plugin（Mermaid等）への波及．

## Approach

当初案のトークン分割は採用しない．現行pluginの動作を保ち，READMEへalert間の空行とblockquote内の空段落の違いを記載する．

## Notes

2026-10-17: 精査レポートで検出（scripts/領域の精読）；実レンダで再現済み．

2026-10-18: `gh api markdown -f mode=gfm -f 'text=…'`で上記サンプルをrenderすると，`markdown-alert-note`の1要素内に`<p>[!WARNING]<br> b</p>`が残った．`>`だけの行を真の空行へ変えたサンプルではnote/warningが分かれ，tipを加えた3個の場合も同様だった．[GitHub公式のalert例](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts)もblockquoteを空行で分離する．要求された変更は互換性の改善にならないため`abandoned`で閉じる．
