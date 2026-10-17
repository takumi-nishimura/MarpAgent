---
id: ISS-0043
title: "Expose a bind address option for serve and overview"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
  - takumi-nishimura
scope:
  - scripts/preview-overview.js
  - scripts/marp-serve.js
  - bin/marpx.js
  - src/preview-runtime.js
  - README.md
tags:
  - preview
  - feature
  - cli
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm run marpx -- decks/example/slide.md --overview
    - npm run marpx -- decks/example/slide.md
---

# Expose a bind address option for serve and overview

## Problem

プレビュー系の待ち受けアドレスがloopback `127.0.0.1`に固定されており，同一LAN上の他マシンからアクセスできない:

- `--overview`: `scripts/preview-overview.js:319`が`server.listen(0, "127.0.0.1")`でハードコードされ，表示URLも`http://127.0.0.1:<port>`（`:327`）である．
- serve（既定モード）: `scripts/marp-serve.js:73-76`がmarp-cliに`--server`のみを渡し，待ち受けホストを指定しないためmarp-cli既定（localhost）になる．ブラウザオープン用のURL検出（`:90-94`付近）も`http://localhost:<port>`専用の正規表現である．

自宅ラボ等でLAN内の他デバイス（タブレット，別マシン）からプレビューを見たい需要に対し，現状はSSHポートフォワード等の外部手段しかない．

## Goal

待ち受けアドレスを選択でき（既定はloopbackのまま），指定時には他マシンから到達可能なURLを提示する．

## Acceptance criteria

- [ ] 既定の挙動が変わらない（loopback）．既存の単体/e2eが回帰しない．
- [ ] `MARP_AGENT_BIND_ADDRESS`（またはCLIオプション）を設定すると，`--overview`がそのアドレスでlistenし，`os.networkInterfaces()`から得た実IPのURLを表示する．LAN内の別マシンのブラウザでアクセスできる．
- [ ] serveモードでも同じenvが効く（marp-cliのaddressオプションを渡す，または同等の実現）．ブラウザオープン判定はloopback URL/実IP URLの両方に対応する．
- [ ] non-loopback bind時には，`allowLocalFiles: true`（`marp.config.js:88`）でリポジトリのファイル群がLANに晒されることをREADMEに明記し，起動時に警告を1回出す．

## Out of scope

LANプレビューへの認証・HTTPS，モバイル最適化（タッチ操作向けUI），marp-cli側の実装変更．

## Approach

- `--overview`: env/CLIからhostを取り，`server.listen(0, host)`に渡す．表示URLはhostがloopbackのとき従来通り，それ以外は第一の非loopbackインターフェースアドレスを使う．
- serve: marp-cliの`--address`（サーバーモードの待ち受け指定，存在確認の上）を`marpArgs`に追加する．出力行のURL検出正規表現を`http://(localhost|127.0.0.1|<bind host>):<port>`に緩める．
- marp-cliのバージョンによる差分は実機で確認し，不可能ならREADMEに代替手順（SSHポートフォワード等）を残す．watch notifierのport扱いと合わせて`scripts/marp-serve.js`側で吸収する．

## Notes

2026-10-17: ユーザ（takumi-nishimura）からの要望を受理し，本issueとして登録した．bind対象は`preview-overview.js`唯一のlisten（`:319`）であり，serveはmarp-cli配下である点を明記した．non-loopback bindはリポジトリ内のファイルをLANに公開するため，用途を実験用プレビューにとどめる注意をREADMEに記すこととし，既定はloopbackのままとする．
