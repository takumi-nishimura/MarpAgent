---
id: ISS-0043
title: "Expose a bind address option for serve and overview"
type: issue
status: closed
resolution: completed
resolved: "2026-10-18"
updated: "2026-10-18"
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
    - node --test tests/unit/preview-binding.test.js tests/unit/marp-serve.test.js
    - npm run marpx -- decks/example/slide.md --overview
    - npm run marpx -- decks/example/slide.md
---

# Expose a bind address option for serve and overview

## Problem

プレビュー系の待ち受けアドレスを選択する機能がなく，overviewとserveの実際の既定値も一致していない:

- `--overview`: `scripts/preview-overview.js:319`が`server.listen(0, "127.0.0.1")`でハードコードされ，表示URLも`http://127.0.0.1:<port>`（`:327`）である．
- serve（既定モード）: 同梱Marp CLI 4.5.1は`server.listen(port)`で全interfaceへbindし，表示URLだけが`localhost`である．初回精査の「既定localhost」は誤りだった．CLIに`--address`もなく，`HOST`環境変数も参照しない．ブラウザオープン用のURL検出は`http://localhost:<port>`専用の正規表現である．

自宅ラボ等でLAN内の他デバイス（タブレット，別マシン）からプレビューを見たい需要に対し，現状はSSHポートフォワード等の外部手段しかない．

## Goal

待ち受けアドレスを選択でき（既定はloopbackのまま），指定時には他マシンから到達可能なURLを提示する．

## Acceptance criteria

- [x] overviewとserveの既定をloopbackに統一する．既存の単体/e2eが回帰しない．
- [x] `MARP_AGENT_BIND_ADDRESS`を設定すると，`--overview`がそのアドレスでlistenし，wildcard時には`os.networkInterfaces()`から得た実IPのURLを表示する．
- [x] serveモードでも同じenvが効く．ブラウザオープン判定はloopback URL/実IP URLの両方に対応する．
- [x] non-loopback bind時には，`allowLocalFiles: true`（`marp.config.js:88`）でリポジトリのファイル群がLANに晒されることをREADMEに明記し，起動時に警告を1回出す．

## Out of scope

LANプレビューへの認証・HTTPS，モバイル最適化（タッチ操作向けUI），marp-cli側の実装変更．

## Approach

- `src/preview-binding.js`でbind値検証，実IP URL生成，公開時警告を共通化する．overviewはこのhostでlistenする．
- Marp CLI子プロセスに限って`src/marp-bind-preload.js`を読み込み，host未指定のTCP listenにbind値を補う．HTTPとwatch notifierの両方が対象となる．Marp CLI本体や親プロセスのlistenは変更しない．
- 指定された実IPはそのままURLへ使い，wildcardだけが非loopback interface一覧へ展開される．IPv6 URLは角括弧で囲む．

## Notes

2026-10-17: ユーザ（takumi-nishimura）からの要望を受理し，本issueとして登録した．bind対象は`preview-overview.js`唯一のlisten（`:319`）であり，serveはmarp-cli配下である点を明記した．non-loopback bindはリポジトリ内のファイルをLANに公開するため，用途を実験用プレビューにとどめる注意をREADMEに記すこととし，既定はloopbackのままとする．

2026-10-18: Marp CLIの`--help`と同梱実装を確認し，`--address`未対応と実際の全interface bindを確認した．実機テストでは修正前serveがLAN IPで200を返すREDを確認し，修正後は既定で接続拒否，`0.0.0.0`指定時はserve/overview両方でLAN IPのURLから200を返すGREENとなった．警告1回も検証した．同一ホストの実LAN IP宛てHTTP接続で検証しており，別デバイスの物理的到達性やLAN側firewall設定は未検証．
