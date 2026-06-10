---
marp: true
theme: lab
class: normal
paginate: true
transition: slide
style: |
    section {
      --logos-dark: none;
      --bg-gray-5: color-mix(in srgb, var(--color-deck-gray) 5%, transparent);
    }
    /* Figure column: center the figure vertically and horizontally within
       the column (text columns stay top-aligned). */
    section .col > div:has(> figure) {
      align-self: stretch;
      flex: 1.1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
---

<!-- _paginate: skip -->
<!-- _class: title -->
<!-- _header: 自己PR資料 ／ 2026-06-10 -->

<style scoped>
section.title { display: flex; flex-direction: column; }
section.title h1 { font-size: 1.55em; line-height: 1.34; margin: auto 0 0; text-align: center; }
.author-row { display: flex; align-items: center; justify-content: flex-end; gap: 1.4em; margin: 1.8em 0 auto; }
.who { text-align: right; font-size: 0.9em; line-height: 1.85; margin: 0; }
.who p { margin: 0; }
.who strong { color: var(--color-deck-black); font-size: 1.3em; }
.author-row .face { width: 150px; height: 150px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
</style>

# 意図・感情の推測に基づき<br>動的に協調する共有操作AIエージェント

<div class="author-row">
<div class="who">

名古屋工業大学大学院
触覚学研究室
博士後期3年

**西村 匠生**

</div>
<img class="face" src="assets/img/portrait.jpg" />
</div>

---

<!-- _header: 研究背景 -->

<style scoped>
figure.stack2 { gap: 1em; margin-top: 30px;}
figure.stack2 img { flex: none; max-width: 100%; border-radius: 6px; }
figure.stack2 img:first-child { max-height: 220px; }
figure.stack2 img:last-child { max-height: 240px; }
</style>

## 研究背景 — アバター遠隔就労と「協創」

<div class="col">
<div style="flex: .8;">

アバターロボット（OriHime等）は<br>遠隔就労を実現

- だが業務は**定型中心**で，創造性が課題
- **2人で1台のロボット**を同期GUIで操る<br>「GUI融合操作」を自作
- カーソル共有で暗黙的な意思疎通・<br>操作分担＝**協創**
- 分身ロボットカフェ **DAWN** で<br>社会実装・実証

</div>
<div>

<figure class="stack2">
<img src="assets/img/fusion-system.png" />
<img src="assets/img/orycafe.jpg" />
</figure>

</div>
</div>

---

<!-- _header: 着想 -->

## 着想 — 実証で見えた課題から

<div class="col">
<div style="flex: 0.95;">

実証から2つの課題が見えた

- **課題①** 常時2人で操作 → 運用コスト大
- **課題②** ペア作成が相性依存で属人的

そこで **1人をAIに置き換える**着想に至った

- 相手を気づかうふるまいを **AIにも写し取る**
- 狙いは心的充足 — 支援を控え達成感を促す

</div>
<div>

<figure style="overflow: hidden;">
<img src="assets/img/fit-varies.png" style="width: 100%; transform: scale(1.18); transform-origin: center;"/>
</figure>

</div>
</div>

---

<!-- _header: 提案手法 -->

<style scoped>
.col > div:last-child { align-self: stretch; display: flex; flex-direction: column; justify-content: center; }
.arch { display: flex; flex-direction: column; align-items: stretch; gap: 0.55em; }
.abox {
  border: 1px solid var(--color-deck-gray); border-radius: 12px;
  padding: 0.9em 0.7em; text-align: center; font-weight: 700; font-size: 1.08em;
  background: color-mix(in srgb, var(--color-deck-gray) 8%, transparent);
}
.abox.top { background: color-mix(in srgb, var(--color-deck-gray) 18%, transparent); }
.apipe { font-weight: 400; font-size: 0.85em; color: var(--color-deck-gray); margin-top: 0.25em; }
.aar { text-align: center; line-height: 1; font-size: 1.15em; color: var(--color-deck-gray); }
.arlab { font-size: 0.85em; margin-left: 0.4em; }
</style>

## エージェントの仕組み — 熟慮と反射の二重過程

「考える層」と「反応する層」を組み合わせる

<div class="col">
<div style="flex: 1.18;">

- **System2（LLM）** — 意図推定・長期計画
- **System1（ファジィ）** — 低遅延で滑らかに操作
- 複数の行動方策を **Choquet** で調停し，<br>動きの相殺を防ぐ
- 心的状態（意図・感情・性格）を推定し<br>**協調を動的に調整**
- 主体感・納得感・介入頻度で **心的充足を評価**

</div>
<div>

<div class="arch">
  <div class="abox top">System2 ・ LLM（熟慮）
    <div class="apipe">意図推定 ・ 長期方略</div>
  </div>
  <div class="aar"><span class="arlab">方略 ↓ ／ 状態 ↑</span></div>
  <div class="abox">System1 ・ ファジィ（反射）
    <div class="apipe">FCM 決定 → FIS 実行 → Choquet 調停</div>
  </div>
</div>

</div>
</div>

---

<!-- _header: 今後の展望 -->

## 今後の展望 — 協調スタイルを蓄積する

<div class="col">
<div style="flex: 1.1;">

AI同士の協調を大量に試し，<br><strong>可解釈な「協調スタイル集」</strong>を蓄積する

- AI同士で多様な組み合わせを **試す**
- 協調結果を **集めて** 可解釈な特性に整理
- 蓄積して **協調スタイル集**（地図）をつくる
- 人との協調データで **較正** し転移を確かめる

単一の正解でなく，多様な協調の地図を描く

</div>
<div>

<figure>
<img src="assets/img/combine-accumulate.png" style="width: 100%; transform: scale(1.1); transform-origin: center;" />
</figure>

</div>
</div>

---

<!-- _paginate: skip -->
<!-- _header: まとめ -->

<style scoped>
.important {
  width: fit-content;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  margin-top: 1.7em;
}
</style>

## まとめ — 相手に合わせて適応する

<div class="col">
<div style="flex: 1.1;">

相手に合わせて関わり方を変え，<br><strong>心地よい協調（Well-being）</strong>を実現する

- 相手の意図・状態を読み取り，<br>**先回り・確認・見守りを切り替える**
- 押し付けず，**人が主体性を保つ協調**
- 人の**暗黙知を取り込むAIエージェント**は，<br>この延長線上にある

</div>
<div>

<figure>
<img src="assets/img/ai-adapts.png" style="width: 100%; transform: scale(1.1); transform-origin: center;"/>
</figure>

</div>
</div>

<div class="important">

暮らしに近い貴社で，誰かの経験を次の人の力に変えたい

</div>
