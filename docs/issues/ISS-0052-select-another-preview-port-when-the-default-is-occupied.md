---
id: ISS-0052
title: "Select another preview port when the default is occupied"
type: issue
status: closed
resolution: completed
resolved: "2026-10-21"
date: "2026-10-21"
updated: "2026-10-21"
authors:
  - codex-main-leader
scope:
  - preview
tags:
  - bug
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - node --test tests/unit/marp-serve.test.js tests/unit/preview-runtime.test.js tests/unit/preview-cli.test.js tests/unit/preview-binding.test.js tests/unit/marp-pagination.test.js tests/unit/slide-map.test.js tests/unit/preview-overview.test.js tests/unit/overview-preview.test.js
    - node /tmp/marpagent-parallel-20261021/issue-60-http-check.cjs
    - node_modules/.bin/prettier --check --tab-width 2 scripts/marp-serve.js src/preview-runtime.js tests/unit/marp-serve.test.js
    - git diff --check
    - uv run .github/records.py validate
---

# Select another preview port when the default is occupied

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/60

## 現在の説明

**変更前の問題**：他のプレビューやWSL側の転送設定が8080番を使っていると，通常のmarpx起動が失敗し，毎回別のPORTを手で指定する必要があった．

**実装したこと**：PORT未指定のときだけ8080〜8089を順に試すようにした．事前確認後に競合が発生しても，実際の起動エラーを見て次へ進み，起動ログとブラウザURLには選ばれたポートを使う．

**使い方・確認先**：従来どおり`npm run marpx -- <slide.md>`で使える．固定したい場合はPORT=8083などを明示する．明示したポートが競合した場合は，別ポートへ変更せずエラーで停止する．

**確認したこと**：既定の空き・単一と複数の競合・事前確認後の競合・探索上限・明示PORTを試験し，選ばれたURLからHTTP 200でスライドを取得した．notifierの再試行と終了signalの転送を保持し，最終gateも成功した．

**残る条件・対象外**：10候補がすべて使われていれば理由を示して終了する．ポート競合以外のエラーを再試行で隠さず，OSのポート転送や他プロセスの設定は変更しない．

実装とローカルレビューを完了し，PR #62の統合対象として受け入れた．状態はclosed／completedとする．GitHub IssueはPRのmerge時に閉じる．以下のcheckpointや起票時仕様は，その時点の履歴として読む．

## Execution update 2026-10-21

本人がIssueごとのCodex sol maxサブリーダー，Herdr worktreeによる並行開発，Devin・無料OpenCodeの活用を指示した．本ISSを作業の正本とし，以下は起票時に取り込んだGitHub仕様である．本文中の未起票・未実装・過去の権限境界は元の記録時点を表す．
D2を積極的に採用する最新方針を反映し，#61は採用を進める実装対象とする．個々のCLI・公開変数・外部参照仕様の選択は実装根拠と検証を添える．
この記録の作成自体は機能の完了を意味しない．mainへの直接書込・push・merge・GitHubコメント送信は各サブリーダーの担当外とする．

## Coordination

Main coordination branch: coord/issues-53-61-20261021．
GitHub IssueとISSの対応: #53 = ISS-0045，#54 = ISS-0046，#55 = ISS-0047，#56 = ISS-0048，#57 = ISS-0049，#58 = ISS-0050，#59 = ISS-0051，#60 = ISS-0052，#61 = ISS-0053．
#56の診断と#57の比較案は先行可能だが，CSS契約は#55と整合させる．#59は#58の参照解決部分だけを先行依存とし，検索UIの完了待ちにしない．#61は独立着手する．

## Problem

`marpx <slide.md>`は，既定のHTTPポート8080が使用中だと起動できない．使用中の場合は空いているポートを自動選択し，毎回`PORT=8081`等を指定せずに起動できるようにしたい．

2026-10-19にWSLの`mirrored`モードで再現した．Linux側の`ss`では8080の待ち受けが見つからない一方，Windows側のIP Helperが`portproxy`の設定により8080を使用していた．必要なポート転送設定を維持すると，通常起動は次のエラーと終了コード3で失敗する．

```text
[ ERROR ] Listen port 8080 is already used in the other process. Try again after
          closing the relevant process, or specify another port number through
          PORT env.
```

同じ環境で`PORT=8081`を指定すると起動し，スライドをHTTP 200で取得できることを確認済み．確認には一時スライドと`MARP_AGENT_NO_OPEN=1`を使い，確認用サーバーは停止済み．Windowsのポート転送設定は変更していない．

## Goal

`PORT`未指定の通常起動では8080を優先し，使用中なら8081以降の空いているポートで起動する．起動ログとブラウザで開くURLには，実際に選択したポートを使う．

## Acceptance criteria

- [x] `PORT`未指定で8080が空いていれば，従来どおり8080で起動する．
- [x] 8080が使用中なら8081以降を試し，複数の候補ポートが使用中でも空いているポートで起動してスライドをHTTP 200で取得できる．
- [x] 起動ログとブラウザで開くURLは実際に選択したポートを使い，指定ページへの遷移も維持する．
- [x] `PORT`を明示した場合はその指定を尊重し，競合時には別ポートへ自動変更せず原因が分かるエラーで終了する．
- [x] 空き確認後に別プロセスがポートを取得した場合も，実際の起動失敗を受けて次のポートを試す．探索回数または範囲に上限を設け，上限到達時はエラーで終了する．
- [x] HTTPポート競合以外の起動失敗をポート探索で隠さず，既存のwatch notifier競合時の再試行と終了シグナルの転送が回帰しない．
- [x] 単体テストで既定ポートの空き・競合，複数ポートの競合，明示した`PORT`の競合，起動時の競合と探索上限を検証する．
- [x] READMEに自動選択と`PORT`明示時の挙動を記載する．

## 実装上の注意

対象は主に`scripts/marp-serve.js`，`src/preview-runtime.js`，`tests/unit/marp-serve.test.js`，`README.md`．

現在のMarp CLI 4.5.1は`Number.parseInt(process.env.PORT, 10) || 8080`でHTTPポートを選び，競合時に上記エラーで終了する．`scripts/marp-serve.js`の既存の再試行は，watch notifierの生の`EADDRINUSE`を対象としており，HTTPポート競合では別ポートへ切り替わらない．

HTTPポート競合を検出したら，次の候補ポートを子プロセスの`PORT`に設定して再起動する方法が考えられる．HTTPポート競合とwatch notifier競合は区別し，空きポートの事前確認だけには依存しない．

WindowsやWSLの設定変更，使用中プロセスの終了，bindアドレス指定の追加，`--overview`のポート選択方式の変更は対象外とする．

## Implementation and verification 2026-10-21

- `PORT`が環境に存在しない場合だけ，8080〜8089の10候補を順に試す．事前の空き確認は行わず，Marp子プロセスが実際のHTTP bind失敗で返す診断と試行中のポート番号が一致した場合だけ候補を進める．ANSI装飾と診断の折り返しに対応した．
- 明示`PORT`は空文字・不正値も含めて子へそのまま渡し，HTTP競合の元の診断と終了コードを維持する．notifierの5回の再試行予算と250 msの遅延はHTTP探索から独立させ，HTTP候補の変更で予算をリセットしない．混合診断では暗黙PORTのHTTP候補変更を優先する．
- 指定モデル`fusion-gpt-6-1-sol-xhigh-sidekick-swe-2-high`をDevinの`accept-edits`モードで限定実装に利用した．`--sandbox`はbubblewrap不在で初回起動できず，無制限承認モードは使っていない．leadが差分を確認し，両シグナルとfallback後のページ指定，出力完了待ちのテストを補強した．担当helperは終了済み．
- 実装前の実CLI再現では，8080が空いている場合のHTTP 200と，8080占有時に終了コード3で停止するREDを確認した．実装後は専用loopback `127.0.0.60`で，空き8080，8080・8081の実bind競合から8082への切替とHTTP 200，ブラウザ起動コマンドへ渡す実URL，非表示・ページ番号スキップを含む表示ページ1→`#2`，明示`PORT=8080`と`PORT=`の終了コード3，10候補の探索打切りを確認した．SIGINT→130とSIGTERM→143，終了後のソケット解放も実CLIで確認した．一時デッキと待受プロセスは削除・終了済み．
- 上記8ファイルの関連Nodeテストは72件成功，失敗・skipとも0件．起動後の実bind競合を再現するstub，複数競合，ANSI・折り返し，探索上限，明示値，別ポート・非ポートの失敗，notifierの競合・混合診断・予算，fallback後のURL/hash，両シグナルの現子プロセスへの転送とnotifier再試行待機中の終了を含む．
- JavaScriptは既存の2-space書式を保ってPrettier確認し，`git diff --check`を実行した．Python変更はない．全体のstrict gateとmainへの統合確認はmain leaderが担当し，このISSは`in-review`で保持する．他issueへの依存・共有インターフェイス変更はない．

## Local acceptance for PR #62 integration 2026-10-21

本人の統合作業指示を受け，既存の担当・mainのローカルレビュー結果と，修正版fflateを含むコード`0dc6a34`の全体検証を確認した．unit504件，strict fixture18件，browser119件成功＋既存Firefox対象外1件skip，固定D2実CLI7件とD2入りZIP2件が成功した．条件とログhashは[最終統合検証](../evidence/integration-2026-10-21/premerge-validation.json)を参照する．本ISSの受入条件は完了として閉じる．#55の一般的な指定数削減はこの完了判定に含めず，ISS-0047と親ISS-0045で継続する．
