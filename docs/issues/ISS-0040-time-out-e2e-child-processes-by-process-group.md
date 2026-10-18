---
id: ISS-0040
title: "Time out e2e child processes by process group"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-18"
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - tests/e2e/cli-smoke.spec.js
  - tests/helpers/process-group.js
  - tests/unit/process-group.test.js
tags:
  - testing
  - cli
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - node --test tests/unit/process-group.test.js
    - npm run test:e2e -- tests/e2e/cli-smoke.spec.js --project chromium
---

# Time out e2e child processes by process group

## Problem

`tests/e2e/cli-smoke.spec.js:11-20`の`runMarpx`は`spawnSync`をタイムアウトなしで呼ぶ．export系テストがハングした場合（`ISS-0029`/`ISS-0033`の条件），Playwrightのワーカータイムアウトでテストだけが殺され，marpx → marp-cli → Chromiumが孤児プロセスとして残る．

overview系はすでに`detached`＋pgid管理・`listProcessGroupMembers`での回収を実装しているが，export系にはこれがない（管理が不統一）．

なお`listProcessGroupMembers`（`:59-67`付近）は`ps`が不在な環境で恒真の成功になる（assertionが空転する）ため，回収のテスト自体も弱い．

## Goal

e2eで起動する子プロセスにはタイムアウト上限と回収手段が明確で，ハングしても孤児を残さない．

## Acceptance criteria

- [x] export系の`runMarpx`にもタイムアウトと強制回収（プロセスグループkill）が入る．
- [x] 親子がSIGTERMを無視してハングするダミーbinで，同groupおよび別groupへdetachした子孫がタイムアウト後に残らないことをassertする．
- [x] `ps`不在環境では回収assertionが恒真成功にならず，環境診断をfailさせる．

## Out of scope

Playwright workerタイムアウト値そのものの調整，marp-cli内部のクリーンアップ挙動．

## Approach

overview系と同じプロセスグループ管理をexport系にも共有する（`detached`なspawn＋watchdogタイマーでプロセスグループをkill）．`ps`系ツールが不在の場合はassertionを空転させず，skip理由を出す．

## Notes

2026-10-17: 精査レポートで検出（tests/CI領域の精読）．

2026-10-18：`runMarpx`を非同期spawnへ置き換え，Playwrightの30秒より短い20秒を1呼び出しの上限とした．期限時点の子孫PIDを取得し，groupと子孫へSIGTERMを送り，1秒後に同じ集合へSIGKILLを送る．Marp/Chromiumが別groupへdetachしても，親の終了によるreparentingで回収対象を見失わない．期限後に子がexit 0しても結果は成功扱いにしない．overviewのgroup検査も同helperを利用し，`ps`のspawn失敗・非0終了は診断付き例外になる．実行不能なzombieは回収待ちのOS状態として残留実行判定から除く．

タイムアウト未実装と`ps`不在を空配列にする旧挙動は，2件の回帰で失敗した．group単独回収ではdetached子孫の負例が失敗することも確認した．補強後は親子ハング2条件，正常出力，期限後exit 0，`ps`不在の5件が成功し，最終helperを使うprocess/theme計12件とCLI smoke 6件も成功した．全E2Eは62成功＋既存Firefox機能対象外1skipである．Linux上で検証し，Windowsの`taskkill`経路は未実測である．
