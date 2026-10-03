---
marp: true
theme: lab
paginate: true
style: |
  section {
    --logos-dark: none;
    --logos-light: none;
  }
---

<!-- _header: 比較表 -->

## 閲覧にはPDF，共同編集にはMarkdownを渡す

同じ判断軸を行に置くと，配布方法ごとの違いを追いやすい．

| 判断軸 | PDF | Markdownと素材一式 |
| :----- | :-- | :---------------- |
| 主な用途 | 完成した資料の閲覧 | 内容や構成の共同編集 |
| 受け手の準備 | PDFを開ける環境 | MarpAgentの実行環境 |
| 更新時の作業 | 原稿を修正して再出力 | 同じ原稿を直接修正 |
| 渡す範囲 | 出力したファイル | 原稿，テーマ，参照する素材 |

図の出典や数値の条件は，どちらの形式でも資料内に残す．

---

<!-- _header: 主資料と補足 -->

## ページの変更はslide.mdで完結させる

<div class="grid grid-cols-12 gap-6 items-start">
<div class="col-span-8 min-w-0">

### 編集する内容と保存先

| 変更内容 | 保存先 | 更新するタイミング |
| :------- | :----- | :----------------- |
| 対象者・目的 | brief.md | 要求が変わったとき |
| 見出し・本文・順序 | slide.md | 原稿を改稿するとき |
| 図・写真 | assets/ | 素材を追加・差し替えたとき |

</div>
<div class="col-span-4 min-w-0">

### 運用上の注意

brief.mdには目的や制約を記録し，ページごとの内容は複製しない．

素材の差し替えでは，別の資料からも参照されていないか確認する．

</div>
</div>

---

<!-- _header: 工程と成果物 -->

## 本文を仕上げる前に，重要なページを描画する

<div class="grid gap-6">
<div class="grid grid-cols-12 gap-6 items-start">
<div class="col-span-3">

### 1．ラフを作る

</div>
<div class="col-span-6">

目的と資料を確認し，slide.mdに見出しと要点を置く．

</div>
<div class="col-span-3 text-sm">

確認するもの：話の順序と根拠の不足

</div>
</div>
<div class="grid grid-cols-12 gap-6 items-start">
<div class="col-span-3">

### 2．試作する

</div>
<div class="col-span-6">

重要な図や表を入れて描画し，読み取れる大きさかを確かめる．

</div>
<div class="col-span-3 text-sm">

確認するもの：図のラベルと比較軸

</div>
</div>
<div class="grid grid-cols-12 gap-6 items-start">
<div class="col-span-3">

### 3．全体を整える

</div>
<div class="col-span-6">

残りの本文を加え，前後のつながり，出典，収まりを点検する．

</div>
<div class="col-span-3 text-sm">

確認するもの：描画一覧と検証結果

</div>
</div>
</div>
