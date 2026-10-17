---
id: ISS-0036
title: "Normalize BOM handling across frontmatter-sensitive modules"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - src/canvas-size.js
  - src/markdown-source.js
tags:
  - parser
  - validator
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Normalize BOM handling across frontmatter-sensitive modules

## Problem

検査側とエンジン側のBOM扱いが割れている．`src/canvas-size.js:6,18`と`src/markdown-source.js:72-75`はBOM付きfrontmatterを「あり」と判定できるが，エンジン（markdown-it-front-matter；`node_modules/markdown-it-front-matter/index.js:24`が先頭バイト`---`を厳格判定）は「なし」とする．BOM付きデッキでは次が起きる:

- `size:`メタデータがエンジンに無視され，実レンダは既定の1280×720になる．一方`canvas-size`はBOMを取り除いた上で抽出に成功し，別の寸法（たとえば4:3の1024×768）を返す．
- この不整合のため，visual計測の前提寸法（floors/safeMarginの計算）が実レンダと異なる寸法に基づき，誤検知（false positive/negative）の原因になる．

## Goal

BOMが付いていても，検査側とエンジン側のfrontmatter判定，`size:`解決，計測寸法が一致する．

## Acceptance criteria

- [ ] BOM付きかつ`size: 4:3`のデッキで，validatorが実測canvasを1024×768として扱う（実レンダと一致）．
- [ ] BOM有無で判定が変わるケースをunit testに追加してregressionとして固定する．
- [ ] BOMの扱い（エンジン制約と正規化方針）をREADMEまたはdocsに記す．

## Out of scope

frontmatterの文法拡張，他のエンコーディング問題（Shift_JIS等）の救済．

## Approach

読み込み直後にBOMを正規化する共通パスを作り，`canvas-size`/`markdown-source`/validatorはそこを通った文字列を使う．エンジンへ渡す文字列からはBOMを外す．

## Notes

2026-10-17: 精査レポートで検出．markdown-it-front-matterの先頭バイト判定を確認済み．
