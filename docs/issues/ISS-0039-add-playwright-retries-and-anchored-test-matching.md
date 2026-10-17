---
id: ISS-0039
title: "Add Playwright retries and anchored test matching"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-18"
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
- `retries`が未設定で，CIの一時的なbrowser起動失敗を再試行する方針が明示されていない．ISS-0030のNode unitテストにはPlaywrightのretry設定は適用されない．
- Firefoxの`testMatch`がファイル名の前後へアンカーされておらず，名前に接頭辞・接尾辞を足した別specまで一致し得る．ChromiumとFirefoxで対象3specを実行すること自体は意図したbrowser互換性検証であり，削除すべき重複ではない．

## Goal

CIの再現性・速度・結果の読みやすさが保たれたまま，明示的に意図したプロジェクトだけがspecを実行する．

## Acceptance criteria

- [x] `forbidOnly: !!process.env.CI`（または等価な方針）が入り，ローカルでは`.only`が使える．
- [x] プロジェクトごとの`testMatch`が意図するspecだけに一致する（chromiumで全spec，firefox対象specのみ）．アンカーの正規表現やglobで記述する．
- [x] browser別の意図した実行を保持し，名前の部分一致による対象外spec実行を防ぐ（spec × プロジェクトの実行数表をNotesに残す）．
- [x] `retries`をローカル0，CIのみ1とし，一時的browser起動失敗への再試行であることをコメントする．

## Out of scope

各spec本体の書き換え（ISS-0038/`ISS-0030`で取り扱う），タイムアウト値の変更．

## Approach

各プロジェクトの`testMatch`にglob（例: `tests/e2e/**/*.spec.js`）を使い，Firefox-overviewは専用spec名に絞る．`forbidOnly`と`retries`はconfig内で明示的に指定する．

## Notes

2026-10-17: 精査レポートで検出（tests/CI領域の精読）．

2026-10-18：元の「browser間の重複ゼロ」はChromium全spec・Firefox対象specという別のACと矛盾するため，対象外の部分一致をゼロにする条件へ訂正した．Chromiumは`**/*.spec.js`，Firefoxはpath区切りから`.spec.js`末尾まで一致させる．POSIX/Windowsのpath，余計な接頭辞，`.bak`接尾辞をプローブで確認した．一時`test.only` specを実際に収集し，ローカルexit 0，CI exit 1を確認した．

`playwright test --list`での対象数（個々のtestの数，ISS-0036と共有テーマ修正の統合後）:

| spec | Chromium | Firefox |
| --- | ---: | ---: |
| cli-smoke | 6 | 0 |
| composition-utilities | 6 | 0 |
| core5-rendering | 28 | 0 |
| overview-canvas | 1 | 1 |
| overview-live-reload | 1 | 1 |
| scroll-slides | 13 | 13 |
| 合計 | 55 | 15 |

品質worktree単体の実行結果は62成功，統合版は69成功．FirefoxのCDP限定touch注入1件は既存の機能対象外skipであり，browser環境不足によるskipは0件．表は統合版で再収集した70件へ更新した．
