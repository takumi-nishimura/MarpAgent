# 配置の調整とクラス診断

共通配置の標準動作は [theme contract](theme-contract.md) と
[ISS-0047](issues/ISS-0047-improve-body-figure-and-caption-layout-defaults.md)
で管理する．この文書は，標準動作から少し調整するときの指定と，その確認方法を定義する．
`.body`，`.figure-natural`，body／column／figure の調整変数は全配布テーマで使える．
適用対象と既定値は [共通の本文・図配置契約](theme-contract.md#remaining-body-area-and-figures)を参照する．

## 調整語彙と指定先

| 調整 | 指定 | 適用先・条件 |
| :--- | :--- | :--- |
| 残りの本文領域 | `.body` 内の `.fill` | 通常スライドの直下に `.body` を置く．title，paper，scroll，従来の `.fill` 単独を一括変更しない |
| 図と説明の列比率 | `--visual-left`，`--visual-right` | `.col.visual` に指定する．既定の比率を必要なページだけ変える |
| 図と説明の列間隔 | `--visual-gap` | `.col.visual` に指定する |
| その他の列間隔 | `--col-gap` | `.col` に指定する |
| 本文上端と下端の余白 | `--body-top-gap`，`--body-bottom-safe` | `section` に指定し，`.body` の共通配置へ継承する |
| 本文内の間隔 | `--body-gap` | `section` に指定する．`.body` 内の配置規則で使う |
| 図と caption の間隔 | `--figure-gap` | `figure` またはそれを含む `section` に指定する |
| 箱内の縦配置 | `.place-top`，`.place-middle`，`.place-bottom`，`.place-spread` | `.box` または `.col > div` に付ける．親に余剰高さがあるときに差が出る |
| 箱内の横配置 | `.place-left`，`.place-center`，`.place-right` | 同じ配置対象に付ける．文字そのものの揃えは `text-align` で指定する |
| 箱自身の配置 | `.self-start`，`.self-center`，`.self-end` | 既存の margin と `align-self` の両方を持つ．親の配置方式と合わせて使う |
| 明示的な grid 比率 | `grid grid-cols-12` と `col-span-*` | 部品の配置規則を持たない wrapper を使う．対応する span は theme contract の safelist を参照する |
| wrapper 内の間隔・整列 | `gap-{2,4,6,8}`，`gap-x-*`，`gap-y-*`，`items-*`，`justify-*` | plain grid／flex wrapper で使う．`.col` の gap は専用変数を使う |
| 図の既存サイズ指定を使う | `.figure-natural` | `.body` 内の `figure` に付ける opt-out 部品．既存の明示サイズや crop の意図を保持する |
| ページ固有の文字揃え・行間・余白 | `text-align`，`line-height`，`margin` などの inline／scoped CSS | 実際の要素に指定する．未生成の `text-right` や `leading-*` が利用可能だと仮定しない |

共通の基本値はテーマ側で管理する．ページ固有の例外は CSS 変数で指定でき，
同じ目的の utility や別の配置クラスを増やす必要はない．
Tailwind の `gap-*` は `--spacing: 0.25rem` の刻みであり，
図や本文の gap 変数とは単位・スケールが異なる．既存の `.text-*` の em と
`--text-*` の rem はそれぞれ維持する．

```html
<div class="body">
  <div class="col visual fill"
       style="--visual-left: 7; --visual-right: 5; --visual-gap: 0.8em">
    <div class="place-middle">
      <figure class="figure-natural">
        <img src="assets/img/evidence.png" style="width: 90%; object-fit: contain">
        <figcaption>出典と条件を保持する</figcaption>
      </figure>
    </div>
    <div class="place-middle">
      <p style="text-align: left; line-height: 1.6">図の解釈と留保を書く</p>
    </div>
  </div>
</div>
```

この例の画像はデッキ所有の実際の素材へ置き換える．`.figure-natural` は
既存サイズの意図がある場合に選び，通常は `.body` の図の収め方を使う．

## 上書き規則

通常の宣言では，レイヤー外の要素規則が layered utility より優先する．
同じ layer 内でも `.col.visual` のような複合 selector が単独の `.gap-*` より強い．
そのため，部品に対する間隔や比率は公開変数で直接調整する．
grid／flex の utility は，その配置方式を自分で選ぶ plain wrapper に使う．
`.col` や `.box` に別の display utility を重ねて配置の責任を競合させない．

inline の宣言や，レイヤー外の scoped CSS は，意図的なページ例外として保持する．
ページ固有の変数は，例えば次のように selector を長くせず指定できる．

```html
<style scoped>
section {
  --body-top-gap: 0.4em;
  --body-bottom-safe: 1.5em;
  --body-gap: 0.7em;
  --col-gap: 0.8em;
  --figure-gap: 0.3em;
}
</style>
```

全 CSS を一括して layer へ移さず，ページ例外のために `!important` を追加しない．
部品を直接調整できる場合は変数を使い，独立した配置関係が必要な場合は
その関係を表す wrapper を使う．

## 縦長図で確認した調整量

#54 の committed 証拠（`756b461`）と同じ Noto Sans JP の TTF hash，
1280×720，Chromium，図と文章を使い，`columns-portrait` の1ケースを確認した．
共有 CSS は #55 の取り込み後を使い，移行前の欠け量が #54 と一致することも確認した．
数値は [測定 JSON](evidence/ISS-0048-body-adjustments/report.json)，
変更箇所は [原稿差分](evidence/ISS-0048-body-adjustments/body.patch)に保存した．

| 方法 | ページ固有の寸法指定 | 配置 wrapper | 欠け lab／muji／toshiba |
| :--- | :--- | :--- | :--- |
| 自然寸法のまま | 0 | 3 | 86／87／98px |
| `max-h-full` を画像に追加（#54） | utility 1つ | 3 | 86／87／98px |
| `max-height: 480px`（#54） | inline 1要素・1宣言 | 3 | 0／0／0px |
| `.body` と高さをつなぐ既存クラス | 0 | 4 | 0／0／0px |

最後の行では `.body` wrapper を1つ増やし，既存 grid に `.fill`，
図の列に `.box` を追加して，`items-start` を `items-stretch` に替えた．
8:4 の列比率は維持した．固定寸法1宣言を不要にできた一方，wrapper が1つ増える．
どのケースでも指定量が減るという評価ではない．新しい utility，ページ固有 CSS，
長い selector，`!important` は追加していない．

図の描画高は lab 501.25px，muji 511.02px，toshiba 497.25px となった．
図の数値・入力条件・caption・留保・強調を保持し，隣接5／7ページの audit は同一だった．
これは1ケースでの欠け・文字衝突・最小文字サイズ違反の確認であり，
全14ケースの `.body` 移行や投影距離での可読性を評価したものではない．
`max-h-full` の名前が存在しても，親高さの前提を満たさなければ効かないことがわかる．

## クラスの利用可否を確認する

validator のクラス診断は常に `severity: info`，`source: classes` の助言である．
描画の成功・失敗にかかわらず単独では検証を不合格にしない．
通常の text summary では件数だけを示し，`--hints` で詳細を表示する．
JSON，SARIF，report.json には詳細を常に記録する．

| ruleId | 判定 |
| :--- | :--- |
| `undefined-class` | 検査した CSS の selector に名前がない．未生成 utility，タイプミス，意図的な marker のいずれでもあり得る |
| `class-availability-unknown` | 外部 CSS，動的指定，読めない theme，解析できない CSS などにより可否を確定できない |

finding は既存の `slide`，`renderedSlide`，`sectionId`，`page` に加えて，
使用箇所の1始まりの `line`，`className`，`reason`，`unknownReasons`，
`candidates` を持つ．ファイルは JSON／report の `deckPath`，
SARIF の `artifactLocation.uri` から特定する．
クラス directive を継承するページでは，`line` は元の宣言行を示す．
隠しスライドも原稿診断の対象とし，`renderedSlide` と `page` は `null` にする．
近い名前の候補は最大3つで，意図に合う置換であることは保証しない．

解析対象は active な生成済み theme CSS，最後に有効な `style:` directive，
実 HTML の `<style>` と authored `class` 属性，Marp の `class:`／`_class:` directive である．
`<style scoped>` の定義はそのページに限る．複合 selector，疑似 class 内の
selector，CSS の escape，`[class~="name"]` も名前として認識する．
CSS コメント，宣言中の文字列・URL，コード例，speaker notes のタグは定義や使用に数えない．
Marp，diagram，math が描画時に追加する class は検査しない．
scaffold の section marker `normal` は CSS 規則がないことを意図した指定として扱う．
`.body`／`.figure-natural` も active theme の生成 CSS から認識する．
通常スライド直下の `.body`，その内部の `figure.figure-natural` という
適用条件は，名前の照合だけでは保証しない．

外部 stylesheet，deck CSS の `@import`，script，動的 class binding，
class 名を列挙できない属性 selector，壊れた CSS は不明の理由になる．
既知の class は，他に外部 CSS があっても名前が存在すると判定する．
配布 theme が明示的に持つ Noto Sans JP の font-face 用 import は class 語彙の対象外とする．
同じ URL をデッキが import する場合や，それ以外の import は読み込まず不明として扱う．

## 検出の限界

名前の存在は，selector の条件を満たすことや，宣言が cascade に勝つことを保証しない．
`h-full` は親に確定した高さが必要であり，`.fill` や `.place-middle` も
余剰領域がなければ期待する位置にはならない．この診断では親高さや computed style を測らない．
CSS の media query，`:has()`，`:not()`，scope の対象要素も実際の描画で確認する．

inline `<style>` の内容を原稿 token から復元できない場合は不明とする．
header／footer directive 内の HTML，埋め込まれた文書や外部 SVG の class は検査対象外である．
class が DOM 操作などの marker として使われている可能性もあるため，
診断を理由に機械的に削除・改名しない．診断がないことを配置の正しさの保証にしない．
