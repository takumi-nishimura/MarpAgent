---
marp: true
theme: lab
class: default
paginate: true
transition: slide
style: |
    section {
      font-family: "源ノ角ゴシック";

      --logos-dark: url(shared/logos/haptics_lab/logo_gray.svg);
      --logo-title-size: 180px;
      --logo-header-size: 40px;
      --bg-gray-5: color-mix(in srgb, var(--color-deck-gray) 5%, transparent);
    }
    .summary-box {
      background: var(--bg-gray-5);
      padding: 0.3em 0.6em;
      margin: 0.4em 0;
    }
    .summary-box.sm {
      font-size: var(--text-sm);
    }
---

<!-- _header: 背景と目的 -->

## アバターロボット共有操作と AI 協調の課題

<div class="col">
<div>

- **アバターロボット共有操作**：<br/>2人が GUI でロボットを共有操作．<br/>AI エージェントがパートナーとして参加<br/> → 人間に応じた協調が必要
- **DPT (Dual Process Theory)**：<br/>System 1（高速行動生成）と System 2（LLM 熟慮）を分離するアーキテクチャ
- 既存 DPT-Agent の限界：<br/>S1 は **FSM の離散状態切替 + ハードコード実行**で連続的な変動に追従できない．S2 は周期起動でコストが高い

<div class="summary-box">

**目的**: 共有操作で人間と自然に協調する AI を実現
**提案**: DPT 各層をファジィ化した **FuzzyDPT**

</div>

</div>
<div style="flex: 0.7">

<figure>
<img src="assets/img/fusion-system.png" />
</figure>

<figure style="margin-top: 1em">
<img src="assets/img/dpt_agent_overview.png" style="background: white; padding: 0.3em;" />
<figcaption>先行研究（DPT-Agent）のアーキテクチャ</figcaption>
</figure>

</div>
</div>

---

<!-- _header: 提案手法 -->

## 構成要素：ファジィに基づく 3 つの処理

**ファジィ理論**: 状態を「0か1」で切り分けず，「どの程度そうか」を0〜1で扱う理論

| 要素              | 役割                       | 入力 → 出力       | DPT-Agent      |
| ----------------- | -------------------------- | ----------------- | -------------- |
| **FCM**           | マクロ行動の重要度を更新   | 状態 → 重要度     | FSM            |
| **FIS**（TSK 型） | ルールごとの判断材料を計算 | 状態 → 行動の根拠 | ハードコード   |
| **Arbitration**   | 支持・抑制を合成して読む   | 根拠群 → 行動     | （なし・新規） |

- **FCM**: 状態やマクロ行動間の因果関係を重み付きネットワークで表現し，各マクロ行動の重要度を連続的に更新する
- **FIS**: 「もし〜なら」形式のルールに基づき，どの行動を支持・抑制するかを計算する
- **Arbitration**: ルールから出た支持・抑制を重ね合わせ，最終的な移動とクリックを出す

---

<!-- _header: 提案手法 -->

## FuzzyDPT-Agent アーキテクチャ

<div class="col">
<div style="flex: 1.6; align-self: stretch; display: flex; align-items: center; justify-content: center; padding: 0.1em;">

<figure style="margin: 0; max-width: 100%; max-height: 100%;">
<img src="assets/img/fuzzydpt_architecture_latest.drawio.svg" style="max-width: 100%; max-height: 100%; display: block;" />
</figure>

</div>
<div>

### Trigger FCM

S1 内部指標から S2 起動を判断<br/> → 周期起動より効率的に熟慮を投入

### S2 Workers（非同期LLM）

- **Infer**: パートナー特性・意図を推定<br/> → FCM 入力に追加
- **Steer**: 選好バイアスを提案<br/> → Decision FCM 出力に加算
- **Revise**: 知識構造の更新を提案<br/> → FCM/FIS を置き換え

</div>
</div>

---

<!-- _header: 提案手法 -->

<style scoped>
.action-summary {
  width: 84%;
  margin: 0.4em auto 0;
  text-align: center;
}
</style>

## 行動決定：複数のルールを重ねて 1 つの行動にする

<figure>
<img src="assets/img/action_readout_example.svg" style="max-height: 330px;" />
</figure>

<div class="summary-box action-summary">

「どれか 1 つの状態を選ぶ」のではなく，<br/>複数ルールの支持・抑制を同時に残したまま重ね合わせる．
その合成結果から，毎時点の移動ベクトルとクリック発火を決める．

</div>

---

<!-- _header: 実験 -->

<style scoped>
.priority-formula img {
  width: 92%;
  max-height: 72px;
  margin: 0.1em auto 0.2em;
  display: block;
}
.nowrap {
  display: inline-block;
  white-space: nowrap;
}
</style>

## "CoPlace" 共有操作タスク

<div class="col">
<div style="align-self: stretch; display: flex; align-items: center; justify-content: center;">

<figure style="margin-top: 1em; text-align:center;">
  <img src="assets/img/coplace_gui_field_screenshot.png"
       style="max-height:450px; width:auto;" />
  <figcaption>共有カーソルでボールを運ぶ協調課題</figcaption>
</figure>

</div>
<div style="flex: 1.7;">

**タスク**: 2 プレイヤーがカーソルを共有操作し，<br/>ボールをゴールまで運ぶ．ボールスコアは時間で減少する

**条件**: DPT / FuzzyDPT（w/o S1）

**設計**

- パートナーは優先度スコアが最大のボールを選ぶ

<div class="priority-formula">

<img src="assets/img/priority_formula.svg" />

</div>

- 9 パートナースタイル: <span class="nowrap">(α，β，γ)</span> を変えて，<br/>通常 5 種とストレス 4 種を作る
- カーソル速度を統制する

</div>
</div>

---

<!-- _header: 実験結果 -->

<style scoped>
.result-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.45em;
  margin-top: 0.25em;
}
.result-card {
  background: var(--bg-gray-5);
  border-left: 4px solid var(--color-deck-gray);
  padding: 0.25em 0.35em;
  text-align: center;
}
.result-card strong {
  display: block;
  font-size: 1.15em;
  line-height: 1.05;
}
.result-card span {
  display: block;
  font-size: var(--text-sm);
  line-height: 1.25;
}
</style>

## 結果: 成功率は同じ，差は協調効率に出た

<figure style="margin: 0.15em 0 0;">
<img src="assets/img/headline_summary.png"
     style="max-height: 320px; width: auto;" />
<figcaption>DPT と FuzzyDPT の主要指標．黒線は平均，点は各条件，薄線は同じ乱数条件とスタイルの対応</figcaption>
</figure>

<div class="result-strip">
<div class="result-card">
<strong>36/36</strong>
<span>両条件で全クリア</span>
</div>
<div class="result-card">
<strong>−149 ステップ</strong>
<span>完了までの平均差</span>
</div>
<div class="result-card">
<strong>+5.4 点</strong>
<span>残時間差が得点差へ</span>
</div>
</div>

<div class="summary-box sm" style="margin-left: 10em; margin-right: 10em;">

全条件で成功したうえで，FuzzyDPT は少ないステップで完了した．<br/>差は成否ではなく，協調中の進め方に出ている．

</div>

---

<!-- _header: 実験結果 -->

<style scoped>
.result-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.45em;
  margin-top: 0.3em;
}
.result-card {
  background: var(--bg-gray-5);
  border-left: 4px solid var(--color-deck-gray);
  padding: 0.22em 0.28em;
  text-align: center;
}
.result-card strong {
  display: block;
  font-size: 0.95em;
  line-height: 1.08;
}
.result-card span {
  display: block;
  font-size: var(--text-sm);
  line-height: 1.2;
}
.main-figure {
  margin: 0.05em auto 0;
  width: 74%;
}
.main-figure img {
  max-height: 315px;
  width: auto;
}
</style>

## 速度差だけでは完了時間の差を説明できない

<figure class="main-figure">
<img src="assets/img/speed_step_delta.png"
     style="max-width: 100%;" />
<figcaption>速度差とステップ数差の対応</figcaption>
</figure>

<div class="result-strip">
<div class="result-card">
<strong>+3.0%</strong>
<span>平均速度差</span>
</div>
<div class="result-card">
<strong>−7.2%</strong>
<span>ステップ数差</span>
</div>
<div class="result-card">
<strong>16/36</strong>
<span>遅いのに少ステップ</span>
</div>
</div>

<div class="summary-box sm" style="margin-left: 5em; margin-right: 5em;">

FuzzyDPT の改善は，カーソルを速く動かしただけでは説明しきれない．<br/>同じ速度帯でも，より少ないステップで終わる条件がある．

</div>

---

<!-- _header: 今後の方針 -->

## 今後の方針: Contextual Co-Embodiment

<div class="summary-box">

**問い**: 人間と AI が **身体融合**するとき，**LLM** で意図推定する AI は「**動きを邪魔する別主体**」でなく「**共に身体を動かす共主体 (we-agency)**」になるか

</div>

<div class="col">
<div style="flex: 0.65; align-self: stretch; display: flex; align-items: center; justify-content: center;">

<figure style="margin: 0;">
<img src="assets/img/coagency_pilot_v2.png" style="max-height: 240px; width: auto;" />
<figcaption>共有ポイントで 6 物体を 4 zone に仕分け</figcaption>
</figure>

</div>
<div style="flex: 1.4; line-height: 1.26;">

AI (**FuzzyDPT**)：S2 LLM が人間意図を推論し S1 をリアルタイム適応

- **Neutral**: AI なし（単独操作の基準）
- **Naive**: S1 のみ（適応なし）
- **Cooperative**: S1 + S2（適応あり）

**情報非対称の協調設計**：<br/>共有ポイント v_shared = 0.5 (v_human + v_agent) を両者が操作

- 4 zone = 隔離/収納（行）× 冷蔵/常温（列）
- **人間** 形状→行（Bouba/Kiki 直感）／**AI** 色→列（センサ DB）
- 単独では不可 → 共有身体での意味統合が必須

</div>
</div>

---

<!-- _header: 今後の方針 -->

## 今後の方針: LLM 協調行動特性空間

<div class="col">
<div style="flex: 1.1;">

<figure>
<img src="assets/img/llm_coop_flow.png"/>
<figcaption>協調ログ → 協働特徴空間 → 人間較正 → 未知ユーザー適応</figcaption>
</figure>

</div>
<div>

**中心問い**  
LLM 同士の協調ログから得た協働特徴空間は，人間との較正を通じて，未知ユーザーに合う協調エージェントの設計・選択に使えるか

**3 段階の方針**

1. **探索**: パーソナリティ誘導により多様なエージェント設計を生成し，協調ログから特徴を抽出
2. **較正**: 人間との協調ログ・主観評価により，特徴空間の意味を補正
3. **適応**: 未知ユーザーの短い協働ログから，相性を推定しエージェントを調整

<!--**主張階層**
**C1** 特徴が行動差を捉える
→ **C2** 合成協調から人間協調へ測定が転移する
→ **C3** 較正済み特徴空間により適合パートナーを選択できる-->

</div>
</div>

<!------->

<!-- _paginate: skip -->
<!-- _header: まとめ -->
<!--
<div class="centered">

1. **FuzzyDPT**: 質量場と動的読み出しによる連続的な S1 と，S2 LLM Worker による非同期の意図推定と誘導
2. **S1 評価**: 全体優位ではないが，ストレス条件でのターゲット選択特性の差が一貫して残る
3. **次段階 1**: Co-Embodiment で S2 込みの人間と AI の共有身体実験（実装進行中）
4. **次段階 2**: LLM 協調行動特性空間で合成から人間への測定の転移を検証

</div>-->
