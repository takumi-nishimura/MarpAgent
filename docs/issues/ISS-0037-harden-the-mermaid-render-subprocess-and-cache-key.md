---
id: ISS-0037
title: "Harden the Mermaid render subprocess and cache key"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
date: "2026-10-17"
updated: "2026-10-18"
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
  commands:
    - node --test tests/unit/mermaid-render.test.js
---

# Harden the Mermaid render subprocess and cache key

## Problem

`scripts/mermaid-plugin.js`の図レンダが2点で弱い:

- `execFileSync`（`:152-156`付近）に`maxBuffer`未指定のため，レンダ結果SVGが既定の1 MiBを超えると`ENOBUFS`で落ち，正当な大きな図（大規模フローチャート等）が「diagram-render-error」扱いとなり，スライドにはソースコードがそのまま現れる．
- キャッシュキー（`:65-78`付近）は`code + render script + beautiful-mermaid + mathjax`のみで，ラベルのHTMLエンコードに使う`entities`のバージョンを含まないため，依存アップグレードでエンコード挙動が変わっても古いSVG cacheを再利用し続ける．

また，キャッシュ書き込み側のプロセスがcrashすると`.svg.<pid>.tmp`の残骸がprune対象外で残る（`:130-148`付近）．レンダサブプロセス自身はtmpを書かず，SVGを標準出力へ返す．

## Goal

大きい正当な図もレンダされ，キャッシュはエンコードに関わる依存変更で自動的に無効化される．crash残骸も掃除される．

## Acceptance criteria

- [x] レンダ結果が1 MiB超のMermaid図が，正しい`svg`エンティティでスライドに挿入され，エラーにならない．
- [x] キャッシュキーに依存バージョン（entities等）が入り，バージョンを差し替えるとcache missになるテストがある．
- [x] crash時に作られた`.svg.<pid>.tmp`が次回起動または失敗時にpruneされる．

## Out of scope

Mermaid自体のconfig/テーマ，`--mermaid-*`系のCSS変数仕様．

## Approach

`maxBuffer: 32*1024*1024`を指定し，キャッシュキー構築に依存バージョン（entitiesを含む）を組み込む．tmp残骸のpruneをエラーパスにも置く．

## Notes

2026-10-17: 精査レポートで検出（scripts/領域の精読）．

2026-10-18: 1.2MBのラベルを持つ実Mermaid図で変更前の`ENOBUFS`を再現し，`maxBuffer`を32MiBに設定した後は完結したSVGが挿入されることを確認した．fingerprintへ`entities`を加え，旧versionのSVGが残っていても再renderされ，次回はcache hitとなる回帰テストを追加した．キャッシュ参照前にもpruneし，終了済みPIDのtmpだけを回収する．稼働中または確認不能なPIDのtmpには触れず，同時writerを保護する．write/rename失敗時は自身のtmpをfinallyで掃除する．キャッシュ非使用時と既存の失敗fallbackも維持した．出力上限32MiBと30秒timeoutは引き続き適用される．
