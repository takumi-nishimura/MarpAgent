---
id: ADR-0001
title: "Make rendered measurement the authority for deck validation"
type: decision
status: accepted
date: "2026-09-23"
authors:
  - claude-code
scope:
  - src/deck-validator.js
  - src/visual-overflow.js
  - scripts/validate-deck.js
  - scripts/lint-deck.js
tags:
  - validator
  - design
depends_on: []
supersedes: []
issues:
  - ISS-0007
  - ISS-0008
  - ISS-0009
  - ISS-0019
  - ISS-0020
  - ISS-0021
  - ISS-0022
  - ISS-0023
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm run marpx -- <deck>/slide.md -v --format json
---

# Make rendered measurement the authority for deck validation

## Context and Problem Statement

`marpx -v` と `--lint` は2種類の判定を混在させている．1つはMarkdownソースの文字数，行数，箇条書き数，クラス名に固定閾値を当てる6つのヒューリスティック（`long-heading`，`dense-bullets`，`figure-text-density`，`comparison-overpacked`，`typography-drift`，`overflow-risk`）で，もう1つは描画後の`section`の`scrollHeight`と`clientHeight`の差（`visual-overflow`）である．全指摘が`warning`で，1件でもあれば終了コード1になる．

著者はこの判定を「厳しめで，デザイン的に納得がいかず，誤検出が多い」と評価している．XR-0001で著者の完成済みデッキ8本（70枚）を検証すると，ヒューリスティック指摘12件はすべて描画上は収まっているスライドへのものだった．`visual-overflow`6件のうち2件は，見えない末尾marginによる2〜3pxの差だった．一方で，本文と脚注の重なりは検出できていなかった．

ソース文字数は描画幅，テーマのフォントサイズ，キャンバスサイズ，段組みを反映しない．例えば日本語1文字をASCII 1文字と同じに数え，3段組みの箇条書きを1列の長いリストとして数える．閾値を調整しても，見えている結果と一致しない構造は変わらない．

## Decision Drivers

* 指摘は，スライド上で見える不具合（切れ，重なり，判読できない文字）に対応すること．
* 著者が完成とみなしたデッキで，失敗扱いの指摘がほぼ出ないこと．
* 終了コードが「直すべき不具合がある」ことを意味し，CIとエージェントがそのまま使えること．
* 指摘が，どの要素が何px外に出たかを示し，修正方法を判断できること．
* 描画できない環境での縮退が，結果から明示的に分かること．
* エージェントが数値基準を満たすために内容を削ったり，行を詰めたりする動機を作らないこと．

## Considered Options

### Option 1：ソースヒューリスティックの閾値と数え方を調整する

* 利点：実装が小さく，ブラウザなしで動く．
* 欠点：描画幅，テーマ，キャンバス，段組みを反映しない構造は残る．誤検出と見逃しのトレードオフを閾値で動かすだけになる．
* 根拠となるXR：XR-0001（誤検出の原因は閾値ではなく，ソース量が見た目を表さないことにある）．

### Option 2：描画計測を判定の正本にし，ヒューリスティックはヒントに降格する

* 利点：指摘が見える不具合に対応する．要素単位で原因を示せる．描画は既存の検証で行っているので，追加コストは小さい．
* 欠点：Chromiumが必要（現在も視覚検証に必要）．重なりと小さい文字は，描画計測の検査として新たに実装する必要がある．
* 根拠となるXR：XR-0001（見える切れを検出し，余白由来の差を除外できた）．

### Option 3：ヒューリスティックを廃止する

* 利点：判定体系が最も単純になる．
* 欠点：描画できない環境で何も信号がなくなる．執筆中のエージェントが参考にできる量の目安も失う．
* 根拠となるXR：なし．

## Decision Outcome

### Chosen Option

Option 2を採用する．重大度と終了コードを次のように定める．

| 重大度 | 対象 | 終了コード |
| --- | --- | --- |
| `error` | 描画計測で確認した見える不具合．第1段階は`content-clipped`（ISS-0019），続いて文字の重なり（ISS-0021）と判読限界未満の文字（ISS-0022） | 1 |
| `warning` | 描画計測で見つけたスライド端への接近（`edge-crowding`，ISS-0023）．描画できなかったときのヒューリスティック指摘（縮退時の唯一の信号） | 0（描画必須にする`--strict`/`MARP_AGENT_REQUIRE_VISUAL=1`では，描画できないこと自体が失敗） |
| `info` | 描画できたときのヒューリスティック指摘．既定では件数だけ示し，`--hints`で一覧を出す | 0 |

描画計測は次のとおりに行う．

* Marp CLIの`--template bare`で全スライドを表示状態で描画する．bespokeは非アクティブなスライドを非表示にするため，要素単位の計測とスクリーンショットに使えない（ISS-0020）．
* 見える内容は，テキストノードの行矩形と置換要素（`img`，`svg`，`video`，`canvas`，`iframe`，`object`）の矩形とする．`overflow`で切り取る祖先要素との共通部分をとり，意図的なトリミングを除外する．
* 見える矩形がキャンバスを許容幅より大きく超えたら`content-clipped`とし，要素，方向，超過量を報告する．許容幅はテキストで2px，メディアで2pxと要素サイズの2%の大きい方とする．`scrollHeight`は末尾marginを含むので使わない．
* 切れていない本文がスライド端の安全余白（720px高で20px，テーマのページ番号と同じ内側位置）に入ったら`edge-crowding`の`warning`とする．対象はテキストの下端・左右と，メディアの下端である．メディアの左右は透明な余白を含む枠で測られるため対象外とし，絶対配置の要素（脚注など）とheader／footerも意図的な配置として除外する．上端は見出し帯があるため対象外とする．
* 全出力（text，JSON，SARIF，report）に，視覚検証の状態（`measured`/`skipped`と理由）を載せる（ISS-0008）．

### Scope

`marpx -v`，`marpx --lint`，`--report-dir`の成果物，`scripts/ci-validate-fixtures.js`，`marp-validator` skillの説明に適用する．slideとpaperの両方が対象である．

### Non-goals

* 余白の均衡，配色，視線誘導などの美的判断．これは`slide-review`とスクリーンショットの目視で扱う．
* ヒューリスティックの閾値の再調整．ヒントとして残し，失敗扱いにしない．

## Consequences

### Positive

* 完成済みデッキで失敗扱いの指摘がほぼ出なくなる（XR-0001の再実行では，失敗扱いは5デッキ18件から2デッキ3件に減り，3件とも見える切れに対応していた）．
* 終了コード1が「スライド上で何かが切れている」ことを意味する．
* 指摘に要素と超過量が含まれるので，修正方法を判断しやすい．

### Negative

* 描画できない環境では`warning`しか出ず，既定では終了コード0になる．描画を必須にするには`--strict`を使う．
* ソース量に基づく密度の警告が既定では見えなくなるので，情報過多は目視レビューに任せることになる．
* 重なりと小さい文字は第1段階では検出しない（ISS-0021，ISS-0022）．

### Neutral

* ルールID`visual-overflow`は`content-clipped`に置き換わる．
* 画面に出る`Findings:`の数は`error`と`warning`だけを数え，ヒントは`Hints:`として別に数える．

## Validation

* XR-0001の対象デッキと`fixtures/`で，想定どおりの指摘が出ることを確認する．
* `tests/unit/validate-deck.test.js`と`tests/unit/visual-overflow.test.js`で，重大度，終了コード，縮退の表示，祖先要素による切り取りの除外を検証する．
* `scripts/ci-validate-fixtures.js`を，fixtureごとの期待ルールと終了コードで検証する形にする．

## Related Records

* XR-0001がこの判断の根拠である（`informs`）．
* ISS-0009はこの方針の親イシューで，ISS-0019，ISS-0021，ISS-0022，ISS-0023に分割して実装する．
* 2026-09-24に著者が方針を承認し，スライド端への接近を警告として扱うことを追加で決めた（ISS-0023）．
