---
id: ISS-0034
title: "Verify browser executables before passing them to marp-cli"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - src/marp-browser.js
tags:
  - cli
  - browser
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Verify browser executables before passing them to marp-cli

## Problem

`src/marp-browser.js:115-138`は，レジストリ検出の`executablePath()`やPlaywrightの`chromium.executablePath()`の返値を存在確認せずにそのまま`--browser-path`へ渡している．

- ブラウザが未ダウンロード，またはPlaywrightのブラウザ差し替えで実体が消えた環境では，存在しない絶対パスがmarp-cliに渡り，原因を示せない失敗になる．
- ユーザが明示指定した`--browser-path`にも存在確認がなく，誤パスはmarp-cli側の不可解なエラー文言に隠れる．

## Goal

`--browser-path`の候補はすべて実在確認の上で採用され，実在しない場合は次の候補へフォールバックするか，試した候補一覧を示す診断メッセージで明確に失敗する．

## Acceptance criteria

- [ ] どの候補も実在しない状態でexportを実行すると，「試したパス一覧＋ブラウザインストールの案内」をstderrに出して一意に終了する．
- [ ] レジストリの1候補が実在しない環境でも，次の候補（Playwrightのインストール済みパス等）へ自動でフォールバックする．
- [ ] `--browser-path`への渡す値が常に`fs.existsSync`を通ることを単体テストが固定する．

## Out of scope

マシンへのブラウザ自動インストール（`doctor`の拡張），ブラウザ選好の設定ファイル化．

## Approach

候補確定箇所に`fs.existsSync`を挟む．全候補が不在の場合は集めた診断をstderrに出してexit 1とする；`doctor`のブラウザ検査と同じ解決ロジックを共有する．

## Notes

2026-10-17: 精査レポートで検出（src/補助モジュール精読）．
