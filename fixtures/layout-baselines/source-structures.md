# 元原稿との構造対応

2026-10-21 に GitHub 接続の `fetch_file` で commit 固定の5ファイルを取得し，Markdown の構造を確認した．blob SHA は `cases.json` に保存した．template の2ファイルはローカルの `git hash-object` とも一致した．元原稿の画像・写真は取得せず，原稿本文・図内の研究内容も fixture へ転用していない．以下のページは元 Markdown の slide index であり，表示ページと異なる場合がある．

| ケース | 確認した元構造 | 汎用化と境界条件 |
| --- | --- | --- |
| body | [layouts p3，L58–114](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/template/layouts.md#L58-L114)：段階見出しと本文 | 既存の汎用語句を通常本文へ再配置．長い見出しは合成条件 |
| figure | [7月13日 p1，L12–20](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/07-13-lab-seminar-fuzzy-dpt/slide.md#L12-L20)：見出しと単一図，`box fill place-middle place-center`．[6月22日 p6，L211–217](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/06-22-lab-seminar/slide.md#L211-L217)：図＋caption＋高さ上限 | 単一図とcaptionを組み合わせた汎用例．元の配置指定をそのままコピーせず，既定動作を観察．長いcaptionは合成条件 |
| columns | [layouts p2，L29–55](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/template/layouts.md#L29-L55)：12列の8:4．[6月22日 p3，L78–105](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/06-22-lab-seminar/slide.md#L78-L105)：不均等列の図と説明 | テンプレートの8:4を保ち，図と留保を持つ説明へ置換．[8月24日 p1，L16–54](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/08-24-toshiba-research-introduction/slide.md#L16-L54) に縦長写真と本文の列を確認．fixture は写真を使わず，同じ架空値を縦長の図に再配置 |
| stack | [6月22日 p1，L30–57](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/06-22-lab-seminar/slide.md#L30-L57)：狭い列内に二つのfigure，二つ目に上余白とcaption．[8月24日 p3，L103–112](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/08-24-toshiba-research-introduction/slide.md#L103-L112)：一つのfigure内に二つの画像 | 縦読みの関係を独立した二つの汎用figureへ分離．下段キャンバス高だけを増やす境界を合成 |
| results | [6月22日 p6，L183–237](https://github.com/takumi-nishimura/my-decks/blob/c7d1b4523375c35b42d12f7b84533fd0aa407bdb/decks/2026/06-22-lab-seminar/slide.md#L183-L237)：結果図，caption，指標，補足 | 架空値の結果図・caption・留保を残す．元ページには下端脚注がないため，footnoteと長さ境界は追加の合成カバレッジと明記 |
| table | [layouts p1，L12–26](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/template/layouts.md#L12-L26)：同じ判断軸の比較表と前後の文 | ページ本文をそのまま再利用．境界だけ一行追加 |
| diagram | [core5-components p2，L26–40](https://github.com/takumi-nishimura/MarpAgent/blob/74f287d9b0c7ea3d7b6145c096c2fecef6ea2e16/template/core5-components.md#L26-L40)：数式関連の説明とMermaid | 平均を求める新規の汎用内容．一ノードの二行ラベルだけを変更 |

元原稿には flex 比率，中央配置，画像高さ，figure余白，scoped CSS などの明示指定がある．それらの存在だけでは欠陥と判定せず，作成者が人かエージェントかも推定しない．本 scaffold の指定なしの基準と，元原稿の完成済み配置を同等の before／after として比較しない．調整量を比較するときは，同じ汎用 fixture の内容・構図を固定して比較する．
