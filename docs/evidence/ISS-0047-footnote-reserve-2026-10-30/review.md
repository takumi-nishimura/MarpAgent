# Phase 2の描画確認

2026-10-30，layout担当自身が以下の画像を直接開いて確認した．別reviewerは起動していない．
Phase 1の確認記録は変更せず，本記録に修正後だけを追加する．画像の拡大を使った読取りと，投影距離での可読性評価は区別する．

## 固定fontの比較

`run/figures/` の次の13枚を1280×720で直接見た．

- `lab`，`muji`，`toshiba`それぞれの `results-footnote-wrap--{base,heading,caption}--after.png`：9枚．
- 3テーマそれぞれの `columns-portrait--caption--after.png`：3枚．
- `lab--results-footnote-wrap--caption--before.png`：1枚．

条件A／B，52／68，入力条件共通，任意単位，差16，強調，別条件への一般化をしない留保と出典が残っている．
見出し／captionの追加も読め，captionと図が重ならず，本文と脚注に離隔がある．
labのbeforeでは本文と脚注が接近し，要素領域が侵入する数値と一致する見え方だった．文字そのものの重なりとしては観測していない．

長脚注では空きを作る分だけ図が少し小さくなった．ラベル31.74〜37.88pxはこの低密度図で読めるが，これをすべての研究図に一般化しない．
縦長列のcaption増加例は，左右の構図・強調・入力条件と単位を維持し，phase 1 bodyのmetricと完全一致した．
mujiの9.6px脚注とtoshibaの10.4px脚注は細かい．lab14px脚注のほうが追いやすいが，theme間の文字設定を変更して有利にしてはいない．

保存21枚のうち残るbefore8枚は今回直接開いていない．全63ケースの数値／内容照合は実施したが，保存していない全ページの目視を実施したとはしない．

## 実export

`exports/` に3テーマ×2比率のPNG12枚とPDF6本を保存した．

- 直接確認したCLI PNG：`lab-4x3/deck.002.png`，`muji-16x9/deck.002.png`，`toshiba-4x3/deck.002.png`．
- 直接確認したPDF描画：`pdf-review/{lab,muji,toshiba}-{16x9,4x3}-page2.png` の6枚すべて．
- PDF6本の全12ページは `pdf-content.json` に文字・脚注境界・本文下端・脚注font sizeを抽出し，4行の脚注と留保・paginationをassertした．

第2ページでは見出し2行とcaption2行を同時に載せた．図内のSynthetic evidence，caption，本文留保，脚注4行，2 / 2がすべて見え，脚注前の空きとページ番号の位置を確認できた．
4:3もnative1024×768で同じ内容を保持した．PNGとPDFはアンチエイリアスが異なるため画素一致とは主張しない．
残るPNG9枚とPDF第1ページ6枚を今回画像として直接見たとはしない．

export用入力は別のEnglish回帰fixtureである．比較63ケースの日本語全ページについて，PDF内容まで確認したという証拠ではない．
