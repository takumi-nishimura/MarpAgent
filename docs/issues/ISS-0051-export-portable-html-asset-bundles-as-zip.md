---
id: ISS-0051
title: "Export portable HTML asset bundles as ZIP"
type: issue
status: in-review
date: "2026-10-21"
updated: "2026-10-21"
authors:
  - codex-main-leader
scope:
  - exports
tags:
  - feature
depends_on: []
supersedes: []
artifacts:
  revisions:
    - 5cd7293
    - ea34382
    - b7fa592
    - 47d06ec
    - 3f91136
    - dc3f3cf
    - 00c2e2a
    - 49c9ce7
    - c14fac2
    - 34f8d9f
  manifests: []
  results:
    - /tmp/marpagent-parallel-20261021/issue59-d2-artifacts
  commands:
    - node --test --test-isolation=none --test-reporter=spec tests/unit/bundle-references.test.js tests/unit/portable-bundle.test.js tests/unit/portable-export.test.js tests/unit/portable-cli.test.js tests/unit/cli-args.test.js tests/unit/media-assets.test.js tests/unit/hide-slides.test.js tests/unit/media-reference-graph.test.js
    - flock /tmp/marpagent-parallel-20261021/browser-tests.lock env MARP_AGENT_STRICT_E2E=1 npx playwright test tests/e2e/portable-bundle.spec.js tests/e2e/cli-smoke.spec.js --project=chromium --workers=1 --grep 'relocated bundle|Mermaid font dependencies|export smoke'
    - flock /tmp/marpagent-parallel-20261021/browser-tests.lock env MARP_AGENT_STRICT_E2E=1 npx playwright test tests/e2e/portable-bundle.spec.js --project=chromium --workers=1
    - uv run .github/records.py validate
    - node --test --test-isolation=none --test-reporter=spec tests/unit/bundle-references.test.js tests/unit/portable-bundle.test.js tests/unit/portable-export.test.js tests/unit/portable-cli.test.js tests/unit/cli-args.test.js tests/unit/media-assets.test.js tests/unit/hide-slides.test.js tests/unit/media-reference-graph.test.js tests/unit/d2-diagnostics.test.js tests/unit/d2-svg.test.js tests/unit/d2-render.test.js tests/unit/d2-plugin.test.js tests/unit/d2-process.test.js tests/unit/conversion-runtime.test.js
    - flock /tmp/marpagent-parallel-20261021/browser-tests.lock env MARP_AGENT_D2_PATH=/tmp/marpagent-d2-0.9.0/d2-v0.9.0/bin/d2 MARP_AGENT_D2_FONT_PATH=/tmp/marpagent-d2-NotoSansJP-Regular.ttf PLAYWRIGHT_BROWSERS_PATH=/tmp/marpagent-i61-browsers CHROME_NO_SANDBOX=1 MARP_AGENT_ZIP_D2_ARTIFACT_DIR=/tmp/marpagent-parallel-20261021/issue59-d2-artifacts npm run test:zip:d2
    - flock /tmp/marpagent-parallel-20261021/browser-tests.lock env MARP_AGENT_STRICT_E2E=1 PLAYWRIGHT_BROWSERS_PATH=/tmp/marpagent-i61-browsers CHROME_NO_SANDBOX=1 npx playwright test tests/e2e/portable-bundle.spec.js tests/e2e/cli-smoke.spec.js --project=chromium --workers=1 --grep 'relocated bundle|Mermaid font dependencies|ZIP CLI|export smoke'
---

# Export portable HTML asset bundles as ZIP

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/59

## Execution update 2026-10-21

本人がIssueごとのCodex sol maxサブリーダー，Herdr worktreeによる並行開発，Devin・無料OpenCodeの活用を指示した．本ISSを作業の正本とし，以下は起票時に取り込んだGitHub仕様である．本文中の未起票・未実装・過去の権限境界は元の記録時点を表す．
D2を積極的に採用する最新方針を反映し，#61は採用を進める実装対象とする．個々のCLI・公開変数・外部参照仕様の選択は実装根拠と検証を添える．
この記録の作成自体は機能の完了を意味しない．mainへの直接書込・push・merge・GitHubコメント送信は各サブリーダーの担当外とする．

## Coordination

Main coordination branch: coord/issues-53-61-20261021．
GitHub IssueとISSの対応: #53 = ISS-0045，#54 = ISS-0046，#55 = ISS-0047，#56 = ISS-0048，#57 = ISS-0049，#58 = ISS-0050，#59 = ISS-0051，#60 = ISS-0052，#61 = ISS-0053．
#56の診断と#57の比較案は先行可能だが，CSS契約は#55と整合させる．#59は#58の参照解決部分だけを先行依存とし，検索UIの完了待ちにしない．#61は独立着手する．

親計画：#53．参照抽出・解決は#58と共有する．ZIPはアセット検索UIの完成を待たず，必要な収集処理から実装できる．

## Problem

現在のHTML出力はアセットへの相対参照を保つため，HTMLだけを別ディレクトリや別PCへ渡すと素材を解決できない場合がある．
`copyDeckForRender` は描画用一時ディレクトリのためのコピーであり，参照される素材だけを収集する配布機能ではない．
本人から，必要なアセットを集めてZIPとして出力する機能が改善候補として挙げられた．

## Goal

対象デッキの発表用HTMLと，その表示に必要なローカル素材を収集し，ZIPを展開した別の場所から閲覧できるようにする．
元素材・原稿の所有権と参照方法は変えず，配布時だけ共有・流用素材を通常ファイルとして固定する．

## 初期仕様案

### 出力内容

- 閲覧用の `index.html`，必要な画像・動画・音声・poster・CSS/SVG等の資源，収集結果のmanifest，開き方と制約を示す短いREADMEを一つのZIPにする．命名は案である．
- 最初はHTML配布を対象にする．既存 `--html/--pdf/--pptx/--images` の意味を変えず，新しい明示的な出力操作を追加する．例えば `marpx <slide.md> --zip --output <deck.zip>` が候補だが，最終CLIは実装前に確定する．
- 全assetsディレクトリ，別デッキ全体，`.git`，`.env`，brief/note，編集用drawioや研究データを一括収集しない．ソース再編集用bundle，PDF/PPTXの同時同梱は後続候補とする．
- 非表示スライドだけの素材と，一時的な制作コメントを含めない．HTMLの話者ノートは既定で配布しない案とし，含める場合は明示設定と収集一覧で分かるようにする．原稿自体は削除しない．

### 収集・参照の解決

- 実際に書き出すHTMLと適用CSSを起点に，資源参照を辿る．原稿解析は出典・使用ページとの対応付けに利用する．CSSの保守的な収集範囲も説明し，「ファイル数が理論的に最小」とは主張しない．
- 通常の画像参照，`src/srcset`，動画・音声のsource/poster，CSSの `url()` / ローカル `@import`，SVGの外部画像・`href/xlink:href` などを対象にする．CSSやSVGの相対参照は，その資源自身の所在を基準に解決する．
- `shared` と別デッキへのrepo内相対symlinkは実体化する．ZIP内にsymlinkを残さず，名前衝突しない格納先へ配置して，HTML/CSS/SVG内の参照をまとめて書き換える．
- `#fragment` や埋込みdata URLはファイルとして読まない．URLのquery/fragment，空白，日本語，エンコードを壊さない．参考文献等の通常のリンク先はダウンロード対象にしない．
- 任意JavaScriptによる動的依存は初期対象外とし，配布資源の静的解析のために追加の任意コードを実行しない．サポートするMarpランタイムと外部スクリプトの扱いを明示する．

### 安全性・外部依存

- 既定の収集範囲は指定repo内とする．絶対参照，file URL，repo外へ抜けるsymlink，循環，欠落，読取不能を黙って解決せず，参照元付きで報告する．既存validatorの許容範囲をZIPのために一律変更しない．
- ZIPエントリに絶対パスや `..` を入れず，realpathでも収集範囲を確認する．特定PCのフルパスをmanifestやREADMEへ漏らさない．
- 外部画像・Google Fonts・CDN等を勝手に取得・再配布しない．残る通信依存をmanifest/READMEに列挙する．完全オフラインを要求するモードでは未解決依存を失敗とする．「ZIPを作れた＝オフライン保証」にはしない．
- フォント等の再配布は，利用者が指定した配布可能な素材に限定する設計を別途確認し，OSや実行環境から自動回収しない．依存を解決できない場合のfallbackと見た目の差も隠さない．
- 出力前のdry-runで，格納ファイル，合計サイズ，外部依存，除外，エラーを確認できるようにする．巨大動画やファイル数の上限は設定可能な制約として検討する．
- 一時領域で準備し，成功時だけ確定する．失敗時は成功扱いの不完全ZIPを残さず，既存出力を壊さない．同名ファイルの上書きは明示指定を必要とする．

### Manifest

元のrepo相対参照，ZIP内のパス，サイズ，内容ハッシュ，使用ページ，外部依存・未対応項目，描画器の版を記録する．
同一素材を複数ページが使う場合の参照関係を保持し，同名の別ファイルを取り違えない．
ソースの引用・出典は保持するが，ローカルの個人情報や無関係な制作ノートをコピーしない．

## Acceptance criteria

- [x] 画像・動画・poster・共有素材・別デッキ素材を含むデッキをZIP出力でき，展開先に元repoがなくてもローカル参照を解決できる．アーカイブ内には通常ファイルだけがある．
- [x] ローカル依存だけのfixtureは，別の一時ディレクトリへ展開し，ネットワークを遮断したブラウザで全表示ページとメディアの読込みを確認する．fileで開く場合の対応範囲と，HTTPで提供する場合の手順を実測に基づきREADMEへ記載する．
- [x] 外部資源を含むfixtureでは依存が列挙され，完全オフライン指定では非ゼロ終了する．未対応の動的依存を対応済みとしない．
- [x] CSS→画像，CSS→CSS，SVG→画像の参照を辿って書き換えられる．内部fragment，data URL，通常の引用リンクを誤収集しない．
- [x] 日本語・空白のパス，同名で内容が異なる素材，同一素材の複数参照，深いdeckディレクトリ，親symlinkで期待どおりになる．
- [x] repo外参照，絶対リンク，循環，欠落，名前衝突，読取失敗を検出し，原稿・素材・既存ZIPを変更しない．path traversalを含むケースで収集範囲を越えない．
- [x] 無関係な素材，非表示ページ専用の素材，brief/note/.env/.gitを同梱しないテストがある．話者ノートと出典の保持・除外は仕様どおり確認する．
- [x] manifestの格納先と内容ハッシュがZIP実体に一致し，収集順等の非本質的な揺れを抑えられる．再現性を保証しない項目は明記する．
- [x] 既存の通常export，validator，scroll/presenter，数式・Mermaidを壊さず，ZIPに必要な描画器・設定を別実装で二重管理しない．
- [x] CLIのhelp・README・利用例，単体テストと展開後のE2Eを追加し，エラー終了・cleanup・出力先指定を検証する．

## 入口・実装分割

`bin/marpx.js` のexport分岐，`marp.config.js`，`src/media-assets.js`，`src/markdown-source.js`，`src/slide-map.js`，既存CLI/メディアのテストが入口になる．
まず依存抽出と安全な格納計画を単体テストし，次にZIP生成とCLI，最後に展開後の閲覧を確認する．
ZIPライブラリやmanifest schemaは未選定．既存依存の再利用と小さな依存追加を比較し，実質的な契約変更はproposed ADRへ分ける．

## 根拠

- [現在のexport分岐](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/bin/marpx.js)，[描画用コピーと参照抽出](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/src/media-assets.js)，[README](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/README.md)．
- 本人のZIP案と今回のIssue登録依頼は#53に記録した．ここにある詳細は実装用の提案仕様であり，機能は未実装．

## 正本記録

repo内ISSは未起票．現行記録を照合し，実装開始時に記録CLIで作成・validateして本Issueと相互参照する．配布範囲・外部依存の扱い等の採用を，本Issue登録だけでaccepted ADRにしない．

## Notes

2026-10-21，marp-i59-leadによるローカル実装を開始した．上記「repo内ISSは未起票」は取り込んだGitHub起票時点の記述であり，本ファイルを作業の正本とする．

最終HTMLを起点に，CSSのurlとimport，SVGの外部資源を辿るread-only計画と，通常ファイルだけを格納するZIP writerを分けた．全assetsのコピーは行わない．repo相対source，書換え前後のSHA-256，格納先，表示順の使用ページ，参照関係，通信依存，未対応項目と除外方針をmanifestへ記録する．CSSは未使用selectorを含めて保守的に収集する．コメントと話者ノートは最終HTMLから除外し，可視の引用リンクを保持する．

ZIPは同一filesystem上の一時領域で完成させ，通常はhard linkによる非上書き確定，明示forceではrenameで確定する．既存出力，原稿と参照素材への上書きを防ぐ．パス・realpathの二重境界，通常ファイル確認，Windows形式を含むZIP traversal，symlink循環，欠落，読取不能，サイズ上限，staging書込失敗をテストした．圧縮にはfflate 0.8.2，CSS値にはpostcss-value-parser 4.2.0を追加し，既存transitiveのhtmlparser2 10.1.0を直接依存へ明示した．

Devin fusion-gpt-6-1-sol-xhigh-sidekick-swe-2-highを参照書換えに12分限定で使用したが，実装未作成のためleadが引き継いだ．その後，ZIP失敗テストだけの3分read-only分析を依頼し，Windowsパス，素材aliasのforce上書き，staging後I/O失敗の3件を追加した．OS sandboxはbubblewrap未導入で起動できず，accept-editsのworkspace編集権限を使い，無制限承認は使用していない．

単体・CLI・既存media/hidden-slide回帰は61件成功した．移設して元repoを削除したChromiumのfile/HTTP・通信遮断E2Eが成功した．深いdeck，shared親symlink，別deck素材，空白・日本語名，画像，CSS→CSS→画像，SVG→画像，動画・poster・音声，非表示ページ，話者ノート除外，引用保持，数式，全表示ページの移動を確認した．追加のMermaid通信依存E2Eと，既存のPDF/PPTX/HTML/images export smokeを合わせた3件がstrict modeで成功した．Mermaidが生成するSVGにはGoogle Fonts Interへのimportがあり，strict-offlineで拒否することと，通常ZIPのmanifest/READMEで依存を列挙することを確認した．外部フォントを自動取得・除去しない．

共通設定によるHTML変換は一度だけ実行し，失敗なら公開しない．#61のassertD2RenderSucceededの接続・複合受入は以下の統合checkpointに記録した．採用判断のADRを必要とする場合はmainが中央でIDを割り当てる．担当worktreeから新規record IDの採番，push，merge，GitHubコメント送信は行わない．

mainへの統合確認待ちとしてin-reviewにした．上の受入チェックボックスは，並行Issueの共通APIとD2の統合をmainが確認してから更新する．最終HTMLと書換え資源に加えREADMEのハッシュもmanifestへ記録し，自己ハッシュを持てないmanifest.jsonはmetadataFilesへ明示する．

2026-10-21，mainが指定した#58の確定commit b7fa592を，既存2commitを保持して70c2158としてcherry-pickした．docs/media-reference-api.mdの契約を確認し，resolveAssetReferenceをbundle policyで使用し，包含判定も共通isPathInsideへ統一した．CSS/SVGのURL基準は資源自身，inspectAssetPathの規約判定は元の消費deckを基準に分け，正常なCSSの../imgをcross-deckと誤判定しない．絶対symlink，別deckへの直接参照，ディレクトリ単位流用を拒否する回帰テストを追加した．資源読取時のfstat・realpath照合，絶対参照/file URLの拒否，private形式の除外はbundle側で維持し，APIのpath/link/targetをmanifestへコピーしない．原稿の追加parseや再compileは行わない．接続後の単体・CLI・既存メディア・共通resolverの71件と，移設・元repo削除・file/HTTP・通信遮断のE2E 2件が成功した．

mainからrelayされたb7fa592限定security review（/tmp/marpagent-i53-resolver-review-b7fa592.txt）の4接続条件を，既存結果の再利用と追加回帰テストで確認した．各resolver呼出のbundle policy明示を検査し，APIがallowedとするinnocent名のsymlinkでも，実体が.envまたは.git/objects/private.pngならCSS/SVG経由で除外する．絶対pathを持つAPI結果へダミーorigin/contextを加えても，公開manifestとREADMEには含めない．検査後にrepo外symlinkへ交換した場合はreadSyncを呼ぶ前にRESOURCE_CHANGEDで拒否し，検査済みhandleを開いた後のpathname交換では元の許可済みbytesだけを同梱する．実CLIへ決定的なopen直前交換を注入したE2Eでも，外部fdのread回数0，close済み，非ゼロ終了，既存ZIP保持を確認した．private alias拒否・dry-run metadata保護E2Eも追加し，移設E2Eと合わせて4件成功した．追加後の対象unit/CLI/media/resolverはprocess isolationを使わない集計で75件成功した．これはLinux/POSIXの合成fixtureと指定した交換時点の確認であり，任意の競合・別OSまで保証するものではない．foundationの新規欠陥とは扱わず，production codeの変更は不要だった．

#61の確定relay後，ZIP側の変換境界へMARP_AGENT_D2_CWDとMARP_AGENT_D2_STRICT=1を渡す接続を追加した．cwdは元deckのdirectoryを既定にし，明示設定を保持し，呼出元envは変更しない．main paneがinteractive input待ちで通知できない場合もUIへ介入せず，共有checkpointと最終応答へ条件を残す．

## D2 integration checkpoint

mainの明示許可後，自分のWIPをdc3f3cfへ保存し，#61の00c2e2a → 49c9ce7 → c14fac2 → 34f8d9fを指定順で取り込んだ．ローカル対応はb32b987 → d8e02b3 → f7fd293 → 4fb6176である．package/package-lockの競合はZIPとD2の全依存を残して解消し，npm ci --offlineで整合を確認した．binはZIPフラグのscopeとD2のcwd/strict両契約を保持した．

src/portable-export.jsは共通assertD2RenderSucceededを必須importし，単回変換後・収集前に必ず呼ぶ．追加hookで迂回できず，診断carrierのengine/code/message/line/slideを同じErrorへ保持する．D2が使われるHTMLでは共通adapterのD2_VERSIONをmanifestへ記録する．バージョンの再照会や再compileは行わない．

明示的なnpm run test:zip:d2を追加した．合成source repo内にD2 aliasと明示TTFを用意し，相対font設定を元deck cwdから解決してZIPを作る．その後source repo・compiler alias・font inputを削除し，ブラウザのPATHを空directoryにして，fileとHTTPの両方を外部通信遮断で開いた．全2ページ，日本語図ラベル，繰返し図のID分離，埋込fontの読込，グループと数式を確認した．非表示ページの壊れたD2は配布に含まれない．実D2構文エラーは通常出力・dry-runとも非ゼロ終了し，D2未導入も失敗して既存ZIPを保持した．2件ともskipなしで成功した．

統合後のunit/CLI/media/resolver/D2/process/runtimeは111件成功した．security4条件を含むZIP E2E 4件と，既存PDF/PPTX/HTML/images smoke 1件も成功した．最後の版記録追加後はexport/CLI/diagnostics 7件と実D2 ZIP 2件を再確認した．recordsは61件valid，変更JSのformatとdiff検査も成功した．スクリーンショットの日本語図ラベルと数式も確認した．bodyの日本語はOS fontに依存するため，合成fixtureの見出しはEnglishとし，明示fontの検証対象をD2図内に限定した．

合成成果物は/tmp/marpagent-parallel-20261021/issue59-d2-artifacts/combined-d2.zipとfile/http-page-1/2.pngである．main全体の統合strict gateと最終受入は未実施であり，ISSはin-reviewを維持する．

## Main final integration 2026-10-21

最終コードbe3fc23でmainがstrict gate（unit504件，fixture18件，browser113件成功，既存Firefox対象外1件skip），固定D2実CLI7件，D2入りZIP2件を実行し，失敗なしを確認した．条件と限定確認の範囲は[統合記録](../design-assets-integration.md)を参照する．ローカル統合の受け入れと公開レビューを区別し，状態はin-reviewを維持する．
