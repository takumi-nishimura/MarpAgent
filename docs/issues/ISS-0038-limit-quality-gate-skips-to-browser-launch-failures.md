---
id: ISS-0038
title: "Limit quality gate skips to browser launch failures"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - tests/e2e/cli-smoke.spec.js
  - tests/unit/helpers/visual-support.js
  - package.json
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

非strictの`quality:gate`では，e2eに環境fail時のskip機構があるため，起因を問わず緑化し得る:

- `tests/e2e/cli-smoke.spec.js`の`canSkipForChromiumFailure`（`:22-24`定義，`:123-216`各所使用）は`Playwright|Chromium|no-sandbox|visual-check-failed`を含む広い正規表現で，Chromium起動失敗以外の実バグやvisual-check自体の失敗も合致し，`test.skip`＝pass扱いになる．
- 単体側の`tests/unit/helpers/visual-support.js:7-9`はlaunch失敗をキャッシュしてvisual系テスト約9箇所を`t.skip`し，helper自体の壊れは常に緑のまま通る．
- 逆にpdf出力のみskipガードが存在しない（`tests/e2e/cli-smoke.spec.js:134-139`付近；pptx/images/screenshotにはある）ので，環境差分で他と非対称に赤くなる．
- ブラウザが整っていないローカルでは，単体テストのうち3件が`t.skip`ではなくfailになる（helperと挙動が不対称）．

strict CI（`quality:gate:strict`，`--strict-visual`）ではfail-fastに固定されるため，この緑化問題は主にローカルの非strict実行の品質問題である．

## Goal

非strictゲートは「環境が無いために測定不能」な場合のみskipし，実装不備やassertion失敗は必ず赤くなる．

## Acceptance criteria

- [ ] `canSkipForChromiumFailure`が「chromeの起動・実行に必要な環境不在」だけに合致するよう狭まるか，理由別に明示される．
- [ ] `visual-support.js`のlaunch失敗キャッシュが効いても，最低1件のテストがfailになる（skipの総緑化を防ぐ不変条件）．
- [ ] pdf出力にも他フォーマットと同じskipガードが入る．
- [ ] ブラウザなし環境での`npm test`がfailのままかskipに変えるか方針を決め，どちらであっても文書に明記する．

## Out of scope

strictゲート自体の変更，visual計測精度の変更（`ISS-0031`/`ISS-0033`参照）．

## Approach

skip判定を共通ヘルパーに集約し，環境不足（launch失敗）の場合のみskipする．visual-check自体の失敗はskipしない．unitのhelperには「全件skipになったらfailする」assertionを入れる．

## Notes

2026-10-17: 精査レポートで検出（tests/CI領域の精読）．
