# Outline

- Source brief: brief.md
- Generated: 2026-06-24
- Revised: 2026-06-25 (v7 Slide 4 対比を削除し観察→問いの素直な流れに. Slide 5 を architecture.md 準拠で簡潔化. Slide 7 を主観評価・実験設計中心に)
- Target slide count: 8

## Deck Intent

- Audience summary: NEC サイバーフィジカルインテリジェンス研究所 池田浩雄氏 (テーマ 01-02 担当). CV / DL の専門家. HRI・アバター・身体融合は専門外
- Core message: 修論の実証実験でパートナーによって協調が変化することを観察した. 博士研究ではこの観察を中心に据え, 相互作用記述子の発見・較正・適応に取り組んでいる. リアルタイムに人と協調できるエージェント (FuzzyDPT-Agent) も段階的に検証・構築してきた. これらの経験を 01-02 サブテーマ (8) 姿勢予測に持ち込む
- Narrative arc: 観察 (事実) → 問い (中心命題) → 機構 (FuzzyDPT) → 接続と貢献 (01-02)
- Weight balance: 観察 2 枚 / 問い 1 枚 / 機構 + 検証 2 枚 / 接続と貢献 1 枚 / まとめ 1 枚
- Terminology: v4 用語に揃える ("相互作用記述子", "相互作用面"). 数式記号は出さない
- Forbidden patterns: 過剰な専門用語 / 数式の羅列 / 01-02 サブテーマ「全部やりたい」/ FuzzyDPT を中心メッセージにする / 検証範囲の曖昧化 / Co-Embodiment への言及 / 既存学会名の脚注表示 / Slide 7 で接続を強弁すること (「同型の問題構造」など)

## Slide Plan

### Slide 1: タイトル

- Title: 相互作用記述子に基づく協働エージェントの設計と適応
- Takeaway: 西村匠生 (名工大 D3, 触覚学研究室) がテーマ 01-02 への応募者として研究を紹介する
- Layout hint: title
- Asset: `assets/img/portrait.jpg`
- Content:
    - メインタイトル + サブ (NEC 研究インターン面談 / 2026-06-26 / テーマ 01-02)
    - 名古屋工業大学 工学専攻 博士後期課程 触覚学研究室 西村匠生
- Overflow risk: low

### Slide 2: 研究背景: アバターロボットを用いた遠隔協調就労

- Title: 研究背景: アバターロボットを用いた遠隔協調就労
- Takeaway: アバターロボットは遠隔就労を実現したが定型業務が中心. 2 人で 1 台のロボットを共有操作する方式を自作し, DAWN カフェで社会実装した
- Layout hint: two-column (左: テキスト, 右: 上: DAWN 写真, 下: システム図)
- Asset: `assets/img/orycafe.jpg`, `assets/img/fusion-system.png`
- Content:
    - アバターロボット (OriHime) による遠隔就労: 飲食店接客, オフィス受付
    - 課題: 1 人 1 台では定型業務が中心. 個性を発揮する就労への要望
    - 着想: 2 人の操作者が GUI で 1 台のロボットを**共有操作**
    - 分身ロボットカフェ DAWN で社会実装 (短期 1 日 + 長期 9 日間, 身体障害を有する計 6 名が参加)
- Overflow risk: medium

### Slide 3: パートナーによって変化する協調

- Title: パートナーによって変化する協調
- Takeaway: DAWN 長期実験のデータから, 同一システム・同一タスクでもパートナーが変われば協調の様態が変わることを確認した
- Layout hint: two-column (左: テキスト + 要点, 右: 修論データ可視化)
- Asset: `assets/img/topping_graph.png` (ペアごとの操作軌跡), Optional `assets/img/fit-varies.png`
- Content:
    - 長期就労実験 (9 日間): 同じシステム・同じタスクで複数ペアが参加
    - パートナーによって変化する側面:
        - 操作軌跡がペアごとに異なるパターンを形成
        - クリック頻度・介入タイミングがペアで変化
        - 主観指標 (IOS: 他者との一体感, AWWL: 幸福感) もペア構成で差異
    - 帰着: 同じエージェントでも, 組むパートナーが変われば協調は変わる
- Overflow risk: medium

### Slide 4: 相互作用記述子の発見・較正と未知の人間への適応

- Title: 相互作用記述子の発見・較正と未知の人間への適応
- Takeaway: パートナーで協調が変わるのはなぜか, 未知の人間に対してどう適応するか. 人間・エージェント・文脈の組み合わせから生じる相互作用記述子を発見・較正し, 未知の人間に適応する
- Layout hint: content (上: 中心命題, 下: Stage 1 → 2 → 3 のフロー図)
- Asset: `assets/img/slide4_stage_flow.svg` (Stage 1: エージェント同士で記述子を発見 → 相互作用記述子アーカイブ / Stage 2: 人間-エージェント較正で較正されたアーカイブを得る / Stage 3: 未知の人間への適応. ハウススタイル準拠の SVG. 画像生成版も別途検討)
- Content:
    - 観察 (Slide 3) から導かれる問い: なぜパートナーで協調が変わるのか, 未知の人間に対してどう適応するか
    - 中心命題:
        - 人間・エージェント・文脈の**組み合わせ**が相互作用記述子を生む
        - 主観的な品質は人間の知覚に依存するため, 人間ごとに最適な様式が異なる
        - 未知の人間に適合する様式を発見・較正・適応する
    - 研究のロードマップ:
        - Stage 0: 既存コーパスでの小型検証
        - Stage 1: エージェント同士の探索による相互作用記述子の発見
        - Stage 2: 人間-エージェント較正
        - Stage 3: 未知の人間への適応
    - 口頭補足: 人の協働傾向には観測される行動・安定した傾向・一時的な状態の三層がある. パートナーで変わるのは主に観測行動と一時状態
- Overflow risk: medium

### Slide 5: 協働エージェント FuzzyDPT-Agent

- Title: 協働エージェント FuzzyDPT-Agent
- Takeaway: 相互作用を実空間で研究するにはリアルタイム協調できるエージェントが必要. 段階的な検証で設計知見を蓄積し, ファジィを用いた連続的な S1 と非同期な S2 を組み合わせる現行設計に至った
- Layout hint: two-column (左: 設計動機 + 検証経緯 + 現行構成の要点, 右: アーキテクチャ図)
- Asset: `assets/img/fuzzydpt_architecture_latest.drawio.svg`
- Content:
    - 設計動機 (2 行): LLM は遅く, FSM は離散的. 連続的でリアルタイムな協調行動と高次推論の両立が必要
    - 段階的検証 (本文 1 段落, 学会名は伏せる):
        - FIS 単体: GUI 共有操作タスクでリアルタイム協調を実現. LLM による FIS ルール編集も確認
        - FCM/FIS + 軽量 VLM: S1 の 100 Hz 行動生成を実現. 軽量 VLM では状況判断が不十分で, 非同期 LLM の必要性を確認
    - 現行設計の要点:
        - S1 (リアルタイム経路): ファジィ認知マップ (FCM) で動作の重み付け → ファジィ推論 (FIS) で動作の評価 → 合成して連続的な行動を生成
        - S2 (非同期な補助層): S1 の状態に応じて起動し, 推論・誘導・改修の 3 種類のワーカーで S1 を補助
- Overflow risk: medium (要点に絞り図で見せる)

### Slide 6: 協調タスク環境における性能評価

- Title: 協調タスク環境における性能評価
- Takeaway: 2 プレイヤーがカーソルを共有操作する協調タスクで, FuzzyDPT-Agent 同士の協調プレイ性能を評価した
- Layout hint: two-column (左: 実験設計 + タスク画面 (小), 右: 結果)
- Asset: `assets/img/coplace_gui_field_screenshot.png` (小サイズ, 実験設計の下に配置), 結果の図表 (ユーザー提供)
- Content:
    - 実験環境: 2 プレイヤーがカーソルを共有操作する協調タスク (本文中で「CoPlace」と一度だけ言及)
    - 条件: FuzzyDPT-Agent 同士での協調プレイ
    - 結果: (ユーザーが具体的数値・図を提供)
- Overflow risk: medium

### Slide 7: テーマ 01-02 (8) との接続

- Title: テーマ 01-02 (8) との接続
- Takeaway: 01-02 (8) の「相互作用を考慮した姿勢予測」に対し, 本研究で培った主観評価設計と被験者実験設計の経験を持ち込んで貢献する
- Layout hint: content (上: 01-02 (8) の課題, 下: 持ち込む経験を主観評価・実験設計を中心に)
- Asset: 必要に応じて簡略図 (画像生成可)
- Content:
    - 01-02 (8) の課題: 映像から人の未来 3D 姿勢を予測. 精度を支えるのは 3 種の相互作用の読み取り (人-人・人-ロボット・人-環境)
    - 本研究の経験から持ち込めるもの (主観評価設計と被験者実験設計を中心に):
        - **主観評価設計**: 関節誤差等の予測精度に加え, 動きの自然さ・ロボット動作への心理的受容性を組み込む. 客観的な相互作用が主観的な知覚を介して効用に効くという完全媒介の考え方を, 受容性評価の設計に応用する
        - **被験者実験設計**: 人-ロボット相互作用シナリオの被験者実験の設計・実施・分析 (DAWN 長期就労 9 日間 6 名, 共有操作タスクの経験)
        - **実装面**: 深層学習モデルの実装と改造 (PyTorch, HuggingFace), LLM ベースのエージェント実装
    - 補足 (1 行): 相互作用情報を予測モデルにどう与えるか (相手姿勢・ロボ軌道・物体配置の取り込み方) は, 先方ベースラインを踏まえて相談したい
    - 口頭補足: ロボ制御情報の条件入力には ego-motion 補正とロボ存在の影響モデル化の 2 つの意味がありうる
- Overflow risk: medium

### Slide 8: まとめ

- Title: まとめ
- Takeaway: 観察 → 問い → 機構 → 接続の一貫した流れ. 相互作用記述子の研究で培った視点と経験を, 01-02 (8) の姿勢予測に持ち込む
- Layout hint: content (closing variant)
- Content:
    - 観察: パートナーによって協調が変わる (修論)
    - 問い: 相互作用記述子の発見・較正と未知の人間への適応 (博士研究の中心命題)
    - 機構: FuzzyDPT-Agent によるリアルタイム協調 (段階的検証 + 現行設計)
    - 接続と貢献: 01-02 (8) の姿勢予測に対し, 評価設計と実験設計の側面で貢献する
- Overflow risk: low

## Source Notes

- `/Users/hapticslab/Documents/nishi/lab/notes/20_Research/NOTE_人間–エージェント協調における相互作用特徴の発見・較正・適応_v4.md`
- `/Users/hapticslab/Documents/nishi/lab/experiment/2023_Master_Thesis/src/main.pdf`
- `/Users/hapticslab/Documents/nishi/lab/decks/decks/2026/02-20-midterm-examination/slide.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/85_Tasks/TASK-99 NEC 面談 (01-02 サイバーフィジカルインテリジェンス研).md`
- `/Users/hapticslab/Documents/nishi/lab/notes/50_Profile/Skills.md`
- `/Users/hapticslab/Documents/nishi/lab/notes/50_Profile/Activities.md`
