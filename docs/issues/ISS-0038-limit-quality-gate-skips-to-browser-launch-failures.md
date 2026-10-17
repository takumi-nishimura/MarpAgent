---
id: ISS-0038
title: "Limit quality gate skips to browser launch failures"
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
  - tests/unit/helpers/visual-support.js
  - tests/helpers/browser-environment.js
  - tests/unit/browser-environment.test.js
  - README.md
tags:
  - testing
  - ci
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm run quality:gate
    - npm run quality:gate:strict
---

# Limit quality gate skips to browser launch failures

## Problem

非strictのE2E smokeと単体helperに，実装失敗を環境skipとして扱う経路がある:

- `tests/e2e/cli-smoke.spec.js`の`canSkipForChromiumFailure`（`:22-24`定義，`:123-216`各所使用）は`Playwright|Chromium|no-sandbox|visual-check-failed`を含む広い正規表現で，Chromium起動失敗以外の実バグやvisual-check自体の失敗も合致し，`test.skip`＝pass扱いになる．
- 単体側の`tests/unit/helpers/visual-support.js`はrequire・launch・close全体の例外を`false`としてキャッシュし，型エラー等も複数のvisualテストのskipへ変換する．
- 逆にpdf出力のみskipガードが存在しない（`tests/e2e/cli-smoke.spec.js:134-139`付近；pptx/images/screenshotにはある）ので，環境差分で他と非対称に赤くなる．
- ブラウザが整っていないローカルでは，単体テストのうち3件が`t.skip`ではなくfailになる（helperと挙動が不対称）．

strict E2Eはskipを許さないが，旧unit helperはstrict環境変数を参照しない．従ってhelperの実装例外まで非strict限定の問題とはいえない．既存のbrowserless unitには別のfailもあり，ゲート全体が必ず緑化するという主張も訂正する．

## Goal

非strictゲートは「環境が無いために測定不能」な場合のみskipし，実装不備やassertion失敗は必ず赤くなる．

## Acceptance criteria

- [x] `canSkipForChromiumFailure`が既知の起動前提不足だけに合致し，browser名や`visual-check-failed`だけではskipしない．
- [x] `visual-support.js`が環境不足をキャッシュしても，明示的な可用性テストがfailする．helper内の実装例外も再throwする．
- [x] pdf出力にも他フォーマットと同じskipガードが入る．
- [x] ブラウザなし環境での`npm test`はfailとする方針をREADMEへ明記する．

## Out of scope

strictゲート自体の変更，visual計測精度の変更（`ISS-0031`/`ISS-0033`参照）．

## Approach

skip判定を共通ヘルパーに集約し，環境不足（launch失敗）の場合のみskipする．visual-check自体の失敗はskipしない．unitのhelperには「全件skipになったらfailする」assertionを入れる．

## Notes

2026-10-17: 精査レポートで検出（tests/CI領域の精読）．

2026-10-18：共通classifierは実行ファイル不在，必要library不在，明示的sandbox起動拒否だけを認める．launch以外のclose失敗，型エラー，module不在，汎用Chromium/Playwright/visual-check文字列を環境skipから除いた．偽launchとcloseを使う回帰で旧helperの例外隠蔽を再現後，3件が成功した．`PLAYWRIGHT_BROWSERS_PATH`を存在しない場所へ向けた別unitプロセスでは，明示的可用性テストがexit 1となった．正常環境のunit313件，CLI smoke 6件，厳格ゲートも成功した．
