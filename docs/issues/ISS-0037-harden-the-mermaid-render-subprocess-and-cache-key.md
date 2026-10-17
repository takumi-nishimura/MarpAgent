---
id: ISS-0037
title: "Harden the Mermaid render subprocess and cache key"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - scripts/mermaid-plugin.js
tags:
  - mermaid
  - cache
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Harden the Mermaid render subprocess and cache key

## Problem

`scripts/mermaid-plugin.js`の図レンダが2点で弱い:

- `execFileSync`（`:152-156`付近）に`maxBuffer`未指定のため，レンダ結果SVGが既定の1 MiBを超えると`ENOBUFS`で落ち，正当な大きな図（大規模フローチャート等）が「diagram-render-error」扱いとなり，スライドにはソースコードがそのまま現れる．
- キャッシュキー（`:65-78`付近）は`code + render script + beautiful-mermaid + mathjax`のみで，ラベルのHTMLエンコードに使う`entities`のバージョンを含まないため，依存アップグレードでエンコード挙動が変わっても古いSVG cacheを再利用し続ける．

また，レンダサブプロセスのcrash時に`.svg.<pid>.tmp`の残骸がprune対象外で残る（`:130-148`付近）．

## Goal

大きい正当な図もレンダされ，キャッシュはエンコードに関わる依存変更で自動的に無効化される．crash残骸も掃除される．

## Acceptance criteria

- [ ] レンダ結果が1 MiB超のMermaid図が，正しい`svg`エンティティでスライドに挿入され，エラーにならない．
- [ ] キャッシュキーに依存バージョン（entities等）が入り，バージョンを差し替えるとcache missになるテストがある．
- [ ] crash時に作られた`.svg.<pid>.tmp`が次回起動または失敗時にpruneされる．

## Out of scope

Mermaid自体のconfig/テーマ，`--mermaid-*`系のCSS変数仕様．

## Approach

`maxBuffer: 32*1024*1024`を指定し，キャッシュキー構築に依存バージョン（entitiesを含む）を組み込む．tmp残骸のpruneをエラーパスにも置く．

## Notes

2026-10-17: 精査レポートで検出（scripts/領域の精読）．
