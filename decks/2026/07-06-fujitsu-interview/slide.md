---
marp: true
theme: lab
class: normal
paginate: true
transition: slide
style: |
    section {
      font-size: 30px;
      --bg-gray-5: color-mix(in srgb, var(--color-deck-gray) 5%, transparent);
    }
---

<!-- _paginate: skip -->
<!-- _class: title -->
<!-- _header: 富士通 インターンシップ面接 2026-07-06 -->

<style>
.title-profile {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 2rem;
  margin-top: 1.5em;
  margin-left: auto;
  margin-right: 2.5rem;
  font-size: 0.8em;
}

.title-profile figure {
  display: block;
  margin: 0;
  width: auto;
}

.title-profile-info {
  text-align: left;
}

.portrait {
  width: 170px;
  height: 170px;
  border-radius: 20%;
  object-fit: cover;
}

.name {
  font-size: 1.5em;
  font-weight: bold;
  margin-top: 0.5rem;
}

section.title h1 {
    font-size: 2em;
    margin-top: 100px;
}
</style>

# 人の心的充足を目指した<br/>協調 AI エージェント

<div class="title-profile">

<figure>
<img class="portrait" src="shared/img/portrait_bil.jpg" />
</figure>

<div class="title-profile-info">

名古屋工業大学
工学専攻 博士後期課程
触覚学研究室

<p style="font-size: 1.5em; font-weight: bold;">西村 匠生</p>

</div>

</div>

---

<!-- _header: 問題意識 -->

## 相手によって協調は変化する

<div class="col">
<div style="flex: 1.3;">

- **2人が同時に1台のロボットを共有操作**
  → *身体障害者同士*によるトッピング接客就労実証を主導
- 協働の中で，経験や個性を活かした関わり方が表れる
    - **相手によって自己発揮の仕方が変わる**

<div style="height: 1em;"></div>

- 一方で，関わり方のずれは対立や遅延につながる
  → 人間同士の協働を，<br/>**人間–AI 協調操作**へ拡張したい

</div>
<div>

<figure>
<img src="assets/img/fusion-system.png" />
</figure>

<figure style="margin-top: 1em;">
<video src="shared/video/融合アバター共創実験_プロジェクトストーリー_JP.mp4" muted autoplay controls loop></video>
</figure>

</div>
</div>

---

<style scoped>
section {
  font-size: 25px;
}
section h2 {
  margin-bottom: 0.25em;
}
.label {
  display: block;
  color: var(--color-deck-gray);
  font-size: 0.78em;
  font-weight: 700;
  margin: 0.55em 0 0.2em;
}
.research-flow {
  width: 108%;
  margin-top: 0.2em;
  margin-left: -0.2em;
}
.research-flow svg {
  width: 100% !important;
  height: auto !important;
}
.research-flow svg text {
  font-size: 14px !important;
  font-weight: 400 !important;
}
</style>

<!-- _header: 研究課題 -->

## 協調 AI の構築から未知ユーザー適応へ

<div class="col">
<div style="flex: 0.95;">

<span class="label">着眼点</span>

- 相手や場面によって，相互作用や感じ方が変化する
- その変化に応じて，**リアルタイムに協調の仕方を調整**する必要がある

<span class="label">研究課題</span>

- リアルタイムに推論し協調するエージェントアーキテクチャを構築
- 協調パターンを人間基準で較正
- 未知ユーザーへの適応方針を設計

</div>
<div style="flex: 1.6;">

<div class="research-flow">

```mermaid
flowchart TD
  A[リアルタイム協調エージェント]
  B[エージェント同士による協調シミュレーション]
  C[協調パターンの発見]
  D[人間基準での較正]
  E[未知ユーザーへの適応]

  A --> D --> E
  B --> C --> D
```

</div>

</div>
</div>

---

<!-- _header: リアルタイム協調エージェント FuzzyDPT -->

<style scoped>
.col {
    display: grid;
    grid-template-columns: 2fr 1fr;
    align-items: center;
    gap: 1em;
}
.label {
  display: block;
  color: var(--color-deck-gray);
  font-size: 0.78em;
  font-weight: 700;
  margin: 0.75em 0 0.25em;
}
.side-notes ul {
  margin: 0;
  padding-left: 1.2em;
  line-height: 1.28;
}
.side-notes li {
  margin: 0.25em 0;
}
.arch-pane {
  min-height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.arch-figure {
  width: 100%;
  margin: 0;
}
.arch-figure img {
  max-height: 500px;
  object-fit: contain;
}
</style>

<div class="col">
<div class="arch-pane">

<figure class="arch-figure">
<img src="assets/img/fuzzy-dpt.svg" />
</figure>

</div>
<div class="side-notes">

<span class="label" style="margin-top: 3em;">目的</span>

- _人間とリアルタイムに協調操作する_
- 譲歩・発揮などの**スタイルを状況に応じて変化**させる

<span class="label">アプローチ</span>

- **ファジィ制御**で低遅延に柔軟な行動生成
- _必要な場面で_ LLM を起動

</div>
</div>

---

<!-- _header: リアルタイム協調エージェント FuzzyDPT -->

<style scoped>
section {
  font-size: 25px;
}
section h2 {
  margin-bottom: 0.25em;
}
.label {
  display: block;
  color: var(--color-deck-gray);
  font-size: 0.78em;
  font-weight: 700;
  margin: 0.5em 0 0.2em;
}
.side-notes ul {
  margin: 0;
  padding-left: 1.2em;
  line-height: 1.28;
}
.side-notes li {
  margin: 0.18em 0;
}
.takeaway {
  background: var(--bg-gray-5);
  margin-top: 0.5em;
  padding: 0.35em 0.55em;
  font-weight: 700;
  line-height: 1.3;
}
.col figure {
  margin-top: 0;
  margin-bottom: 0;
}
.col figure img {
  max-height: 480px;
  object-fit: contain;
}
</style>

<div style="height: 2em;"></div>

<div class="col">
<div style="display: flex; justify-content: center; align-items: center; flex: 1.8; margin-top: 3em;">

<figure>
<img src="assets/img/co-place.svg" />
</figure>

<figure>
<img src="assets/img/poster_score_steps_agent_violin_swarm.svg" />
</figure>

</div>
<div class="side-notes">

<span class="label">比較条件</span>

- 2人の入力で，1つのハンドをGUIで共有操作
- パートナー 3スタイル：<br/>「近さ」or「価値」
- 比較対象：DPT-Agent（w/o System 2）

<span class="label">結果</span>

- FuzzyDPT はパートナースタイルに依らず高得点の傾向
- 完了ステップ数は少ない傾向

ファジィ化により**協調行動を連続的に調整**できた可能性

</div>
</div>

---

<!-- _header: 協調様式の獲得 -->

<style scoped>
section {
  font-size: 25px;
}
section h2 {
  margin-bottom: 0.35em;
}
.phase-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55em;
  margin: 1em 0 0.5em;
  font-weight: 600;
  line-height: 1.25;
}
.phase-flow .phase {
  white-space: nowrap;
}
.phase-flow .arrow {
  color: var(--color-deck-orange);
  font-size: 1.15em;
}
.flow-figure {
  margin: 0 auto;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.flow-figure img {
  display: block;
  width: 80%;
  max-height: 505px;
  object-fit: contain;
}
</style>

## 人に合う協調様式を獲得する

<div class="phase-flow">
<span class="phase">協調様式の探索</span>
<span class="arrow">→</span>
<span class="phase">人間基準での較正</span>
<span class="arrow">→</span>
<span class="phase">未知ユーザーへの適応</span>
</div>

<figure class="flow-figure">
<img src="assets/img/adaptive_agent_research_flow.png" />
</figure>

---

<!-- _header: 富士通インターンへの接続 -->

## インターンへの取り組み

- 共有操作の研究
    - _意図が見えない介入は，学習者の主体感を損なう_
    - カーソル表示により，教師の意図を手がかりとして提示

- Self-Evolving Agent への展開
    - EVE-Agent は，根拠付きの自己進化を実現
    - 一方で，根拠へ至る探索過程の誘導は弱い
    - 正解や根拠を直接与えず，*検索方針・注目点などをヒント*として提示する？

<div style="background-color: var(--bg-gray-5); margin-top: 1em;">

共有操作で培った「複数主体の意図を分析し，協調を支援する設計」の視点を活かし，自己進化マルチエージェントの協調・学習・評価に貢献したい

</div>
