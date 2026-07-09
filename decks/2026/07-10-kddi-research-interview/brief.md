# Presentation Brief

- Generated: 2026-07-09
- Format: KDDI 総合研究所 2026 年度インターンシップ コース 6 R&D AI オンライン面接用の短い補助資料．面接全体は 2026-07-10 17:00-17:20，Teams，約 20 分．面接側から資料共有は明示されていないため，正式な発表資料ではなく，必要に応じて画面共有できる会話の足場として用意する．

## Audience

- Primary audience: KDDI 総合研究所インターンシップ コース 6 R&D AI の面接担当者．研究員と採用担当が混在する可能性がある．
- Existing knowledge: ES 上の研究概要と学会発表・開発経験は読んでいる可能性があるが，DAWN 実証，FuzzyDPT，CoPlace，協調エージェント研究の詳細は知らない前提にする．
- What they care about:
    - コース 6 R&D AI の「フィジカル AI」と「人に寄り添う応対を行う AI エージェント」に対して，応募者の研究軸がどう接続するか．
    - 最新技術・論文調査，仮説立案，実験評価，報告までを少人数チームで進められるか．
    - 実環境に近い AI エージェント研究で，実装，タスク上のふるまいの比較，仮説更新の経験があるか．
    - 研究テーマを面接の場で過度に売り込むより，議論可能な形で整理できているか．

## Duration

- Total interview length: 約 20 分．
- Talk length: 4-6 分．求められた場合だけ短く共有し，質問時間を優先する．
- Target slide count: 6 枚．タイトル 1 枚，研究紹介 3 枚，方向性 1 枚，KDDI 接続 1 枚．
- Time allocation:
    - Slide 1: 20 秒
    - Slide 2-3: 2 分
    - Slide 4: 1.5 分
    - Slide 5: 1 分
    - Slide 6: 1 分

## Core Message

- One-sentence takeaway: 人の意図や状況に応じて関わり方を変える協調 AI エージェントを，実環境に近い共有操作タスクで実装し，タスク性能と操作過程からふるまいを比較してきたため，KDDI 総合研究所のフィジカル AI / AI エージェント研究に，実装と協調設計の両面から貢献できる．
- Supporting points:
    - **原点**: 身体障がいのある 2 名が 1 台のアバターロボットを同期 GUI で協調操作し，カフェで接客・トッピングを行う遠隔就労システムを開発・実証した．ここから「人が納得して関われる協調相手」への問題意識が生まれた．
    - **研究**: LLM による状況理解・意図推定と，ファジィ推論による低遅延な行動調整を組み合わせ，リアルタイムに協調する FuzzyDPT-Agent を構築している．加えて，エージェントの行動特性がタスク性能や操作過程にどう現れるかを，シミュレーションとログ分析で比較している．
    - **初期結果**: 共有操作タスクでは，FuzzyDPT が高 score / 低 steps の傾向を示している．面接用資料では結果の読み取りを短く扱い，過大な因果主張は避ける．
    - **方向性**: FuzzyDPT のようなリアルタイム協調機構を足場に，エージェント同士の相互作用から候補となる協調パターンを広げ，人間との相互作用で関わり方を較正し，未知ユーザーに合う共創パートナーへ適応する．
    - **KDDI 接続**: コース 6 の「実環境を認識・判断するフィジカル AI」と「人に寄り添う AI エージェント」の中間に，自分の協調エージェント研究を置く．特に，状況認識，プランニング，推論，実験評価のプロセスに貢献できる．

## Audience Action

- 面接担当者が「西村は，AI エージェントを単なる応答生成ではなく，人と同じ作業対象を共有する協調主体として実装し，ふるまいを比較してきた」と理解する．
- コース 6 の少人数 R&D AI インターンで，テーマに合わせて調査・仮説立案・実験評価・報告を進められる候補者だと判断する．
- 質疑では，KDDI 側テーマとの具体的な接続，実験設計，マルチモーダル / フィジカル AI への展開について深掘りできる状態にする．

## Required Sections

1. **タイトル**: 人に寄り添う協調 AI エージェントの設計と評価．KDDI 総合研究所 コース 6 R&D AI 面接用であることを明示する．
2. **原点**: GUI 共有操作によるアバターロボット遠隔協調就労．人が納得して関われる協調相手という問題意識を置く．
3. **問い**: 相手や状況によって協調の現れ方が変わるため，AI も介入の強さとタイミングを変える必要がある．
4. **現在の研究**: FuzzyDPT-Agent．低遅延なファジィ推論と非同期な LLM による状況理解・意図推定を組み合わせる．結果グラフを添え，初期結果は高 score / 低 steps の傾向として短く扱う．
5. **方向性**: 人に合う協調様式を獲得する．`adaptive_agent_research_flow.png` を主役にし，エージェント同士の相互作用，人間との較正，未知ユーザーへの適応を説明する．
6. **KDDI 接続**: コース 6 R&D AI のフィジカル AI / 人に寄り添う AI エージェント / 研究開発プロセスへの接続．インターンで発揮したい貢献を，実装接続，協調モデル化，研究展開の 3 点で整理する．

## Must-Use Assets

- Cover portrait: `shared/img/portrait_bil.jpg` または既存 interview deck の portrait．
- Origin visual candidates:
    - `decks/2026/06-11-panasonic-ojt-pr/assets/img/fusion-system.png`
    - `decks/2026/06-11-panasonic-ojt-pr/assets/img/orycafe.jpg`
- Current research visual candidates:
    - `decks/2026/07-06-fujitsu-interview/assets/img/fuzzy-dpt.svg`
    - `decks/2026/07-06-fujitsu-interview/assets/img/poster_score_steps_agent_violin_swarm.svg`
- Future/workflow visual:
    - `decks/2026/07-06-fujitsu-interview/assets/img/adaptive_agent_research_flow.png`
- Asset handling: slide authoring時に target deck の `assets/img/` へ必要分だけコピーする．brief / outline 段階では source path を記録するだけでよい．

## Forbidden Patterns

- KDDI 総合研究所への接続を強く売り込みすぎて，研究紹介が企業向け pitch だけになること．
- 資料共有が明示されていないのに，冒頭から長い画面共有を前提にすること．
- 公式ページや company note にない KDDI 側の研究詳細を断定すること．「コース 6 の募集要項では...」の範囲に留める．
- FuzzyDPT の結果を過大主張すること．特に，速度差を除いた純粋な意図推定効果，live S2 intervention quality，人間実験での有効性は未確定として扱う．
- 心的充足を，すでに定量評価済みの指標として扱うこと．スライドでは「測る対象」ではなく，関わり方を設計するときの目標状態として扱う．
- `adaptive_agent_research_flow.png` を完了済み成果として見せること．これは現在の実装を，人に合わせた協調様式獲得へ拡張する方向性として扱う．
- `x_hjc`，`human-agent interaction surface`，`相互作用記述子面` などの内部用語をスライド表面に出しすぎること．面接資料では「協調パターン」「関わり方」「介入の強さとタイミング」を優先する．
- LLM が人の意図を「完全に理解する」と言うこと．「推定する」「候補を出す」「補助する」と表現する．
- 面接時間 20 分をすべて発表で使うこと．資料は必要なときだけ，対話の入口として短く使う．
- インターンの待遇・日程・Teams URL などを発表資料に載せること．

## References

- `/Users/hapticslab/Documents/nishi/lab/notes/30_Projects/2026_05_JobHunting28/companies/KDDI総合研究所.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/85_Tasks/TASK-108 KDDI総合研究所 オンライン面接.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/85_Tasks/TASK-71 KDDI総合研究所 コース6 R&D AIインターンへの応募.md`
- `https://www.kddi-research.jp/internship.html`
- `/Users/hapticslab/Documents/nishi/lab/notes/30_Projects/2026_05_JobHunting28/ES参照ガイド.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/20_Research/NOTE_人間–エージェント協調における相互作用特徴の発見・較正・適応_v4.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/30_Projects/2026_02_FuzzyDPT/FuzzyDPT Architecture Index.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/30_Projects/2026_02_FuzzyDPT/REPORT_FuzzyDPT_unknown-target_s2-timing_2026-06.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/30_Projects/2026_03_CoDeco/CoDeco.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/50_Profile/Skills.md`
- `decks/2026/07-06-fujitsu-interview/outline.md`
- `decks/2026/06-26-nec-interview/brief.md`

## Notes for Authoring

- 面接冒頭で使うため，1 枚 1 メッセージに絞る．詳細な研究計画や数式は口頭・質疑に回す．
- KDDI 接続は最終スライドで十分．前半は原点と研究の筋を優先し，方向性スライドで「人に寄り添う AI エージェント」への橋渡しを作る．
- 「研究者としての一貫性」と「コース 6 での即戦力性」を同時に見せる．一貫性は原点と問い，実務性は実装・操作ログの読み取り・仮説更新で示す．
- 結果グラフは本文スライドに添える．読み取りは「高 score / 低 steps の傾向」とし，速度差や未検証範囲を踏まえて因果主張を強めない．
- `adaptive_agent_research_flow.png` は横長で情報が完結しているため，本文を増やさず中央に大きく置く．説明は speaker note に寄せる．
- `slide.md` authoring 前に，必要 asset を target deck にコピーし，validator / overview で実際の見え方を確認する．
