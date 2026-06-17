# Outline

- Source brief: brief.md
- Generated: 2026-06-17
- Target slide count: 9

## Deck Intent

- Audience summary: 研究室全体（他グループ含む）．ロボティクス，HRI の基礎知識あり．FuzzyDPT の詳細は知らない．自分の研究方向性と今後を伝える
- Core message: FuzzyDPT は質量場に基づく認知アーキテクチャであり，S1 の連続的な行動生成と S2 LLM Worker によるパートナー意図推定を組み合わせて協調行動を実現する．次段階では人間との共有身体実験で，パートナーの意図を推定した協調が成立するかを検証する
- Forbidden patterns: 「FuzzyDPT は全体的に DPT より優れている」/ 数式の羅列 / 旧アーキテクチャ記述 / 速度差を機構根拠にすること

## Slide Plan

### Slide 1: 背景と問題設定

- Title: アバターロボット共有操作と AI 協調の課題
- Takeaway: 共有操作においてエージェントは人間と協調する必要があるが，既存の DPT-Agent は FSM と手続き的制御による離散的な S1 であり，パートナーの行動に応じた連続的な調整が困難
- Layout hint: content
- Content:
    - アバターロボット共有操作の背景（身体障害者の遠隔就労，GUI 共有操作）
    - DPT アーキテクチャ: S1（高速行動生成）と S2（LLM による熟慮）の分離
    - 既存 DPT-Agent の S1: FSM と手続き的実行による閾値での離散遷移．Code-as-Policy はロジック全体の再生成が必要
    - 課題: パートナーの行動変化に連続的に応答し，低コストで S2 が介入できる S1 基盤が必要
- Overflow risk: medium

### Slide 2: FuzzyDPT アーキテクチャ

- Title: FuzzyDPT-Agent アーキテクチャ
- Takeaway: FuzzyDPT は FCM（判断），FIS（行動），質量場合成，動的な読み出しで連続的な S1 を構成し，S2 LLM Worker が非同期に意図推定，誘導，構造修正を行う
- Layout hint: 図を主役にし，テキストは箇条書き最小限
- Asset: assets/img/fuzzydpt_architecture_latest.drawio.svg
- Content:
    - パイプライン: 観測 → 知覚モジュール → Decision FCM → Action FIS bank → Choquet 質量場合成 → 動的読み出し → 行動
    - S2 Workers: Infer（パートナー意図推定），Steer（選好バイアス），Revise（構造パッチ）
    - Trigger FCM が S1 の内部指標から S2 の起動を判断
    - S2 は同期的な計画器ではなく，遅延を伴う補助的な推論と誘導の機構
- Overflow risk: high

### Slide 3: マクロアクション間の競合解消と行動生成

- Title: マクロアクション間の競合解消と行動生成
- Takeaway: 各マクロアクションが「やるべき行動」と「避けるべき行動」を力場として出し，合成された場の上で行動が連続的に決まる
- Layout hint: 図解中心で数式は避ける
- Content:
    - Action FIS がマクロアクションごとに引力（やるべき行動）と反発（避けるべき行動）を力場として出す
    - Choquet 合成がマクロアクション間の相互作用を考慮して力場を統合する
    - 連続行動: 合成された力場の上で，引力に引かれ反発を避けながら連続的に行動が決まる
    - 離散行動（クリック等）: 蓄積した確信が閾値を超えると発火する
    - FSM の離散遷移と異なり，状態変化に対して出力が滑らかに変化する
- Overflow risk: high

### Slide 4: 実験環境と設計

- Title: CoPlace 共有操作タスク
- Takeaway: 2 プレイヤーがカーソルを共有操作してボールを運ぶリアルタイムタスクで，パートナースタイルを変えた 4 条件 × 9 スタイル × 50 シードの検証用評価を行った
- Layout hint: 左に CoPlace スクリーンショット，右に実験設計
- Asset: assets/img/coplace_gui_field_screenshot.png
- Content:
    - 左: CoPlace 環境（GUI カーソル共有操作，ボールをゴールへ運ぶ，スコアは時間経過で減少し消滅）
    - 右: 実験条件
        - 4 条件: dpt-KB（知識なし補助対照），dpt（知識あり crisp 基準），fuzzy（提案手法），partner-alone（操作なし参照）
        - 9 パートナースタイル: 非ストレス 5 種，ストレス 4 種
        - 50 検証用シード（調整用シードとは分離）
        - 速度統制: カーソル速度を揃えて交絡を排除
- Overflow risk: medium

### Slide 5: 実験結果

- Title: S1 検証用評価の結果
- Takeaway: 全体スコアの絶対優位は示されない．ストレス条件で fuzzy の target mismatch が相対的に低下する一貫した条件差が残る
- Layout hint: 図を大きく，数値は最小限の表で
- Asset: F1_primary_outcomes.png, F3_substrate_delta.png
- Content:
    - 全体スコア: fuzzy − dpt の HL -0.1 [-2.2, 1.8]，信頼区間は 0 を跨ぐ．全体優位は主張しない
    - ストレス条件差: HL 4.0 [2.8, 5.7]，p<0.0001．ストレス条件で相対効果が改善
    - スタイル別: 非ストレスでは fuzzy がやや劣位，ストレスでは改善方向
    - 知識の効果（dpt − dpt-KB）: HL 2.3．協調知識の有効性は確認
- Overflow risk: high

### Slide 6: 考察

- Title: 考察
- Takeaway: fuzzy-dpt は「常に良い S1」ではなく，パートナーの優先が厳しい条件でターゲット選択の崩れ方が変わる S1 基盤である．失敗事例のリスクも残る
- Layout hint: ポイントを絞る
- Asset: F4_stress_buffering_mechanism.png
- Content:
    - 機構候補: ストレス条件で target mismatch が相対的に低下（改善幅 20.8 pp）
    - シード単位の相関は ρ=0.25 で強くないため，診断に留める
    - 失敗事例: シード 8008 等で fuzzy が失敗し dpt が成功．安定性は dpt に劣る
    - 対抗解釈: ストレススタイルへの偶然の適合の可能性は，動的スタイル切替実験で部分的に弱められる
    - 「全体的に優れている」ではなく「ストレス条件でのターゲット選択特性が異なる，ただし失敗リスクあり」
- Overflow risk: high

### Slide 7: 今後の方針（1）Contextual Co-Embodiment

- Title: 今後の方針: Contextual Co-Embodiment
- Takeaway: fuzzy-dpt を認知層，MPC を運動層として，人間と AI が対称に一つの仮想身体を共有する実験で，S2 による意図推定を含む協調が成立するかを検証する
- Layout hint: 左に UI スクリーンショット，右にシステム構成
- Asset: coagency_pilot.png（コピー）
- Content:
    - 左: Co-Embodiment タスク UI（物体配置，共有ハンド，safe zone，指示文）
    - 右: システム構成
        - 認知層: fuzzy-dpt（S1 質量場と S2 LLM Infer/Steer）
        - 運動層: MPC（壁回避，躍度制限付き）
        - 融合: v_shared = 0.5(v_human + v_AI)（固定対称）
    - 仮説: S2 の意図推定と S1 の連続的行動生成により，素朴な対称融合（綱引き）を回避し，共有身体の一体感を実現する
    - 条件: Neutral，Naive，Cooperative の 3 条件比較
- Overflow risk: medium

### Slide 8: 今後の方針（2）LLM 協調行動特性空間

- Title: 今後の方針: LLM 協調行動特性空間
- Takeaway: LLM 同士の合成協調で多様な協調スタイルを生成し，その特徴量座標が人間との協調側に転移するかを検証する．パートナー選択の証拠として使えるかが問いの中心
- Layout hint: フロー図を主役にし，主張階層は簡潔に
- Asset: フロー図（新規作成）
- Content:
    - 中心問い: LLM 同士の合成協調データは，いつ，どの条件で，人間とのパートナー選択の証拠として使えるか
    - フロー: メタ制御設定 → LLM-LLM 合成協調（CoDeco-SA）→ 効果ログ特徴量 (x_syn) → Human-LLM 協調 → 特徴量 (x_human) → 転移検証
    - 主張階層: C1 測定器の妥当性 → C2 測定の転移（知的中核）→ C3 選択の有用性 → C4 境界の地図化
    - LLM 同士の協調を人間協調の直接代替とは扱わない．合成的な相互作用の証拠として位置づける
- Overflow risk: high

### Slide 9: まとめ

- Title: まとめ
- Takeaway: FuzzyDPT の現状と今後の全体像
- Layout hint: 箇条書き
- Content:
    - FuzzyDPT: 質量場と動的読み出しによる連続的な S1 と，S2 LLM Worker による非同期の意図推定と誘導
    - S1 評価: 全体優位ではないが，ストレス条件でのターゲット選択特性の差が一貫して残る
    - 次段階 1: Co-Embodiment で S2 込みの人間と AI の共有身体実験（実装進行中）
    - 次段階 2: LLM 協調行動特性空間で合成から人間への測定の転移を検証
- Overflow risk: low

## Source Notes

- /Users/hapticslab/Documents/nishi/lab/experiment/2026-02-expt-fuzzy-dpt/expt-fuzzy-dpt/packages/fuzzy-dpt/docs/architecture.md
- /Users/hapticslab/Documents/nishi/lab/experiment/2026-02-expt-fuzzy-dpt/expt-fuzzy-dpt/outputs/analysis/s1_mass_field_synthesis_codrive_ix_readout_new/report_ja.md
- /Users/hapticslab/Documents/nishi/lab/experiment/2026-06-expt-context-coembodiment/expt-context-coembodiment/docs/SPEC.md
- /Users/hapticslab/Documents/nishi/lab/notes/20_Research/NOTE_LLM協調行動特性空間と適応的エージェント設計_v2.md
- /Users/hapticslab/Documents/nishi/lab/notes/40_Writing/2026_02_Robomech/paper draft v4.md（背景の文脈として）
