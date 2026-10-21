# 安定した配置での lab 比較 — ISS-0049

`lab-refined` を選ばない新 CSS は，安定した旧 CSS と23ページすべてで画素が一致した．選択時の本文・図・条件・出典は保持され，caption の折返しが2箇所で増えた．#55 の `.body` 4構図は大きくなった caption を収めた．#54 の縦長図の境界例は新旧とも clipping が残り，この変更による解消とは扱わない．

## 固定した入力と環境

| 項目 | 条件 |
| :--- | :--- |
| 旧 CSS | `f397ea5:themes/lab.css`．#55 の `6560cc4`，`44a841d`，`f397ea5` を含む安定版 |
| 新 CSS | `0375662` の lab token と，上記3コミットを統合して再生成したもの |
| 代表原稿 | `119fbbb` の `fixtures/layout-baselines/slide.md`，14ページ．元ファイルは変更しない |
| 残余領域の原稿 | `f397ea5` の `fixtures/body-layout-slide.md`，4ページ．元ファイルは変更しない |
| 追加の比較 | `fixtures/lab-refined-slide.md` の4ページ，既存 example の表紙1ページ |
| 条件 | 旧 CSS，新 CSS の class 無効，新 CSS の class 有効．各条件で同じ Markdown を描画 |
| 描画環境 | Linux WSL2 x64，Node `v25.6.0`，Marp Core `5.0.2`，CLI `4.5.1`，Playwright `1.58.2`，Chromium `145.0.7632.6` |
| canvas / viewport / DPR | 1280×720 / 1280×720 / 1 |
| font | Google Fonts の Noto Sans JP．同じファイルを400/700 face として登録 |
| font SHA-256 | `c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f` |

Google Fonts のネットワーク要求は止めた．font ファイルは比較結果の `fonts/` にコピーし，その比較用 browser にだけ `FONTCONFIG_FILE` を設定した．これにより本文の Web face に加え，SVG 内の日本語にも同じ font を利用できる．ユーザーやシステムの font 設定は変更しない．`fc-match sans-serif:lang=ja` はこのファイルを示し，browser の platform font 情報にも custom Noto の使用を保存した．variable font の内部名は `Noto Sans JP Thin` であり，この名称を実際の CSS weight と取り違えない．

元原稿，参照素材，旧新 CSS，font，使用版，測定値と全量 PNG は当時の一時 run に保存した．その既存結果から [代表画像3組・font / CSS / 入力 hash・測定 summary・harness](evidence/ISS-0049-lab-refinement/README.md) を参照可能な証跡として保存した．font 本体と全量画像は同梱しない．初回比較とは条件が異なるため，数値は混ぜない．

## ケースごとの観測

Codex が本文，図，caption，脚注，強調と読み順を画像で確認し，行数・寸法・描画診断と分けて評価した．

| ケース / ページ | 観測 | 種類・確信度・状態 |
| :--- | :--- | :--- |
| `body-standard` / 1，`body-heading-wrap` / 2 | 本文と着色 strong を保持．長い見出しの行数は同じで，行間に応じて本文の開始位置が変わる | typography の意図した差．高，確認済み |
| `figure-standard` / 3，`figure-caption-wrap` / 4 | 図の値・単位・凡例は同じ．長い caption は2行→3行，文字を大きく濃くし，留保をすべて保持 | wrap の差．高，確認済み．clipping なし |
| `columns-standard` / 5 | 根拠を広く置く列順と幅を維持し，着色 strong を太くする | 構図を保持．高，確認済み |
| `columns-portrait` / 6 | 画像は280×640px，列幅は787px / 374pxで維持．caption の自然幅により figure 外枠は288px→360px．画像と caption の下部が新旧ともはみ出す | 既存の measured defect．高，未解消 |
| `stack-standard` / 7，`stack-taller-media` / 8 | 上下の順序，図のラベル・矢印と各 caption を保持 | 構図を保持．高，確認済み．clipping なし |
| `results-standard` / 9，`results-footnote-wrap` / 10 | 値・単位・marker・一般化の留保・出典を保持．長い脚注も行数は同じで，文字と自然高さが大きくなる | typography の差．高，確認済み．本文と脚注の衝突なし |
| `table-standard` / 11，`table-extra-row` / 12 | 判断軸，追加行と結びの説明をすべて保持．表の文字階層とセル高が変わる | typography の差．高，確認済み．clipping なし |
| `diagram-standard` / 13，`diagram-label-wrap` / 14 | 数式，ノード名，ラベルの意味上の改行と矢印を保持 | 描画と画像を確認．高，render error なし |
| #55 `.body` / 1–4 | 1図，二列，縦積み，小見出し付きの各構図を保持．二列の caption は1行→2行で，media 領域を約501.25px→481.77pxへ配分 | 契約との整合．高，確認済み．4構図とも error なし |
| lab smoke / 1–4 | 表紙，明暗背景，一行・複数行の marker，700の着色 strong，図と表を確認 | 読込済み font で視覚確認．高，error なし |
| example 表紙 / 1 | 元の中央見出し，右寄せ author，ロゴと罫線を保持．見出し行間で縦位置が変わる | typography の差．高，確認済み |

既定表示は23ページの画素と本文が一致した．改良版でも23ページの本文が一致した．#54 の portrait ケースを除き，図を含む wrapper の幅は維持した．portrait ケースでも列順・列幅・画像の横位置と寸法は変わらず，caption が figure 外枠の自然幅へ影響したものである．これは「寸法が一切変わらない」という保証から分けて記録する．

## 調整台帳

| 対象 | 追加・撤去・保持した指定 | 理由 |
| :--- | :--- | :--- |
| #54 の14ケース | ページ固有 CSS・inline 寸法・wrapper・utility の追加0，撤去0 | 同じ入力による比較を保つ．縦長図の既存のはみ出しを隠す調整は加えない |
| #55 の4構図 | 既存 `.body`，`.box.fill`，列比2:1，`.place-*` を保持．ページ固有の追加指定0 | 安定した配置契約を共通条件にする |
| テーマ選択 | 比較条件で `lab-refined` だけを切り替える | 内容・group・列順は変えず，移行選択を比較する |
| font / ロゴ | #54 の元のロゴ無効指定を保持．font の face と native fallback を比較環境として固定 | 著者のページ調整とは分けて数える |
| 意図した強調 | `strong`，`em`，`.marker`，`mark` を保持．図内部の再着色0 | 意味と根拠を維持する |

## 実行と結果

全 browser 実行は共有 `flock <browser-lock>` の下で直列化した．下記の一時パスは一般化している．

| コマンド | 結果 |
| :--- | :--- |
| `npm run marpx -- --theme` | 全3テーマをソースから再生成．生成 CSS の競合解消で片側を選ぶ操作は不要で，再生成後の差分もなし |
| `npm run design:lint`，`npm run design:tokens:check` | 全 design error 0 / warning 0，token 一致 |
| `node --test tests/unit/theme-css.test.js tests/unit/design-cli.test.js tests/unit/layout-baselines.test.js tests/unit/canvas-size.test.js tests/unit/scroll-slides.test.js` | 45 pass，skip 0．theme freshness，原稿・素材，canvas，scroll を確認 |
| `node_modules/.bin/playwright test tests/e2e/lab-refinement.spec.js tests/e2e/body-layout.spec.js tests/e2e/layout-compatibility.spec.js tests/e2e/body-exports.spec.js tests/e2e/composition-utilities.spec.js --project chromium --workers 1` | 43 pass，skip 0．追加した16:9 / 4:3の併用テスト2件を含む．export テストは既定の `.body` 原稿の HTML・PNG・PDFを確認 |
| `node <comparison-harness>` | 上記23ページ×3条件の実 font 比較．既定表示は23/23画素一致，改良版は本文23/23一致，wrap 差2件．[保存版](evidence/ISS-0049-lab-refinement/compare.cjs) |
| `node <strict-harness>` | 同じ font と配置で7条件を `-v --strict --format json --report-dir ...` により実測．詳細は下記 |
| `node <class-interface-harness>` | #56 `2eb7616` の committed collector を読込専用で使用．`lab-refined` / `.body` / `.figure-natural` を認識，unknown reason 0 |

strict の全条件が `visualCheck.status: measured` だった．#54 以外の5条件は finding 0 / 終了0である：`.body` の既定と改良版，改良版の4:3，lab smoke，数式・コード・Mermaid を含む Core 5 fixture．#54 の既定と改良版はともにページ6だけ `content-clipped` error / 終了1で，最大値は86px→83px．小さな数値差を欠陥の解消として数えない．ルール・ページ・重大度が新たに増えたケースはなかった．[保存した summary](evidence/ISS-0049-lab-refinement/summary.json) の `strict` に7条件の結果がある．

## 引渡し範囲

元の #54 fixture を書き換えずに比較でき，#55 の確定した配置と併用できた．`lab-refined` の明示選択を維持する．caption の折返しと自然幅が変わり得るため，既定 lab を置き換える根拠にはしない．

#56 の branch 自体は取り込んでいない．ここで確認したのは committed selector collector との公開 class の整合であり，main での最終的な validator 統合確認は残る．同様に full strict gate，Firefox 全回帰，改良版 PDF の別レンダラーによる pixel 比較，実際の研究デッキの移行は未実行．理解度の改善，科学的な内容の正しさ，あらゆる原稿の収まりをこの比較から主張しない．

main から #57 の統合済み・配置関連 unit 60件 / browser 46件成功の報告を受け，既存結果の代表抜粋を [docs/evidence](evidence/ISS-0049-lab-refinement/README.md) へ保存した．保存時の再描画・テスト再実行はない．main 採番の XR-0003（controlled layouts）から参照し，新しい record ID は割り当てない．helper model は使用せず，Codex が保存データの整合を確認した．
