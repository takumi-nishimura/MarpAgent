---
id: ISS-0053
title: "Render D2 code fences through the configured Marp engine"
type: issue
status: in-review
date: "2026-10-21"
updated: "2026-10-21"
authors:
  - codex-main-leader
scope:
  - diagrams
tags:
  - feature
depends_on: []
supersedes: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Render D2 code fences through the configured Marp engine

GitHub: https://github.com/takumi-nishimura/MarpAgent/issues/61

## Execution update 2026-10-21

本人がIssueごとのCodex sol maxサブリーダー，Herdr worktreeによる並行開発，Devin・無料OpenCodeの活用を指示した．本ISSを作業の正本とし，以下は起票時に取り込んだGitHub仕様である．本文中の未起票・未実装・過去の権限境界は元の記録時点を表す．
D2を積極的に採用する最新方針を反映し，#61は採用を進める実装対象とする．個々のCLI・公開変数・外部参照仕様の選択は実装根拠と検証を添える．
この記録の作成自体は機能の完了を意味しない．mainへの直接書込・push・merge・GitHubコメント送信は各サブリーダーの担当外とする．

## Coordination

Main coordination branch: coord/issues-53-61-20261021．
GitHub IssueとISSの対応: #53 = ISS-0045，#54 = ISS-0046，#55 = ISS-0047，#56 = ISS-0048，#57 = ISS-0049，#58 = ISS-0050，#59 = ISS-0051，#60 = ISS-0052，#61 = ISS-0053．
#56の診断と#57の比較案は先行可能だが，CSS契約は#55と整合させる．#59は#58の参照解決部分だけを先行依存とし，検索UIの完了待ちにしない．#61は独立着手する．

関連計画：#53．先行検討：https://github.com/takumi-nishimura/MarpAgent/issues/53#issuecomment-6283591341

## 本人の要望と設計案の区別

本人は本会話で「d2 が良さげに感じた．markdown内に書いたd2コードブロックをmarpxでレンダリングできると良い．設計を考えて．」と述べた．
求められたのはコードブロック描画の設計であり，以下のCLI方式，既定値，公開変数，初期対象範囲の個々を採用した判断でも，実装・実験の実行指示でもない．
構図はエージェントが確認して調整する方針，既存Mermaid，色付き太字とマーカー，Peleの見送りは維持する．
本Issueは将来実装を参照するための設計案であり，実装済み・accepted ADRではない．

## Problem

外部で.d2からSVGを作って参照する運用では，図の原稿と生成SVGの再生成を別に管理する必要がある．
Markdown内のD2を編集して通常のmarpxを実行するだけで，プレビュー・検証・出力へ同じ図を反映したい．
MarpAgent main `74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16` では，`marp.config.js`の共通エンジンがMermaidプラグイン等を登録しているが，D2の登録はない．
`src/visual-overflow.js`の描画失敗selectorは現在Mermaidを明示しており，D2へ同じ属性を付けるだけでは検査対象にならない．

## Goal

言語名d2のフェンスを明示したときだけ，ホストに導入したD2でSVGを生成し，共通Marp描画経路へ埋め込む．
D2ソースの正本はslide.md，生成SVGは再生成可能なキャッシュとし，デッキ内へ自動的に.d2/.svgの管理ファイルを増やさない．
既存のserve，overview，screenshot，validation，HTML/PDF/PPTX/imagesから利用でき，出力済み資料の閲覧にはD2を要求しない．

## 利用者向けの記法案

通常のMarkdownコードフェンスを使う．最初は独自のフェンス引数体系やfrontmatter設定群を追加しない．

````markdown
## 協調エージェントの構成

```d2
direction: right
human: 人間
s1: System 1
s2: System 2
robot: 共有ロボット

human -> s1
s2 -> s1: 方針更新
s1 -> robot
```
````

- 既定配置はTALAを提案する．D2本体の既定と区別する．
- 図ごとの変更はD2標準の `vars.d2-config` を使う．例えば `vars: {d2-config: {layout-engine: elk}}`．
- 明示したD2設定をMarpAgentの既定値より優先する．既定値をD2ソースの前置きとして与える案をまず検討し，varsの再宣言・null等を含む上書きを固定版で検証する．`--layout=tala`やD2_LAYOUTを無条件で付けて原稿のelk指定を無効化しない．
- D2_*等の環境変数を無条件に引き継がず，再現性に影響する設定は有効値を確定・診断する．実行制限や出力先は原稿から変更させない．
- 図をコードとして説明するときはtext等の通常フェンスを使う．D2以外のフェンスは変更しない．未対応のd2フェンス引数は黙って無視しない．

## 推奨構成と代替案

| 方式 | 利点 | 負担・境界 |
| --- | --- | --- |
| 手動でSVG生成 | MarpAgentの変更不要 | 今回求められた原稿編集と再生成の一体化を満たさない |
| 外部D2 CLIを共通Marpプラグインから呼ぶ | 既存の同期描画・サブプロセス方式に近く，mise管理を利用できる | 実行ファイルの導入と版の固定が必要 |
| JS/WASM版を組み込む | Node側へ依存管理を寄せられる可能性 | 初期化・実行API・フォント・ファイル参照の接続を別に評価する必要 |
| ブラウザでD2を描画 | ブラウザ側へ処理を移せる | HTML以外の出力と描画完了待ちが複雑になる |

初版は外部CLI方式を推奨する．将来差し替えられる小さな関数境界だけを設け，汎用レンダラー登録基盤や常駐サービスは作らない．

### 共通経路

`slide.md → configured Marp engine → D2 fence renderer → D2 CLI → SVG → Marpの配置・出力`

- `scripts/d2-plugin.js`：フェンス認識，元行・スライドへの対応，HTMLへの挿入を担当する案．
- `src/d2-render.js`：実行ファイルの解決，版確認，有効設定，実行制限，成功判定，SVG検査を担当する案．
- `marp.config.js`：共通エンジンに登録する．bin/marpxだけで事前置換して，overviewやvalidatorが別経路になる構成は避ける．
- キャッシュとエラー属性は既存Mermaidの仕組みから必要な共通処理だけを抽出する．Mermaid固有のMathJax後処理をD2へ適用しない．既存環境変数・キャッシュ互換を無断変更しない．
- slide mapなど解析だけの処理ではD2を起動しない．非表示スライドは既存hide処理後に除外されることをテストする．

### D2実行とmise

- D2 0.9.0を最初の検証基準とする提案．TALAは同梱される．最低対応版・将来版の扱いは明記し，latestへ自動更新しない．
- 利用側はD2を使うリポジトリのmise設定で版を固定できる．MarpAgentの実行時にmiseの自動導入・mise use・D2のダウンロードを行わない．
- 実行ファイルは明示したパス（例：MARP_AGENT_D2_PATH）またはPATHから解決する．この変数名は案であり，コマンド文字列や任意引数の入口にはしない．
- miseのプロジェクト選択を保つため，利用プロジェクトの文脈で版と実行ファイルを確定し，一時ディレクトリへ移動して別版のshimが選ばれないようにする．
- D2がない環境でも，D2ブロックのない原稿は従来どおり使える．doctorは解決したパス・版・TALA可否を説明する．
- 標準入力でソースを渡し，標準出力からSVGを受け取る．shell経由の文字列実行をせず，引数配列を使う．watch/playサブコマンドは呼ばない．
- 既存の変換時間制限と整合する図単位のtimeout，入力・出力サイズ制限，子プロセスの終了処理を設ける．同じプロセスで版確認を毎回繰り返さない．

### SVGの埋込みと寸法

- 初版は静的なSVGの直接埋込みを推奨する．生成ファイルへの絶対パスやcache URLをHTMLへ残さない．
- D2の `--no-xml-tag` と `--salt` を利用する候補とする．saltは文書内のブロックを識別できる安定値にし，キャッシュキーにも含める．同じ図を同一ページへ複数回置いた場合のID衝突を防ぐ．
- 生成SVGのroot/viewBox，サイズ，禁止するscript/event属性，外部参照等を検査する．SVG文字列の単純な置換だけでIDやURLの整合を保証しない．
- `.d2-diagram`等のwrapperを設け，既存の図配置規則を共用する．既定は利用領域内，縦横比保持，無断cropなし．必要時だけ図の幅・高さ上限を調整できる少数のCSS変数を用意する．既存Mermaidの公開指定を壊さない．
- BudouXやスライドCSSがD2の計測済みラベルへ再改行・文字サイズ変更を加えないよう，D2 subtreeを保護する．図全体の縮尺調整と図内のフォントサイズ変更を区別する．
- 最初はD2標準のtheme-id等を尊重し，MarpテーマのCSSを機械的に図へ適用しない．labとの配色・書体対応は別の明示的な対応表として後から検討する．
- 日本語と数式は実フォント・出力形式で受入する．フォント名だけのCSS上書きで正しい文字幅を保証しない．ユーザーが指定したフォントファイルを使う場合は内容ハッシュを含め，OSから無断収集・配布しない．

### キャッシュ

キーには，前置きを含むコンパイル入力，有効な描画設定・seed条件，D2実行ファイルの識別と版，アダプターの版，使用するフォントの内容，saltを含める．
同じブロックの未変更再描画はD2を再実行せず，D2の版・設定・フォントが変われば無効化する．
成功して検査済みのSVGだけを原子的に保存し，失敗やtimeoutの出力は保存しない．
キャッシュ削除後も原稿から再生成できることを確認する．
依存ファイルを導入した場合は，その推移的な依存内容もキーと更新監視へ含める．未対応の依存を黙ってcacheする実装にはしない．

### 失敗時の契約

- プレビュー：対象ブロックにエラーと原稿位置を表示し，ほかのスライドは確認できるようにする．前回の成功図を最新図として黙って表示しない．
- validation：既存の `diagram-render-error` にengine=d2を対応付ける．構文エラー行は前置き分を戻してMarkdownの元行へ対応させる．ブラウザがないときも実行失敗自体を隠さず，描画未確認とは別に報告する．
- HTML/PDF/PPTX/images/screenshot：D2の不足・失敗を残したまま成功を返さない．描画結果と診断を共通処理で受け取り，失敗した配布物や既存出力の扱いもテストする．再コンパイルで二重実行しないよう同じcache/コンパイル結果を再利用する．
- D2公式manualは，エラーでも部分出力を書き出す場合があるため，終了コードで判定するよう明記する．終了コード0・妥当なSVG・検査結果を合わせて成功判定する．

## 初版の境界と段階追加

初版の受入範囲は，コードブロック内で完結する単一の静的な図とする案．
import，ローカル/リモートの外部画像・icon，複数board，animationは後続で扱い，初版では未対応と明示する．
ただし，対応対象外と記載すること自体は実行制限ではない．外部CLIはサンドボックスではなく，正規表現だけでimport等の読取りや通信を防げるとは扱わない．
初版は信頼済みのローカル原稿を対象とし，未信頼原稿の安全なレンダリングを保証しない．実装前にD2の解析・実行方法で制限を実現できる範囲を確認し，未対応参照の拒否と限界をテスト・文書化する．外部資源を収集するbundle処理を無条件で有効化しない．

外部素材対応を行う段階では，以下を一体で設計する．
- 相対パスの基準は元のslide.mdのディレクトリとし，一時ファイルやrepoルートではない．importされたD2内部の参照はその元ファイルを基準に解決する．
- 許可範囲，realpath検査，依存内容のcache key，更新監視を揃える．安全性確認前にremote URLを取得しない．
- #58の参照診断と#59のZIP収集へ接続し，自己完結済みSVGと未解決依存を区別する．
初版の外部参照なしSVGはHTMLに埋め込めるため，#58/#59の完成を初版の前提にしない．

## Acceptance criteria

- [ ] d2ブロックを含む原稿を，通常のmarpxから描画できる．HTML/PDF/PPTX/images/overview/screenshot/validationが同じ登録済みエンジンを利用する．
- [ ] D2なし・Mermaidだけの原稿，通常コード例，非表示ページ，解析だけのslide mapが従来どおり動く．既存のMermaid数式・fallback・cacheの回帰がない．
- [ ] TALA既定とD2標準設定による明示変更の優先順位をテストする．環境変数やCLIの既定指定が原稿の意図を黙って上書きしない．
- [ ] 日本語，長いラベル，数式，グループ，部分位置指定，縦横比の異なる図を実際のスライド領域で確認する．内部文字の可読性を既存validatorの成功だけで保証しない．
- [ ] 同一図の複数挿入でID/CSSが干渉しない．BudouX・共通CSS・テーマ変更が計測済みSVGを壊さない．
- [ ] 未変更再描画で再実行しない．入力・D2版・有効設定・フォント・saltの変更で適切に無効化する．失敗した出力はcacheされない．
- [ ] D2未導入，古い版，実行不可，構文エラー，非ゼロ終了＋部分SVG，壊れたSVG，timeout，出力超過を判別できる．プレビューと配布exportのエラーポリシーが仕様どおりである．
- [ ] 通常のD2原稿を描画してもデッキに生成管理ファイルを増やさず，元原稿・既存出力を失敗処理で破壊しない．
- [ ] 自己完結図を含むHTMLを，D2のない閲覧環境・ネットワーク遮断条件で確認する．外部参照やフォントの未解決条件を成功扱いしない．
- [ ] 単体テストの擬似実行ファイルによる失敗試験と，固定版D2を使う実描画試験を分ける．必要なD2がないCIの実描画試験を黙ってskipして完了としない．

## 実装単位案

1. D2実行アダプター・依存検出・cache・失敗処理を単体テストする．フォントと未対応参照の扱いをここで確認する．
2. フェンス，SVGの保護とサイズ，構成ファイル，doctor，validator/各exportのエラー契約を接続し，固定版D2で受入する．
3. 有効性を確認してから外部.d2・素材参照・theme対応を別の単位として追加する．

#55/#56/#57の全面完了や，既存Mermaidの再設計を必須にしない．

## 根拠と確認範囲

確認日：2026-10-20 JST．対象main：`74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16`．
現行AGENTS.md，docs/records/README.md，marp.config.js，scripts/mermaid-plugin.js，scripts/hide-slides-plugin.js，.mise.tomlを確認した．
src/visual-overflow.jsは描画失敗属性に関する検索結果の範囲を確認した．全ファイルを再監査したという意味ではない．
既存ADR-0002/0003/0004/0005は同じmainに対する本会話の既取得内容を参照し，今回は採用・置換していない．
open PRは#52を確認し，D2を含むIssue検索の既存結果は#53だけだった．

一次資料：
- https://d2lang.com/releases/0.9.0/ （TALA同梱，seed設定，0.9.0でのSVG変更）
- https://d2lang.com/tour/man/ （stdin/stdout，終了コード，salt，font，bundle等）
- https://d2lang.com/tour/vars/ （d2-configとCLI/environmentの優先順位）
- https://d2lang.com/tour/imports/ （相対importの基準）
- https://d2lang.com/tour/exports/ （SVG出力と識別子）
- https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/marp.config.js
- https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/scripts/mermaid-plugin.js

D2の一般tourの一部は旧版説明が残り，0.9.0のrelease notesではMarkdownラベルのnative SVG化が記載されている．実装では固定した0.9.0の実出力を正として確認する．

## 正本記録と未実施事項

所有先はMarpAgent．実装開始前に最新記録・関連PRを再照合し，ISSと必要なproposed ADRを記録CLIで起票・validateして本Issueと相互参照する．
今回のcontainerからrawファイル取得はDNS解決に失敗し，archive取得経路でもbytesを得られなかったため，正本一式のローカル取得と記録CLIによる起票・全件検証は未実施である．ISS/ADR番号は手で割り当てていない．
本Issueの作成は，正式なADRの採用や正本Markdownへの反映完了ではない．
コード・依存・原稿・素材の変更，D2実行，描画比較，性能評価，merge/pull，Vault同期は行っていない．
会話URL・conversation/turn/message ID・本人発言の正確な時刻は取得していない．

## Implementation checkpoint 2026-10-21

最新の明示承認に従い，設計検討から実装へ進めた．`work/issue-61-20261021` で作業し，main の統合確認前のため status は in-review とする．push・merge・GitHub コメントは実施していない．

### Interfaces and dependencies

- `scripts/d2-plugin.js` を共通 engine に登録し，fence renderer からだけコンパイルする．解析だけの slide map と非表示スライドは CLI を起動しない．Mermaid は変更していない．
- `src/d2-render.js` は固定 D2 0.9.0，TALA，原稿前置き `tala-seeds: [1; 2; 3]`，依存拒否，フォント内容・実体内容・parser／adapter／runner／salt を含む cache を扱う．mise shim は元のプロジェクト文脈で実体へ解決する．
- `src/d2-process.js` と `scripts/run-d2.js` は同期呼出しの外側に supervisor を置く．非ゼロ＋部分 SVG，timeout，stdout／stderr 超過，早期 exit 後の継承 pipe，呼出元終了を処理する．UTF-8 の途中で切れた capture を byte 上限内に保つ．
- `src/d2-svg.js` は `saxes` 6.0.0，`css-tree` 3.2.1，`fontkit` 2.0.4 を固定追加し，XML／CSS／実際に選択した font face を検査する．SVG ID，参照，selector，font family を図ごとに隔離し，BudouX から図全体を保護する．
- 共通 engine の戻り値は `d2Diagnostics` を持つ．`src/d2-diagnostics.js` の `collectD2RenderDiagnostics(html)` と `assertD2RenderSucceeded(html)` は生成済み HTML の属性だけを読む．後者は失敗時に `code: D2_RENDER_FAILED`，`diagnostics` を持つ例外を投げる．#59 へこの API を連絡済みであり，ZIP は HTML 描画直後に呼べばブラウザも再コンパイルも不要となる．
- CLI の配布 export は engine の strict 診断で書込前に停止する．screenshot と validation は生成済み HTML を使う．validation は browser 起動失敗後にも D2 の `diagram-render-error` を保持する．
- D2・日本語 TTF・Chromium は試験用に明示導入した．実行時の導入処理は追加していない．CI は版固定と SHA-256 確認を伴う明示導入で `test:d2` を実行し，不足を skip しない．

### Verified behavior and limitations

- 固定版に TALA が同梱されること，source の elk が前置きより優先すること，layout の flag／環境変数が source より優先することを確認した．TALA の source data による seed 指定は flag より優先される．scalar seed はエラーになる．`vars: null` は D2 本体の既定へ戻り，`d2-config: null` は前置きを残す．
- D2 同梱 Latin font の日本語不足を確認し，埋込 font face の字形不足を成功扱いしないようにした．通常書体は `MARP_AGENT_D2_FONT_PATH`，斜体は別途 `MARP_AGENT_D2_FONT_ITALIC_PATH` で明示する．OS のフォントを収集しない．
- M PLUS 1p Regular を italic slot へ流用すると，TALA 0.9.0 が複数の seed でも内部 invariant error を返す例を再現した．通常書体から斜体への自動流用を避けた．edge label は既定で italic のため，通常書体の日本語には `style.italic: false` を原稿で明示する．斜体 TTF の明示と elk への変更による描画も検証した．renderer が黙って engine／font を切り替えることはない．
- 字形の存在だけでは計測精度を保証できず，M PLUS 1p で一部 label の縦位置が node の下へずれる例も確認した．最終受入は Noto Sans JP を fonttools 4.60.1 で weight 400 に固定し，label が node 枠内に入ることを browser で検査する．M PLUS の生成済み HTML を `mplus-counterexample.html` として成果物ディレクトリへ保存した．追加した node 枠検査は M PLUS 条件で期待どおり失敗し，`mplus-negative-test.log` に結果を保存した．
- 日本語，長いラベル，LaTeX，グループ，near による部分位置指定，縦長／横長，同一図の複数挿入を実 CLI とブラウザで確認した．HTML／overview は offline context で表示・font 解決・寸法を確認した．PNG を目視し，PDF／PPTX／images／screenshot の生成成功を確認した．PDF／PPTX の別 viewer での目視は行っていない．
- 初版は信頼済みの自己完結した静的な図のみ．import，icon／image，link，複数 board，Markdown label の外部資源・substitution，外部 layout plugin は拒否する．字句検査と host CLI は未信頼原稿の sandbox ではない．外部依存の収集・watch／ZIP 素材追加は実装していない．明示フォントを差し替えた場合は再描画で内容ハッシュを再確認する．
- Linux で実行した結果であり，macOS／Windows の実 CLI・process cleanup は未検証．main の統合 strict gate，#59 と組み合わせた D2 含有 offline ZIP は main の担当として残す．

### Validation evidence

- D2 単体：`node --test tests/unit/d2-diagnostics.test.js tests/unit/d2-svg.test.js tests/unit/d2-process.test.js tests/unit/d2-render.test.js tests/unit/d2-plugin.test.js` — 31 passed，skip なし．
- 固定版：`MARP_AGENT_D2_PATH=/tmp/marpagent-d2-0.9.0/d2-v0.9.0/bin/d2 MARP_AGENT_D2_FONT_PATH=/tmp/marpagent-d2-NotoSansJP-Regular.ttf PLAYWRIGHT_BROWSERS_PATH=/tmp/marpagent-i61-browsers CHROME_NO_SANDBOX=1 flock /tmp/marpagent-parallel-20261021/browser-tests.lock npm run test:d2` — 6 passed，skip なし．
- 既存回帰：`PLAYWRIGHT_BROWSERS_PATH=/tmp/marpagent-i61-browsers CHROME_NO_SANDBOX=1 flock /tmp/marpagent-parallel-20261021/browser-tests.lock node --test tests/unit/mermaid-render.test.js tests/unit/marp-engine.test.js tests/unit/budoux-html.test.js tests/unit/hide-slides.test.js tests/unit/slide-map.test.js tests/unit/conversion-runtime.test.js tests/unit/validate-deck.test.js tests/unit/visual-overflow.test.js tests/unit/doctor.test.js` — 126 passed，skip なし．
- CLI 追加回帰：同じ browser 環境で `node --test tests/unit/cli-args.test.js tests/unit/conversion-runtime.test.js tests/unit/doctor.test.js tests/unit/marp-engine.test.js tests/unit/validate-observability.test.js tests/unit/process-failures.test.js` — 33 passed，skip なし．上記 126 件との重複を含む．
- 成果物：`/tmp/marpagent-parallel-20261021/issue61-artifacts/` に `d2.html`，`d2.pdf`，`d2.pptx`，`d2.001.png`〜`d2.003.png`，`d2-slide2.png` を保存した．原稿は `fixtures/d2-components.md`．
- doctor は D2 実体パス，0.9.0，TALA bundled を pass として報告した．D2 なしの既存 CLI／Mermaid テストも通過した．
- runner の当初3ファイルは Devin `fusion-gpt-6-1-sol-xhigh-sidekick-swe-2-high` に委任した．リードが差分を読み，13 件へ拡張して親終了と chunk 境界を修正し，関連テストを自分で実行した．独立 reviewer は起動していない．

### Central record allocation request

main に ADR（固定 host CLI／TALA 前置き／静的自己完結図の採用）と XR（固定版の設定優先順位・null・font slot 障害・日本語／数式・cache／process の試行結果）の採番を依頼した．この worktree では新しい ISS／ADR／XR 番号を割り当てていない．根拠と制約は上記 Notes と `docs/d2.md` を引き継ぐ．

### Boundary corrections after main review

- #60 の限定確認で，CSS `image-set()` の文字列 URL が `Url` node の検査から漏れ，cache hit でも通ることが判明した．静的な色・font 形式以外の function を拒否する方式へ変更した．通常・vendor prefix・escape・大文字表記・custom property・style 要素／属性と改変 cache の回帰を追加し，修正前の失敗を確認した．`node --test tests/unit/d2-svg.test.js tests/unit/d2-render.test.js` は 16 passed，skip なし．通常の固定 D2 原稿から当該 CSS を生成できることは確認されておらず，供給 SVG と改変 cache の境界を修正した結果である．
