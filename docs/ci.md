# CI と完全受入れ

`Quality Gate` の自動実行は記録整合性とエンジンの smoke を担当する．自動チェックが成功しても，描画・export を含む完全受入れの成功を意味しない．採用判断と受入れの根拠は [ADR-0012](decisions/ADR-0012-separate-lightweight-ci-from-explicit-full-acceptance.md) に記録する．

## 実行範囲

| イベント／変更 | 記録検証 | npm 導入と smoke | 完全受入れ |
| --- | --- | --- | --- |
| PR／main push：`docs/**` と `decks/**` だけ | 全記録を検証 | 省略 | 手動で実行 |
| PR／main push：上記以外，または混在 | 全記録を検証 | `npm ci` → `npm run test:ci` | 手動で実行 |
| `workflow_dispatch`：変更パスによらず | 全記録を検証 | `npm ci`，smoke は full unit に含まれる | D2 → portable ZIP → strict gate |

記録検証は既存の `uv run .github/records.py validate` を無条件に実行する．重複 XR ID，frontmatter，必須セクション，記録間参照，lifecycle を含む全体を検証するため，変更した Markdown だけでは検出できない不整合も失敗になる．Node／エンジン／ブラウザを導入せずに実行できるが，uv と validator の Python 依存は必要である．依存解決や validator の失敗も job の失敗になり，成功として扱わない．

`test:ci` は runtime／mise 設定，Markdown／slide map／canvas，audit 比較ロジック，D2 診断，workflow の回帰テストを選んだ軽量入口である．ブラウザを起動せず，実際の dependency audit も実行しない．全 unit，fixture/example の実測，Chromium／Firefox E2E，実 D2，portable ZIP は完全受入れに残る．スライドの内容や見た目は smoke の対象外なので，変更した deck の描画確認も別途行う．

## 差分と失敗の扱い

パス判定には PR の `base.sha` と `head.sha`，push の `before` と `sha` を使う．checkout の合成 merge commit や最後の1 commitだけでは判定しない．shallow checkout に端点がなければ `git fetch --no-tags --depth=1 origin <SHA>` で取得する．

`git diff <base> <head>` の2つの tree を比較するため，PR の base が先へ進んだ場合は base 側だけのエンジン変更でも smoke を選ぶことがある．これは取りこぼしを避ける保守的な動作であり，merge-base の探索に履歴全体を取得しない．削除・rename でエンジンのパスが消えた場合も対象になる．同一 SHA はエンジン差分なしとなるが，記録検証は実行する．

base が空または全ゼロの初回 push はエンジンを選び，manual は常に完全受入れへ進む．非空の端点が取得できない場合や，`git diff` が通常の「差分あり」以外で失敗した場合は job を失敗させる．失敗を docs-only に読み替えない．通常実行は同じ PR／ref の古い実行を cancel し，manual は run ID ごとに独立して自動実行と互いに cancel しない．

## merge 前の完全受入れ

統合対象の revision を確定し，`Quality Gate` をその ref に対して手動実行する．workflow は既存の版と checksum を保持して Chromium／Firefox，D2 0.9.0，Noto Sans JP の weight 400 TTF を準備する．D2・portable ZIP・strict gate のすべてが成功した実行を確認する．

`workflow_dispatch` は default branch に workflow があることなどの条件があり，新規導入中の PR や権限制約によって利用できない場合がある．[GitHub の手動実行仕様](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch) を参照．その場合は merge 前に，レビュー対象の revision を持つ隔離 checkout／worktree で次の同等な入口を使う．手動実行を有効にするために先に merge する必要はない．

1. Node 25.6.0 と uv を用意し，`npm ci` と `npx playwright install --with-deps chromium firefox` を実行する．CI の uv は既存の 0.13.1 固定である．
2. [workflow の準備ステップ](../.github/workflows/quality-gate.yml)と同じ D2 0.9.0／font の checksum，fonttools 4.60.1／weight 400 を使う．既存資源を再利用するときも版と由来を確認する．Linux で準備ブロックをそのまま使う場合は，まず `export RUNNER_TEMP="$(mktemp -d)"` を設定し，ブロック全体を `bash -e -o pipefail` で実行して取得や checksum の失敗を無視しない．
3. 準備した実体とフォントを指定して全ゲートを実行する．

```sh
export MARP_AGENT_D2_PATH=/absolute/path/to/d2-v0.9.0/bin/d2
export MARP_AGENT_D2_FONT_PATH=/absolute/path/to/NotoSansJP-Regular.ttf
git rev-parse HEAD
git status --short
npm run ci:full
```

`ci:full` は記録検証 → `test:d2` → `test:zip:d2` → `quality:gate:strict` を順番に実行し，どれかの失敗で停止する．strict gate は全 unit → fixture/example 実測 → Chromium／Firefox E2E であり，ブラウザ不足による skip を成功扱いしない．既存の platform／機能条件による対象外 skip は，成功件数と分けて記録する．実 D2／portable ZIP も必要な実行資源の不足では skip しない．

共有ホストで同時作業する場合は，準備を含むブラウザ／D2 操作を共通ロックで直列化する．例えば `flock /tmp/marpagent-browser.lock npm run ci:full` とし，同じホストの作業者全員が同じロックパスを使う．Chromium sandbox が利用できない承認済みの Linux 環境では，workflow と同じ `CHROME_NO_SANDBOX=1` を必要に応じて指定する．

結果には revision，未コミット変更の有無，Node／uv／D2／font の条件，コマンド，終了コード，ログ，対象外 skip を残す．対象 revision に変更が加わったら影響する受入れを再実行する．ローカル成功で required checks や保護設定を緩和せず，GitHub のチェックが必要なら利用可能な経路でその結果も取得する．dependency audit は別ゲートなので，担当変更を統合した候補で `npm run audit:dependencies` も確認する．

## CI 自体の検証

```sh
uv run .github/records.py validate
npm run test:ci
actionlint .github/workflows/quality-gate.yml .github/workflows/dependency-audit.yml
git diff --check
```

smoke／unit 内の CI 回帰テストは Git と Bash，uv を使う．最初に記録 validator を実行して固定 Python 依存を解決し，記録 fixture ではその cache を offline で再利用する．テストは workflow の実際の Bash を一時 Git repository で動かし，docs／deck／engine／混在／workflow，複数 commit，同一 SHA，不足端点，削除・rename，失敗の伝播を調べる．YAML からイベント条件・全ゲートへの到達・concurrency も確認する．これは hosted runner での実行結果を代替しない．actionlint は GitHub の構文・式を確認する別のローカルツールであり，npm 依存には追加しない．

## downstream への反映

MarpAgent PR64 と my-decks PR6 は元の軽量 CI patch を共有している．この追加修正では workflow だけでなく，`package.json` の CI scripts，`tests/unit/ci-workflow.test.js`，運用手順も一緒に反映する必要がある．記録 validator と record directory のある downstream では，エンジン導入を省く変更でも全記録が検証される．既存の重複 ID はそこで失敗するため，統合対象の記録修正を先に揃える．共有 patch の正本は MarpAgent とし，先行適用と後の upstream merge を二重に扱わない．downstream の検証結果は当該 repository の revision で別途取得する．
