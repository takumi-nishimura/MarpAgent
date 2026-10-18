---
id: ISS-0035
title: "Guard overview static serving against file deletion races"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-18"
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
    - node --test tests/unit/preview-overview.test.js
    - npm run marpx -- decks/example/slide.md --overview
---

# Guard overview static serving against file deletion races

## Problem

`scripts/preview-overview.js:244-257`の静的配信は`existsSync → statSync → createReadStream`を連続で呼ぶため，その合間にデッキHTMLやデッキファイルが消えると（`--overview`を回したままdeckディレクトリを削除・再スキャフォールドするなど），`statSync`またはストリームの未捕捉例外がHTTPリクエストハンドラ内で`uncaughtException`になる．

例外がハンドラ外へ抜けるため，watch/reloadも含めたoverviewサーバープロセス全体が落ち，後続の後片付け処理も実行されない．

## Goal

配信対象の消失・読み取り失敗が起きても，HTTPでは404系の応答を返し，overviewサーバーはそのセッション中も稼働し続ける．

## Acceptance criteria

- [x] GET処理の途中で配信対象を削除するシナリオで，ハンドラが404を返し，サーバーが継続する．
- [x] request/stream境界で回復可能な読み取り失敗を処理し，HTTP parserのclient errorは400で閉じる．予期しないrequestエラーはlogに残す．
- [x] 上記を`tests/unit/preview-overview.test.js`に追加してregressionとして固定する．

## Out of scope

配信ルート・パス解決ロジックの性能改良，watcher自体の改良．

## Approach

HTTP request handlerをtry/catchで括り，`createReadStream`の`error`を処理する．200応答はファイルopen成功後に送信し，送信前の消失は404，送信後の失敗はその接続を閉じる．overview HTMLのreadFileSync失敗も同じ境界で処理する．process-globalな`uncaughtException`継続は，不明な状態で動作を続けるため採用しない．listen失敗は診断と後片付けの後に非ゼロ終了する．

## Notes

2026-10-17: 精査レポートで検出（scripts/領域の精読）．

2026-10-18: stat後・stream open前の静的ファイル削除，exists後・read前のoverview HTML削除を注入し，404と次のrequest成功をRED→GREENで確認した．元の「未捕捉例外なら何でも続行する」ACは安全なrequest/server境界の処理へ訂正した．
