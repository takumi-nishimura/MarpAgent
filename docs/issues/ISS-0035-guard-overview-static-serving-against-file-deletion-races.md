---
id: ISS-0035
title: "Guard overview static serving against file deletion races"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - scripts/preview-overview.js
tags:
  - preview
  - robustness
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm run marpx -- decks/example/slide.md --overview
---

# Guard overview static serving against file deletion races

## Problem

`scripts/preview-overview.js:244-257`の静的配信は`existsSync → statSync → createReadStream`を連続で呼ぶため，その合間にデッキHTMLやデッキファイルが消えると（`--overview`を回したままdeckディレクトリを削除・再スキャフォールドするなど），`statSync`またはストリームの未捕捉例外がHTTPリクエストハンドラ内で`uncaughtException`になる．

例外がハンドラ外へ抜けるため，watch/reloadも含めたoverviewサーバープロセス全体が落ち，後続の後片付け処理も実行されない．

## Goal

配信対象の消失・読み取り失敗が起きても，HTTPでは404系の応答を返し，overviewサーバーはそのセッション中も稼働し続ける．

## Acceptance criteria

- [ ] GET処理の途中で配信対象を削除するシナリオで，ハンドラが404を返し，サーバーが継続する．
- [ ] サーバー単位でも最後の防御がある（未捕捉例外をlogに残し，プロセスは終了しない）．
- [ ] 上記を`tests/unit/preview-overview.test.js`に追加してregressionとして固定する．

## Out of scope

配信ルート・パス解決ロジックの性能改良，watcher自体の改良．

## Approach

`statSync`周辺をtry/catchで括り，`createReadStream`に`error`リスナーを付けて404応答にまとめる．サーバー起動時に未捕捉例外を記録して続行する最終防御を追加する．

## Notes

2026-10-17: 精査レポートで検出（scripts/領域の精読）．
