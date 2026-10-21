---
id: ISS-0052
title: "Select another preview port when the default is occupied"
type: issue
status: in-progress
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
  commands: []
---

# Select another preview port when the default is occupied

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/60

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

- [ ] `PORT`未指定で8080が空いていれば，従来どおり8080で起動する．
- [ ] 8080が使用中なら8081以降を試し，複数の候補ポートが使用中でも空いているポートで起動してスライドをHTTP 200で取得できる．
- [ ] 起動ログとブラウザで開くURLは実際に選択したポートを使い，指定ページへの遷移も維持する．
- [ ] `PORT`を明示した場合はその指定を尊重し，競合時には別ポートへ自動変更せず原因が分かるエラーで終了する．
- [ ] 空き確認後に別プロセスがポートを取得した場合も，実際の起動失敗を受けて次のポートを試す．探索回数または範囲に上限を設け，上限到達時はエラーで終了する．
- [ ] HTTPポート競合以外の起動失敗をポート探索で隠さず，既存のwatch notifier競合時の再試行と終了シグナルの転送が回帰しない．
- [ ] 単体テストで既定ポートの空き・競合，複数ポートの競合，明示した`PORT`の競合，起動時の競合と探索上限を検証する．
- [ ] READMEに自動選択と`PORT`明示時の挙動を記載する．

## 実装上の注意

対象は主に`scripts/marp-serve.js`，`src/preview-runtime.js`，`tests/unit/marp-serve.test.js`，`README.md`．

現在のMarp CLI 4.5.1は`Number.parseInt(process.env.PORT, 10) || 8080`でHTTPポートを選び，競合時に上記エラーで終了する．`scripts/marp-serve.js`の既存の再試行は，watch notifierの生の`EADDRINUSE`を対象としており，HTTPポート競合では別ポートへ切り替わらない．

HTTPポート競合を検出したら，次の候補ポートを子プロセスの`PORT`に設定して再起動する方法が考えられる．HTTPポート競合とwatch notifier競合は区別し，空きポートの事前確認だけには依存しない．

WindowsやWSLの設定変更，使用中プロセスの終了，bindアドレス指定の追加，`--overview`のポート選択方式の変更は対象外とする．
