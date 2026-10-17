---
id: ISS-0036
title: "Normalize BOM handling across frontmatter-sensitive modules"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
date: "2026-10-17"
updated: "2026-10-18"
authors:
  - opencode-glm
scope:
  - src/canvas-size.js
  - src/markdown-source.js
  - src/markdown-input.js
  - src/media-assets.js
  - marp.config.js
tags:
  - parser
  - validator
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - node --test tests/unit/canvas-size.test.js tests/unit/markdown-source.test.js
    - npm run test:e2e -- tests/e2e/core5-rendering.spec.js --project=chromium
---

# Normalize BOM handling across frontmatter-sensitive modules

## Problem

検査側とエンジン側のBOM扱いが割れている．`src/canvas-size.js:6,18`と`src/markdown-source.js:72-75`はBOM付きfrontmatterを「あり」と判定できるが，エンジン（markdown-it-front-matter；`node_modules/markdown-it-front-matter/index.js:24`が先頭バイト`---`を厳格判定）は「なし」とする．BOM付きデッキでは次が起きる:

- `size:`メタデータがエンジンに無視され，実レンダは既定の1280×720になる．一方`canvas-size`はBOMを取り除いた上で抽出に成功し，別の寸法（たとえば4:3の1024×768）を返す．
- この不整合のため，visual計測の前提寸法（floors/safeMarginの計算）が実レンダと異なる寸法に基づき，誤検知（false positive/negative）の原因になる．

## Goal

BOMが付いていても，検査側とエンジン側のfrontmatter判定，`size:`解決，計測寸法が一致する．

## Acceptance criteria

- [x] BOM付きかつ`size: 4:3`のデッキで，validatorが実測canvasを1024×768として扱う（実レンダと一致）．
- [x] BOM有無で判定が変わるケースをunit testに追加してregressionとして固定する．
- [x] BOMの扱い（エンジン制約と正規化方針）をREADMEまたはdocsに記す．

## Out of scope

frontmatterの文法拡張，他のエンコーディング問題（Shift_JIS等）の救済．

## Approach

読み込み直後にBOMを正規化する共通パスを作り，`canvas-size`/`markdown-source`/validatorはそこを通った文字列を使う．エンジンへ渡す文字列からはBOMを外す．

実装では`src/markdown-input.js`に先頭BOMの正規化とfrontmatter境界の判定を集約した．`marp.config.js`はMarkdown coreの`normalize`より前にBOMを除去するため，通常のrenderと`buildSlideMap`の直接parseの両方へ適用される．source検査は元ソースを別に保持し，BOMやCRLFを含む画像位置を元ファイルのoffsetで返す．

## Notes

2026-10-17: 精査レポートで検出．markdown-it-front-matterの先頭バイト判定を確認済み．

2026-10-18: Core 5.0.2の実renderで，BOMなしは1024×768，BOMありは1280×720となることを再現した．修正後は両者のviewBoxとslide-mapが一致する．CLIのHTML生成からブラウザ内validatorまで通す回帰テストで，canvasが1024×768，安全余白が21px，本文の最小サイズが9.6pxとなることを確認した．READMEに正規化方針を追記した．ISS-0044の項目6も同じ境界判定に統一し，長い閉じ区切り・末尾空白・3スペース以内の閉じインデントをsource検査とcanvas抽出で扱う．
