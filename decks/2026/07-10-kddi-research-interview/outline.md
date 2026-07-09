# Outline

- Source brief: brief.md
- Created: 2026-07-09
- Target slide count: 6
- Status: discussion draft before slide authoring. Updated after confirming that the interviewer did not explicitly request slide sharing. Further updated to reframe the core message from「主体性を残す支援」to「人が納得して関われる協調相手」(2026-07-09).

## Deck Intent

- Audience summary: KDDI 総合研究所インターンシップ コース 6 R&D AI のオンライン面接担当者．ES は見ている可能性があるが，研究詳細は初見前提．面接全体は 20 分で，資料共有は明示されていない．資料は必要時に 4-6 分で共有できる補助資料として扱う．
- Core message: 人が納得して関われる協調相手を目指し，意図や状況に応じて関わり方を変える協調 AI エージェントを，実環境に近い共有操作タスクで実装してきた．初期結果として高 score / 低 steps の傾向があり，さらに協調パターンを人との相互作用で較正し，未知ユーザーに合う共創パートナーへ適応する方向を持っている．この経験は，KDDI 総合研究所のフィジカル AI / 人に寄り添う AI エージェント研究に接続できる．
- Narrative arc: 原点 → 問い → 協調エージェントの機構と初期結果 → 人に合う協調様式の獲得 → KDDI コース 6 への接続．
- Weight balance: 原点 1 枚 / 問い 1 枚 / 現在の研究 1 枚 / 方向性 1 枚 / 接続 1 枚 / タイトル 1 枚．
- Terminology: スライド表面では「協調パターン」「関わり方」「介入の強さとタイミング」「納得して関われる」「人に寄り添う AI エージェント」を使う．「心的充足」は測定指標名ではなく，目指す状態を述べるときだけ使う．内部用語の `相互作用記述子面` や `x_hjc` は出さない．
- Layout primitives: `two-column` は generator / skill 側のテンプレート名であり，slide.md に置く CSS class ではない．実装時は `.col`，`.col.fill`，`.col.visual`，`.feature-grid`，`.timeline` を使う．
- Forbidden patterns: 企業 pitch への寄せすぎ / FuzzyDPT 結果の過大主張 / live S2 quality の実証済み扱い / KDDI 公式ページ外の研究詳細の断定 / 資料共有前提の長い発表 / 「主体性を残す支援」という抑制フレームへの後退 / 心的充足を定量評価済み指標のように扱うこと．

## Slide Plan

### Slide 1: タイトル

- Title: 人に寄り添う協調 AI エージェントの設計と評価
- Takeaway: 研究紹介の主語は「人と協調する AI エージェント」．KDDI コース 6 R&D AI 面接用であることを明示する．
- Layout hint: title
- Asset: `shared/img/portrait_bil.jpg`
- Content:
    - 人に寄り添う協調 AI エージェントの設計と評価
    - KDDI 総合研究所 2026 年度インターンシップ コース 6 R&D AI 面接
    - 名古屋工業大学大学院 触覚学研究室 D3 西村匠生
- Speaker note:
    - 「本日は，私の研究の問題意識，現在の実装と初期結果，そしてコース 6 との接続を短く紹介します」程度で入る．
- Overflow risk: low

### Slide 2: 原点

- Title: 納得して関われる協調相手を設計する
- Takeaway: 出発点は，身体障がいのある 2 名が 1 台のアバターロボットを共有操作し，カフェで接客するシステムを作った経験．単なる自動化や代行ではなく，人が自分の関与を感じられる協調のかたちを目指す．
- Layout primitive: `.col` (左: 背景と問題意識，右: システム図 + DAWN / カフェ関連写真)
- Asset candidates:
    - `decks/2026/06-11-panasonic-ojt-pr/assets/img/fusion-system.png`
    - `decks/2026/06-11-panasonic-ojt-pr/assets/img/orycafe.jpg`
- Content:
    - 2 名の操作者が同期 GUI で 1 台のロボットを共有操作
    - カフェ接客・トッピングの実証を通じ，人同士の協調が生まれる場を設計
    - 課題: 関わり方が一方的に強すぎると，自分の関与を感じにくく，納得感も得にくい
    - 問題意識: 人の意図や状況を汲み取り，人が自分の関与を感じられる関わり方を選べる AI を作りたい
- Speaker note:
    - 「人ができない作業を AI が全部代替する」のではなく，「人が自分の関与を感じられる協調をつくる」ことを強調する．
- Overflow risk: medium

### Slide 3: 研究の問い

- Title: 相手に応じて関わり方を変える AI
- Takeaway: 協調は相手や場面によって変わる．AI エージェントには，何をするかだけでなく，どこまで介入するか，いつ待つかを，人が納得して関われる方向へ調整する機構が必要．
- Layout primitive: `.timeline` inside a content slide
- Figure idea:
    - `状況を読む` → `意図を推定する` → `介入を調整する` → `関わり方を整える`
    - 各ノードは短語に留める．必要なら quoted Mermaid label 内で `<br/>` を使ってよい．
- Content:
    - 観察: 同じタスクでも，相手や状況によって協調の現れ方が変わる
    - 研究課題:
        - 相手の意図や作業状況を推定する
        - 介入の強さとタイミングを調整する
        - タスク達成だけでなく，納得感や自分の関与を感じられる関わり方を設計する
    - 到達目標: 人が自分の関与を感じられるように協調様式を変える AI エージェント
- Speaker note:
    - v4 の「人間 h，エージェント j，文脈 c」は口頭でも出さない．「相手と場面で協調は変わる」までにする．
- Overflow risk: low

### Slide 4: 現在の研究

- Title: リアルタイム協調のための FuzzyDPT-Agent
- Takeaway: LLM だけでは応答が遅く，固定ルールだけでは曖昧な協調を扱いにくい．低遅延なファジィ推論と非同期な LLM を組み合わせ，リアルタイム協調を支える．初期評価では高 score / 低 steps の傾向がある．
- Layout primitive: `.col fill` with two visual panes (left: mechanism, right: result graph). Use `style="flex: 1.05"` on the result pane if the graph needs more width.
- Asset candidates:
    - `decks/2026/07-06-fujitsu-interview/assets/img/fuzzy-dpt.svg`
    - `decks/2026/07-06-fujitsu-interview/assets/img/poster_score_steps_agent_violin_swarm.svg`
- Content:
    - 左ペイン: `fuzzy-dpt.svg` を主役にする
        - System 1: ファジィ推論で低遅延に行動を調整
        - System 2: LLM が必要な場面で状況理解・意図推定を補助
    - 右ペイン: `poster_score_steps_agent_violin_swarm.svg` を主役にする
        - 読み取り: FuzzyDPT は高 score / 低 steps の傾向
        - Caveat: 速度差や未検証範囲を踏まえ，単一要因の因果効果とは言わない
- Speaker note:
    - 「LLM が常時ループで制御している」と言わない．非同期に補助する，と説明する．
    - 機構図は外さない．ただし説明文を増やさず，左は「どう動くか」，右は「何が見えているか」に分ける．
    - 結果グラフは読み取りを 1 文に留める．速度差などの caveat があるため，単一要因の因果効果とは言わない．
- Overflow risk: medium

### Slide 5: 方向性

- Title: 人に合う協調様式を獲得する
- Takeaway: FuzzyDPT のようなリアルタイム協調機構を足場に，エージェント同士の相互作用で候補となる協調パターンを広げ，人間との相互作用で関わり方を較正し，未知ユーザーに合う共創パートナーへ適応する．
- Layout primitive: content slide with `.box place-middle place-center`
- Asset: `decks/2026/07-06-fujitsu-interview/assets/img/adaptive_agent_research_flow.png`
- Content:
    - 画像を主役にする．スライド上の追加本文は最小限にする
    - 上部タイトル: 人に合う協調様式を獲得する
    - 必要なら短い補助文: `探索 → 較正 → 適応`
- Speaker note:
    - これは完了済み成果ではなく，現在のリアルタイム協調エージェントを，人に合う協調様式を選べる方向へ拡張する研究構想として説明する．
    - エージェント同士の相互作用で候補を広げ，人間との相互作用から関わり方のライブラリを更新し，未知ユーザーに合う協調パートナーを目指す．
    - KDDI の「人に寄り添う AI エージェント」へ接続する橋渡しとして使う．
- Overflow risk: low

### Slide 6: KDDI コース 6 への接続

- Title: フィジカル AI と人に寄り添う AI エージェントへ
- Takeaway: コース 6 の研究開発プロセスに対し，LLM エージェントを「賢く応答する道具」ではなく，人の状況に合わせて介入量・タイミング・主導権配分を変える協調システムとして設計する視点を持ち込める．
- Layout primitive: `.feature-grid`
- Content:
    - KDDI コース 6 の接続先:
        - ロボット・ドローン等の映像 / センサデータから実環境を認識・判断するフィジカル AI
        - 人に寄り添う応対を行う AI エージェント
        - 調査 → 仮説立案 → 実験評価 → 報告の研究開発プロセス
    - 持ち込める経験:
        - **実装接続**: LLM・ファジィ推論・GUI 協調環境を短いプロトタイプへ落とし込む
        - **協調モデル化**: 「寄り添う」を応答文だけでなく，介入の強さ・タイミング・主導権配分として扱う
        - **研究展開**: フィジカル AI の観察ログと people-oriented agent の応答設計をつなぎ，仮説を動く系で試す
    - 締め: 人が納得して関われる協調設計の視点を，KDDI 総研の AI エージェント研究で深めたい
- Speaker note:
    - 「御社のこの具体研究をやりたい」と断定しすぎず，募集要項にある 2 本柱と研究開発プロセスへ接続する．質疑で具体化する余地を残す．
    - 資料共有が明示されていないため，このスライドは求められた場合の短い締めにする．
- Overflow risk: low

## Source Notes

- `/Users/hapticslab/Documents/nishi/lab/notes/30_Projects/2026_05_JobHunting28/companies/KDDI総合研究所.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/85_Tasks/TASK-108 KDDI総合研究所 オンライン面接.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/85_Tasks/TASK-71 KDDI総合研究所 コース6 R&D AIインターンへの応募.md`
- `https://www.kddi-research.jp/internship.html`
- `/Users/hapticslab/Documents/nishi/lab/notes/30_Projects/2026_05_JobHunting28/ES参照ガイド.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/20_Research/NOTE_人間–エージェント協調における相互作用特徴の発見・較正・適応_v4.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/30_Projects/2026_02_FuzzyDPT/REPORT_FuzzyDPT_unknown-target_s2-timing_2026-06.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/30_Projects/2026_03_CoDeco/CoDeco.md`
- `decks/2026/07-06-fujitsu-interview/outline.md`

## Open Questions

- 面接側から資料共有は明示されていない．冒頭から共有するのではなく，研究説明を求められたときの補助資料として扱う．
- 結果図専用スライドは削除済み．Slide 4 では機構図と結果グラフを左右に分け，caveat を一言で言える状態にする．
- `adaptive_agent_research_flow.png` は方向性スライドとして採用する．完了済み成果に見せず，KDDI 接続への橋渡しとして扱う．
- KDDI 接続を「AI エージェント」軸に寄せ切るか，「フィジカル AI」側のロボット・センサ認識にも 1 文だけ触れるか．現状案は両方に触れつつ，主軸は AI エージェントに置く．
- Slide 3（問い）と Slide 5（方向性）のタイトルが語感として近い（「関わり方を変える」/「協調様式を獲得する」）．2 枚の役割の違いを一目で伝えるため，Slide 5 のタイトルに進展を示す動詞（例:「選べるようになる」「更新し続ける」）を使うかどうかは未決定．
