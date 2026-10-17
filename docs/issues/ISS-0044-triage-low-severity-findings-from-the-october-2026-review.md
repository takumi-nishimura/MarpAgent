---
id: ISS-0044
title: "Triage low-severity findings from the October 2026 review"
type: issue
status: open
date: "2026-10-17"
authors:
  - opencode-glm
scope:
  - bin/marpx.js
  - scripts/
  - src/
  - themes/src/
  - tests/
tags:
  - cleanup
depends_on:
  - ISS-0032
  - ISS-0037
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Triage low-severity findings from the October 2026 review

## Problem

2026-10-17のリポジトリ全体精査で「低重要度（経過観察相当）」と評価した指摘が多数残った．個々は単独では低頻度・軽微だが未処理のままでは精査結果が失われるため，それぞれを「対応」か「意図的な放置（理由つき）」のどちらかに整理する必要がある．

対象（file:lineは精査時点）:

1. `bin/marpx.js`: `--strict`/`--format`がserve等モードで無警告無視される（`--hints`/`--autofix`はエラー化されているのに不整合）．
2. `scripts/presenter-cursor.js:25`: BroadcastChannel名が固定で，同一file:// origin上の複数デッキでカーソルが他デッキへ漏れる．
3. `scripts/marp-serve.js:97-105`: respawn時に旧子の未flush行が`outputTail`に混入し，過剰retry/重複タブ開きの原因になり得る（`ISS-0027`閉後の残置）．
4. `scripts/ci-validate-fixtures.js:94-105`: 子stdoutが1 MB超で`JSON.parse`が未捕捉クラッシュ（maxBuffer既定）．
5. `scripts/generate-design-tokens.js:59-67`，`scripts/lint-designs.js:44`: 失敗時に生スタック（終了コードは正しい）．
6. `src/markdown-source.js:72-75`: 閉じ`----`や末尾空白つき閉じ区切りでfrontmatter判定が漏れる．
7. `src/markdown-slides.js:12-46`: インデント付きコードフェンスもフェンス扱いし，`countTopLevelBullets`のヒューリスティックが歪む．
8. `src/slide-map.js:10-25,111`: `buildSlideMap`呼び出しごとに`createConfiguredMarp`を再構築（budouxモデルとconfig再計算；未計測）．
9. themes: コンパイル済み`--logos-*`の既定値`url(logos/logo_light.svg)`等が実在しない（`themes/src/_shared/_base.css:21-30`，`themes/lab.css:526-529`；`themes/logos/`不在）．上書きしない新規デッキはロゴが沈黙で消え，missing-asset検査はテーマ内部URLを見ない（リポ内デッキは全員frontmatterで上書き/`none`により回避済み）．
10. themes: `themes/src/lab.css:8`（muji/toshibaも同様）がGoogle Fontsをネットワーク`@import`し，オフライン環境ではfallbackフォントで計測される（clip/overlap/size検査の再現性が環境依存）．
11. themes: `section.github-light.invert`の組合せで，ライト背景にダークShikiトークンが適用され得る（`themes/src/_shared/_code.css:65-78`付近；colorschemesが後に読まれ優先するため）．
12. `src/preview-cli.js:9-32`: 「Deck not found」等の診断が入力順（ページ指定を先に書いた場合）で誤解を招く．
13. `tests/unit/preview-overview.test.js:55`: 固定`/tmp`直下を使用．
14. `scripts/run-node-tests.js:15-25`: symlink／ドットディレクトリ配下のテスト発見を静かにskipする．
15. `src/overview-preview.js:445-449`: reload後も500msポーリングが停止しない（微弱・無指向）．
16. `src/overview-preview.js:33-103`: 深い階層のURL断片をdepth 0相当に扱い，期待したページ位置に復元されない場合がある．
17. `src/marp.config.js:45-52`: 自己閉じ記法regex `[^>]*?` が属性値内の`>`を切り得る（markdown-itのescape済み出力では到達困難）．
18. `.github/records.py:960`付近: 日本語タイトルのslugが一律`record`になる（実害なし）．
19. prettier: 設定だけあり，どのgateにも入っておらず，33ファイルが非準拠のまま（`npx prettier --check .` 実測）．
20. CI: playwrightブラウザキャッシュなし（`.github/workflows/quality-gate.yml:24-28`）．
21. `decks/example/slide.pdf`（1.4 MB）がコミット済み生成物として残る．
22. browserless環境での`npm test`: 3件がfail（skipではなく；helperと不対称）→方針は`ISS-0038`のACに含む．

## Goal

上記全項目がtriageされる: 対応するものはcommitで解消し，放置するものは理由を添えて本リストで閉じる（または後続issueへ分割）．

## Acceptance criteria

- [ ] 各項目が完了時点で「対応済み（commit/参照）」か「放置（理由）」のどちらかで本issue上に印が付く．
- [ ] 全項目処理後にcheckboxが残らない（分割が必要な項目のみ後続issueへ移し，本issueで参照）．
- [ ] 対応を含む変更では`uv run .github/records.py validate`が通る．

## Out of scope

高・中重要度の指摘（`ISS-0031`〜`ISS-0042`），テスト安定性（`ISS-0030`），プレビューbind（`ISS-0043`）．

## Approach

関係の近い項目から小さく潰す（例: 4,5,17はscripts側のエラー処理をまとめて，9,10,11はthemesを1コミットで，13,14はテスト小掃除）．放置判断にはユーザ確認を要するもの（例: 19のprettier強制追加 vs 削除，20のCIキャッシュ導入）を先に決めておく．

## Notes

2026-10-17: 精査レポートの低重要度節をそのまま収録．2件（mermaid tmp残骸・spawn error処理）は`ISS-0037`/`ISS-0032`へ吸収したため，本リストでは参照のみとする．
