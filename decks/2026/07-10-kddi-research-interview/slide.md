---
marp: true
theme: lab
class: normal
paginate: true
transition: slide
style: |
    section {
      font-size: 28px;
      --logos-dark: url(shared/logos/haptics_lab/logo_gray.svg);
      --bg-gray-5: color-mix(in srgb, var(--color-deck-gray) 5%, transparent);
    }

    .title-profile {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 2rem;
      margin-top: 1.4em;
      margin-left: auto;
      margin-right: 2.5rem;
      font-size: 0.78em;
    }

    .title-profile figure {
      margin: 0;
    }

    .title-profile-info {
      text-align: left;
      line-height: 1.45;
    }

    .portrait {
      width: 164px;
      height: 164px;
      border-radius: 18%;
      object-fit: cover;
    }

    section.title h1 {
      font-size: 1.9em;
      max-width: 900px;
      margin-top: 92px;
      margin-left: auto;
      margin-right: auto;
      text-align: center;
    }

    section:not(.title) h2 {
      width: 100%;
      text-align: center;
      margin-left: auto;
      margin-right: auto;
    }
---

<!-- _paginate: skip -->
<!-- _class: title -->
<!-- _header: 2026-07-10 -->

# 人に寄り添う協調 AI エージェント<br/>設計と初期結果

<div class="title-profile">

<figure>
<img class="portrait" src="shared/img/portrait_bil.jpg" />
</figure>

<div class="title-profile-info">

KDDI 総合研究所 インターンシップ面接

名古屋工業大学大学院 触覚学研究室 D3

<strong style="font-size: 1.45em;">西村 匠生</strong>

</div>
</div>

---

<!-- _header: 原点 -->

<style scoped>
section {
  font-size: 27px;
}
.origin-visuals {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.7rem;
  width: 100%;
  align-self: stretch;
}
.origin-visuals figure,
.visual-card {
  margin: 0;
  width: 100%;
}
.visual-card {
  height: 214px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  background: white;
}
.origin-visuals img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.origin-visuals figure:first-child img {
  width: 112%;
  max-width: none;
}
.origin-visuals figure:last-child img {
  object-fit: cover;
}
.origin-points {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.15rem;
  line-height: 1.28;
}
.label {
  display: block;
  color: var(--color-deck-gray);
  font-size: 0.78em;
  font-weight: 700;
  margin: 0.42em 0 0.16em;
}
.origin-points ul {
  margin: 0;
  padding-left: 1.15em;
}
.origin-points li {
  margin: 0.14em 0;
}
.origin-points strong {
  color: var(--color-deck-orange);
}
</style>

## 納得して関われる協調相手を設計する

<div class="col fill">
<div class="place-middle">

<div class="origin-points">

<span class="label">実装</span>

- **2 名が同時に 1 台のロボットを共有操作**
  - 同期 GUI で入力を統合し，遠隔就労を支援

<span class="label">現場で見えたこと</span>

- カフェ接客・トッピング実証を実施
- 役割分担，譲り合い，経験に応じた関わり方が表れた

<span class="label">次の問い</span>

- 強すぎる介入は，関与感を下げる
- 相手や状況に応じて関わり方を調整する AI へ

</div>

</div>
<div class="origin-visuals place-middle">

<figure class="visual-card">
<img src="assets/img/fusion-system.png" />
</figure>

<figure class="visual-card">
<img src="assets/img/orycafe.jpg" />
</figure>

</div>
</div>

---

<!-- _header: 研究の問い -->

<style scoped>
section h2 {
  margin-bottom: 0.35em;
}
.question-lead {
  margin: 0 auto 0.85em;
  max-width: 1120px;
  text-align: center;
}
.question-box {
  margin: 0.9em auto 0;
}
ol.timeline li {
  line-height: 1.25;
}
.question-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  margin: 0.9em 0;
}
.question-grid div {
  background: var(--bg-gray-5);
  border-radius: 8px;
  padding: 0.45em 0.6em;
  line-height: 1.28;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.question-grid strong {
  color: var(--color-deck-orange);
  display: block;
  margin-bottom: 0.12em;
}
.question-grid ul {
  margin: 0;
  padding-left: 1.15em;
}
.question-grid li {
  margin: 0.18em 0;
}
</style>

## 相手に応じて関わり方を変える AI

<p class="question-lead">
同じタスクでも，相手や場面によって協調の現れ方は変わる．
</p>

<div class="question-grid">
<div>
<strong>意図</strong>
<ul>
<li>操作状況を見る</li>
<li>相手の狙いを推定する</li>
</ul>
</div>
<div>
<strong>介入</strong>
<ul>
<li>支援する / 待つ / 譲る</li>
<li>強さとタイミングを調整する</li>
</ul>
</div>
<div>
<strong>関与感</strong>
<ul>
<li>タスク達成だけで終わらせない</li>
<li>自分も関われた感覚を保つ</li>
</ul>
</div>
</div>

<ol class="timeline">
<li><strong>状況を読む</strong></li>
<li><strong>意図を推定する</strong></li>
<li><strong>介入を調整する</strong></li>
<li><strong>関わり方を整える</strong></li>
</ol>

<div class="summary-box question-box">

- タスク達成だけでなく，関与感を保つ
- 相手と場面に応じて，協調様式を変える

</div>

---

<!-- _header: 現在の研究 -->

<style scoped>
section {
  font-size: 24px;
}
section h2 {
  margin-bottom: 0.25em;
}
.research-lead {
  margin: 0 auto 0.35em;
  max-width: 1120px;
  padding-left: 1.2em;
  line-height: 1.28;
  display: flex;
  justify-content: center;
  gap: 2.2em;
}
.research-lead li {
  margin: 0;
}
.research-split {
  gap: 0.8em;
}
.research-pane {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 500px;
}
.pane-title {
  color: var(--color-deck-gray);
  font-size: 0.82em;
  font-weight: 700;
  margin-bottom: 0.25em;
}
.research-pane figure {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  margin: 0;
}
.research-pane img {
  width: 100%;
  max-height: 345px;
  object-fit: contain;
}
.research-pane.result img {
  max-height: 360px;
}
.pane-note {
  background: var(--bg-gray-5);
  border-radius: 8px;
  padding: 0.45em 0.6em;
  line-height: 1.32;
  width: 98%;
  margin-left: auto;
  margin-right: auto;
}
.pane-note ul {
  margin: 0;
  padding-left: 1.15em;
}
.pane-note li {
  margin: 0.22em 0;
}
</style>

## リアルタイム協調のための FuzzyDPT-Agent

<ul class="research-lead">
<li>固定ルールだけでは，曖昧な協調が硬い</li>
<li>LLM 単独では，リアルタイム操作に遅い</li>
</ul>

<div class="col fill research-split">
<div class="research-pane" style="flex: 1.05;">

<div class="pane-title">機構: どう動くか</div>

<figure>
<img src="assets/img/fuzzy-dpt.svg" />
</figure>

<div class="pane-note">
<ul>
<li><strong>System 1</strong>: 距離・方向・把持状態で行動を調整</li>
<li><strong>System 2</strong>: 必要時に状況理解・方針を補助</li>
</ul>
</div>

</div>
<div class="research-pane result" style="flex: 1.05;">

<div class="pane-title">初期結果: 何が見えているか</div>

<figure>
<img src="assets/img/poster_score_steps_agent_violin_swarm.svg" />
</figure>

<div class="pane-note">
<ul>
<li><strong>読み取り</strong>: 高 score / 低 steps の傾向</li>
<li>速度差や未検証範囲は注意点として扱う</li>
</ul>
</div>

</div>
</div>

---

<!-- _header: 方向性 -->

<style scoped>
section {
  font-size: 23px;
}
section h2 {
  margin-bottom: 0.12em;
}
.phase-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55em;
  margin: 0.25em 0 0.25em;
  font-weight: 700;
  font-size: 0.95em;
}
.phase-flow .arrow {
  color: var(--color-deck-orange);
}
.phase-note {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  margin: 0 0 0.15em;
  line-height: 1.2;
  font-size: 0.82em;
}
.phase-note div {
  background: var(--bg-gray-5);
  border-radius: 8px;
  color: var(--color-deck-gray);
  font-weight: 700;
  padding: 0.28em 0.45em;
  text-align: center;
}
.flow-figure {
  margin: 0 auto;
  width: 100%;
  display: flex;
  justify-content: center;
}
.flow-figure img {
  width: 82%;
  max-height: 390px;
  object-fit: contain;
}
.direction-summary {
  margin: 0 auto;
  padding: 0.34em 0.7em;
  line-height: 1.2;
  font-size: 0.86em;
}
.direction-summary ul {
  margin: 0;
  padding-left: 1.2em;
}
.direction-summary li {
  margin: 0.08em 0;
}
</style>

## 人に合う協調様式を獲得する

<div class="phase-flow">
<span>探索</span>
<span class="arrow">→</span>
<span>較正</span>
<span class="arrow">→</span>
<span>適応</span>
</div>

<div class="phase-note">
<div>候補を広げる</div>
<div>関わり方を更新</div>
<div>相手へ近づける</div>
</div>

<figure class="flow-figure">
<img src="assets/img/adaptive_agent_research_flow.png" />
</figure>

<div class="summary-box direction-summary">

<ul>
<li>固定した支援者ではなく，関わり方を更新し続ける</li>
<li>未知ユーザーに合う共創パートナーを目指す</li>
</ul>

</div>

---

<!-- _header: KDDI コース 6 への接続 -->

<style scoped>
section {
  font-size: 27px;
}
section h2 {
  margin-bottom: 0.45em;
}
.course-tags {
  display: flex;
  gap: 0.6em;
  justify-content: center;
  margin: 0.45em auto 0.95em;
}
.course-tags span {
  background: var(--bg-gray-5);
  border-radius: 8px;
  padding: 0.28em 0.55em;
  font-weight: 700;
}
.feature-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6em;
}
.feature-grid > div {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 128px;
  padding: 0.48em 0.55em;
}
.feature-grid ul {
  margin: 0.15em 0 0;
  padding-left: 1.15em;
  line-height: 1.25;
}
.feature-grid li {
  margin: 0.18em 0;
}
.closing-box {
  margin: 1.2em auto 0;
  width: 62%;
  padding: 0.5em 1.2em;
  font-size: 0.98em;
}
.closing-box ul {
  margin: 0;
  padding-left: 1.2em;
}
.closing-box li {
  margin: 0.16em 0;
}
.fit-line {
  display: block;
  color: var(--color-deck-gray);
  font-weight: 700;
  margin-bottom: 0.25em;
}
</style>

## フィジカル AI と人に寄り添う AI エージェントへ

<div class="course-tags">
<span>フィジカル AI</span>
<span>人に寄り添う AI エージェント</span>
<span>調査 → 仮説 → 実験 → 報告</span>
</div>

<div class="feature-grid">
<div>
<strong>実装接続</strong>
<span class="fit-line">動く系に落とす</span>
<ul>
<li>LLM・ファジィ推論を接続</li>
<li>GUI 協調環境で試す</li>
</ul>
</div>
<div>
<strong>協調モデル化</strong>
<span class="fit-line">寄り添いを操作可能にする</span>
<ul>
<li>介入の強さを扱う</li>
<li>タイミング・主導権配分を扱う</li>
</ul>
</div>
<div>
<strong>研究展開</strong>
<span class="fit-line">仮説を実験へ戻す</span>
<ul>
<li>観察ログと応答設計をつなぐ</li>
<li>短いプロトタイプで検証する</li>
</ul>
</div>
</div>

<div class="summary-box closing-box">

<ul>
<li>人が納得して関われる協調設計を持ち込む</li>
<li>KDDI 総研の AI エージェント研究で深めたい</li>
</ul>

</div>
