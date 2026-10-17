---
id: ISS-0032
title: "Handle spawn errors from marpx child processes"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-18"
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - bin/marpx.js
  - src/preview-runtime.js
  - scripts/marp-serve.js
tags:
  - cli
  - robustness
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - node --test tests/unit/process-failures.test.js tests/unit/preview-runtime.test.js tests/unit/theme-process.test.js
    - node -e "const{spawn}=require('child_process');const c=spawn('npm_missing_bin',['x']);c.on('exit',(c2,s)=>console.log('exit',c2,s));c.on('error',e=>console.log('error',e.code));c.on('close',c2=>console.log('close',c2))"
---

# Handle spawn errors from marpx child processes

## Problem

子プロセスspawn自体の失敗（ENOENT等）で`'error'`イベントが未処理の場所があり，ハングまたは生スタック落ちになる．Node v25での実測では，spawn失敗時は`'error'`（ENOENT）と`'close'(code -2)`のみが届き，`'exit'`は発火しない．

- `bin/marpx.js` `runMarp`（`--export/--preview/--pdf/--pptx/--html/--images/--screenshot` 系）と`runScript`（serve/overview/theme等）: `'exit'`ハンドラはあるが`'error'`リスナーがない．spawn失敗で (1) `Unhandled 'error' event` で生スタッククラッシュ，(2) `runMarp`ではタイマー発火後に`child.kill()`しても`'exit'`が来らず，出口に到達できずループし続ける（無期限ハング）．
- `src/preview-runtime.js:16-33` `openBrowser()`: `xdg-open`の無い最小構成Linuxで，serve/overviewがレンダリング成功の後に異常終了する（実測）．
- `scripts/marp-serve.js:99-106`: respawnした子にも`'error'`ハンドラがない（marp binの存在チェックは`scripts/doctor.js:56-58`のみで，serve起動側には効かない）．
- テーマビルドの非watch経路`bin/marpx.js`のtailwind子も同様に`'error'`処理とシグナル転送がない．

発生条件: `node_modules/.bin/marp`リンク欠落（README:27-28は`.bin`の不整備を自認），`MARP_AGENT_MARP_BIN`の誤設定，xdg-open不在のコンテナ等．

## Goal

spawn失敗が発生したとき，無音ハングも生スタックもなく，原因を示すメッセージと非ゼロ終了で速やかに終わる．serve/overviewはブラウザオープン失敗で全体が落ちない．

## Acceptance criteria

- [x] `MARP_AGENT_MARP_BIN`を存在しないパスにしてexport系を実行すると，解決先パスを名指したメッセージでexit 1になる（ハングしない）．
- [x] `runScript`経由のモード（serve/overview等）でENOENTが再現した際に，exit 1とメッセージで終わる．
- [x] `xdg-open`不在環境で`--overview`/serveがURLを出して稼働し続け，ブラウザ起動失敗がプロセス全体を落とさない（`MARP_AGENT_NO_OPEN`等の代替手段を文書化する）．
- [x] spawnエラーを注入するテストが通ること，上記をregressionとして固定する．
- [x] テーマビルドのtailwind子プロセスにも同じ`'error'`処理が入る．

## Out of scope

依存の自動再インストール，`doctor`の修復機能拡張，marp-cli内部のエラー文言．

## Approach

共通の`'error'`ハンドラ（診断メッセージ＋exit 1）を用意し，`getMarpBin()`解決後に存在チェックしてからspawnする．`openBrowser`は既存のブラウザ検出の方針に合わせ，実行コマンド不在時は警告して続行する．

## Notes

2026-10-18統合確認：Marp bin resolverを必要なモードで読み込むようにし，themeコマンドへ描画依存が混入しないようにした．compiler不在・signal転送を含む既存の隔離テスト6件の失敗を確認してから修正し，CLI関連24件が成功した．

2026-10-17: 精査レポートで検出．Node 25.6.0でのイベント列（`error: ENOENT`, `close: -2`, `'exit'`不発）を実機で確認済み．

2026-10-18: exportとserveの不存在バイナリ，`runScript`のspawn error注入，browser openerのerrorイベントを回帰テスト化した．exportは変換監視共通関数へ移し，spawn失敗時にtimerとsignal listenerを解除する．serveはrespawnごとに出力を保持し，`close`後にretryを判断する．opener失敗はURLと手動起動案内を警告し，親サーバーを終了しない．tailwindはwatch/build両方のspawn errorとsignal終了を検証した．READMEに`MARP_AGENT_NO_OPEN=1`を追記した．
