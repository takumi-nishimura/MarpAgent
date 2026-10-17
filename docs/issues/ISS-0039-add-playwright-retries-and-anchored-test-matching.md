---
id: ISS-0039
title: "Add Playwright retries and anchored test matching"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - playwright.config.js
tags:
  - testing
  - e2e
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npx playwright test
---

# Add Playwright retries and anchored test matching

## Problem

`playwright.config.js`に実運用向けの締めが欠けている:

- `forbidOnly`が未設定で，`test.only`混入がCIまで反映され得る．
- `retries`が未設定のため，既知のフレーク（ISS-0030系のテスト安定性問題など）でも1発で赤になり得る．
- `testMatch`が非アンカーの正規表現で，chromium既定プロジェクトと`firefox-overview`プロジェクトの重複実行が起きる（複数specが両プロジェクトで走る）ため，実行時間が増え，結果の読み取りも紛らわしい．

## Goal

CIの再現性・速度・結果の読みやすさが保たれたまま，明示的に意図したプロジェクトだけがspecを実行する．

## Acceptance criteria

- [ ] `forbidOnly: !!process.env.CI`（または等価な方針）が入り，ローカルでは`.only`が使える．
- [ ] プロジェクトごとの`testMatch`が意図するspecだけに一致する（chromiumで全spec，firefox対象specのみ）．アンカーの正規表現やglobで記述する．
- [ ] chromium/Firefox両プロジェクトでの重複実行がゼロになる（spec × プロジェクトの実行数表をNotesに残す）．
- [ ] `retries`の方針（既定0か，CIのみ1か）を決めてconfigに書き，根拠をコメントする．

## Out of scope

各spec本体の書き換え（ISS-0038/`ISS-0030`で取り扱う），タイムアウト値の変更．

## Approach

各プロジェクトの`testMatch`にglob（例: `tests/e2e/**/*.spec.js`）を使い，Firefox-overviewは専用spec名に絞る．`forbidOnly`と`retries`はconfig内で明示的に指定する．

## Notes

2026-10-17: 精査レポートで検出（tests/CI領域の精読）．
