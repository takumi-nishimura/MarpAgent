# 描画を見た範囲と所見

担当agentが次の11組22枚を1280×720で直接確認した．第三者レビュー，利用者実験，投影条件での確認ではない．この表にない保存PNG14枚と保存対象外90枚は完全な視覚確認を行っていない．数値的な収まり・テキスト／typographyの一致は全63組で測定した．

| テーマ・ケース | 旧方式 | body | 画像上の観測と判断 |
| --- | --- | --- | --- |
| lab・単図標準 | [画像](run/figures/lab--figure-standard--base--legacy.png) | [画像](run/figures/lab--figure-standard--base--body.png) | 条件A／B，52／68，任意単位，共通入力，captionが読める．bodyで図が大きくなるが，旧方式にも欠落はない．大型化を調整削減と数えない |
| lab・8:4列標準 | [画像](run/figures/lab--columns-standard--base--legacy.png) | [画像](run/figures/lab--columns-standard--base--body.png) | 右の比較条件・留保・強調は保持．bodyはcontainの領域内で図を中央に描画し，captionが下端へ移るため，図とcaptionの距離が増える．列の幅・順序は同じでも見た目の位置は変わる．一律の改善とはいえない |
| lab・縦積み標準 | [画像](run/figures/lab--stack-standard--base--legacy.png) | [画像](run/figures/lab--stack-standard--base--body.png) | 入力→処理→出力，矢印，上下captionを確認．bodyで両図が拡大する．元も自然寸法で読み取れ，追加修復は不要 |
| lab・結果と補足標準 | [画像](run/figures/lab--results-standard--base--legacy.png) | [画像](run/figures/lab--results-standard--base--body.png) | 52／68と差16，marker付き共通入力，一般化の留保，出典が残る．bodyは下部の余白を使う．短い脚注との分離は保つ |
| muji・縦長列，見出し増加 | [画像](run/figures/muji--columns-portrait--heading--legacy.png) | [画像](run/figures/muji--columns-portrait--heading--body.png) | 見出し2行，caption1行．旧 `w-1/2` の図内文字は12pxで細かい．数値とラベルの欠落は見えないが，快適な可読性とは認定しない．bodyは17.22pxで，固定高さ460px経路も16.12pxを保つことを測定している |
| toshiba・縦長列，caption増加 | [画像](run/figures/toshiba--columns-portrait--caption--legacy.png) | [画像](run/figures/toshiba--columns-portrait--caption--body.png) | 両方式ともcaption2行，図内の単位と共通入力，右の留保を保持．旧utilityの16.41pxに対しbody17.82px．captionの内容を縮めた修復ではない |
| toshiba・下段が高い縦積み，見出し増加 | [画像](run/figures/toshiba--stack-taller-media--heading--legacy.png) | [画像](run/figures/toshiba--stack-taller-media--heading--body.png) | 順序と矢印は残るがbodyの上下の図の大きさには差がある．下段ラベルは旧21.00px，body20.47px．canvas高の違いを同じfigure領域へ収めるためで，全mediaの拡大・視認性向上とはいえない |
| lab・長脚注＋caption増加 | [画像](run/figures/lab--results-footnote-wrap--caption--legacy.png) | [画像](run/figures/lab--results-footnote-wrap--caption--body.png) | 本文・留保・marker・2行captionと2行脚注を確認．bodyはreserve56pxの修正済みで，脚注要素との離隔3.8125px．既定48pxでの領域干渉はJSONに保持している |
| muji・単図，caption増加 | [画像](run/figures/muji--figure-standard--caption--legacy.png) | [画像](run/figures/muji--figure-standard--caption--body.png) | 値・単位・共通入力は読める．captionは14.4pxの2行で，図の拡大によってcaptionの文字は大きくならない |
| muji・縦積み，caption増加 | [画像](run/figures/muji--stack-standard--caption--legacy.png) | [画像](run/figures/muji--stack-standard--caption--body.png) | 上caption1行，下caption2行，両方の矢印とラベルを保持．bodyは下captionが増える分だけ下図を縮める．文字を省略したりcaption自体を縮小したりしていない |
| muji・長脚注＋caption増加 | [画像](run/figures/muji--results-footnote-wrap--caption--legacy.png) | [画像](run/figures/muji--results-footnote-wrap--caption--body.png) | 共通入力のmarkerと留保は残る．9.6pxの長脚注は両方式で非常に細かい．画面上で文章の存在と分離は確認できるが，全文を快適に読めるとはいえない．文字寸法を比較中に変えず，未解決の可読性として残す |

上記の内容保持・配置変化の所見はこの画像に対して確信度が高い．投影での可読性，研究図の正しさ，読解速度や認知負荷への一般化には根拠がない．数値の最小文字サイズ検査は画像内文字を直接読まず，今回はSVGの元ラベル寸法とcontain倍率を別に用いた．

旧幅utilityで細かくなる縦長図は，最少class数の候補を無条件に推奨しない．同じ1指定の高さ460px経路と，構造を追加するbody経路の両方を比較対象として残す．単図や横長の列は自然寸法で収まるなら移行を必須にしない．
