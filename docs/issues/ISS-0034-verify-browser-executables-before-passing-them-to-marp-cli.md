---
id: ISS-0034
title: "Verify browser executables before passing them to marp-cli"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-18"
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
  commands:
    - node --test tests/unit/marp-browser.test.js tests/unit/process-failures.test.js
---

# Verify browser executables before passing them to marp-cli

## Problem

`src/marp-browser.js:115-138`は，レジストリ検出の`executablePath()`やPlaywrightの`chromium.executablePath()`の返値を存在確認せずにそのまま`--browser-path`へ渡している．

- ブラウザが未ダウンロード，またはPlaywrightのブラウザ差し替えで実体が消えた環境では，存在しない絶対パスがmarp-cliに渡り，原因を示せない失敗になる．
- `marpx`は`--browser-path`をCLIオプションとして受理しない．初回精査の明示指定に関する記述は，内部で生成してMarpへ渡す引数との混同だった．

## Goal

`--browser-path`の候補はすべて実在確認の上で採用され，実在しない場合は次の候補へフォールバックするか，試した候補一覧を示す診断メッセージで明確に失敗する．

## Acceptance criteria

- [x] どの候補も実在しない状態でブラウザを必要とするexportを実行すると，「試したパス一覧＋ブラウザインストールの案内」をstderrに出して一意に終了する．
- [x] レジストリの1候補が実在しない環境でも，次の候補（Playwrightのインストール済みパス等）へ自動でフォールバックする．
- [x] `--browser-path`への渡す値が常に`fs.existsSync`を通ることを単体テストが固定する．

## Out of scope

マシンへのブラウザ自動インストール（`doctor`の拡張），ブラウザ選好の設定ファイル化．

## Approach

Playwrightのheadless shellと通常Chromiumを候補列として取得し，存在確認に通った最初の候補を採用する．Marpへ渡す直前にも確認し，不在時は検査したパスとインストール案内をエラーに含める．HTML exportはブラウザを起動しないためブラウザ検出を省略する．doctorはPlaywrightの起動そのものを診断する別目的のため，その検査は維持する．

## Notes

2026-10-17: 精査レポートで検出（src/補助モジュール精読）．

2026-10-18: 消えたshellから通常Chromiumへのfallbackと，不在pathをMarpへ渡さずインストール案内を返すunit testを追加した．既存のシステムChrome/Edge選択とHTML exportを含めて通過した．

2026-10-18: [PR #50の初回CI](https://github.com/takumi-nishimura/MarpAgent/actions/runs/39054126986)では，プリインストールされたChromeがPATH上のテスト用候補より優先され，変換が成功したため，失敗終了を期待する回帰テストだけが失敗した．ブラウザ起動境界で選択された実行ファイルを記録し，実ブラウザの代わりに短命な子プロセスを起動する検査へ変更した．選択結果が実在し，2つの存在しない環境変数指定のいずれでもないことを確認するため，インストール済みブラウザの優先順位に依存しない．`node --test tests/unit/marp-browser.test.js`の15件が成功した．
