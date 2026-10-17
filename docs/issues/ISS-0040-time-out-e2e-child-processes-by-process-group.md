---
id: ISS-0040
title: "Time out e2e child processes by process group"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - tests/e2e/cli-smoke.spec.js
tags:
  - testing
  - cli
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Time out e2e child processes by process group

## Problem

`tests/e2e/cli-smoke.spec.js:11-20`の`runMarpx`は`spawnSync`をタイムアウトなしで呼ぶ．export系テストがハングした場合（`ISS-0029`/`ISS-0033`の条件），Playwrightのワーカータイムアウトでテストだけが殺され，marpx → marp-cli → Chromiumが孤児プロセスとして残る．

overview系はすでに`detached`＋pgid管理・`listProcessGroupMembers`での回収を実装しているが，export系にはこれがない（管理が不統一）．

なお`listProcessGroupMembers`（`:59-67`付近）は`ps`が不在な環境で恒真の成功になる（assertionが空転する）ため，回収のテスト自体も弱い．

## Goal

e2eで起動する子プロセスにはタイムアウト上限と回収手段が明確で，ハングしても孤児を残さない．

## Acceptance criteria

- [ ] export系の`runMarpx`にもタイムアウトと強制回収（プロセスグループkill）が入る．
- [ ] ハングを注入したシナリオ（例: 非常に遅いダミーbin）で，テスト後にmarp/Chromiumの孤児が残らないことをassertする．
- [ ] `ps`不在環境では回収assertionが恒真成功にならず，明示的にskipするか環境診断をfailさせる．

## Out of scope

Playwright workerタイムアウト値そのものの調整，marp-cli内部のクリーンアップ挙動．

## Approach

overview系と同じプロセスグループ管理をexport系にも共有する（`detached`なspawn＋watchdogタイマーでプロセスグループをkill）．`ps`系ツールが不在の場合はassertionを空転させず，skip理由を出す．

## Notes

2026-10-17: 精査レポートで検出（tests/CI領域の精読）．
