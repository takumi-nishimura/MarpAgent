# Presentation Brief

- Generated: 2026-06-24
- Revised: 2026-06-25 (v4 方向性中心の構成へ全面改訂)
- Format: NEC 研究インターン面談 (Zoom, 1h) の冒頭 15 分の研究紹介．後半は討議とインターンシップ諸条件の意識合わせ

## Audience

- Primary audience: NEC サイバーフィジカルインテリジェンス研究所 池田浩雄氏 (テーマ 01-02 担当)
- Theme fit: テーマ 01-02「人・モノ・環境の認識・予測と制御対象の解析」のうち，サブテーマ (8) 人体姿勢予測 (映像から人の未来の 3D 位置・姿勢を予測．**人と人・人とロボット・人と周辺環境の相互作用**を考慮)
- Existing knowledge: CV / 深層学習 / マルチモーダル LLM の専門家．HRI・アバター・共有操作・身体融合は専門外．FuzzyDPT・CoPlace の詳細は知らない
- What they care about: (1) 研究者としての一貫した問題意識，(2) 実装力 (PyTorch・深層学習・実験設計)，(3) サブテーマ (8) の「相互作用予測」軸で独自の視点を持っているか

## Duration

- Total talk length: 15 分 (口頭発表)
- Target slide count: タイトル含め 9 枚．1 枚 1.5 分前後

## Core Message

- One-sentence takeaway: 修士研究の実証実験で「同じシステムでもペアの組み合わせで協調パターンが異なる」ことを観察した．博士研究ではこの「なぜ組み合わせで変わるのか」を中心命題に据え，相互作用特徴のモデル化 (発見・較正・適応) に取り組んでいる．この「相互作用を読む」視点を，01-02 サブテーマ (8) の姿勢予測に持ち込み貢献したい
- Supporting points:
    - **観察**: 修士研究 DAWN カフェ実証実験で，同一システムにおける協調パターンの多様性を確認 (操作軌跡・介入頻度・心理指標がペアごとに異なる)
    - **問い**: 個体のプロファイルでなく，人間 h × エージェント j × 文脈 c の組み合わせが相互作用記述子 相互作用特徴 を生む → これをモデル化する
    - **機構**: 相互作用を実空間で研究するために，人間とリアルタイムに協調できるエージェント機構 (FuzzyDPT-Agent) を段階的に検証・設計してきた
    - **01-02 接続**: 「相互作用を考慮した姿勢予測」は，v4 の「相手を読む」と同型の問題構造

## Audience Action

- 「西村は修士から一貫して相互作用の多様性に関心を持ち，それをモデル化する博士研究の方向性を持っている．実空間でのリアルタイム協調エージェントの実装・検証経験もある．01-02 サブテーマ (8) の相互作用予測に独自の視点を持ち込める」と判断する
- 討議でサブテーマ割当やデータセット・スコープを掘り下げる土台ができる

## Narrative Arc

```
観察 (事実) → 問い (なぜ？) → 方向性 (v4) → 機構 (FuzzyDPT) → 接続 (01-02)
```

1. **Slide 2-3**: 事実から入る．DAWN 背景 → 修論データで「ペアによって変わる」
2. **Slide 4**: 事実から問いへ．v4 の中心命題 (相互作用特徴 のモデル化)
3. **Slide 5-7**: 問いを解くための道具立て．段階的検証 → FuzzyDPT 設計 → CoPlace 結果
4. **Slide 8**: 01-02 との接続．インターンでの展望を含む
5. **Slide 9**: まとめ

## Slide Plan

### Slide 1: タイトル

- Title: (メインタイトルは outline で決定)
- Layout hint: title
- Asset: `assets/img/portrait.jpg`
- Content: メインタイトル + サブ (NEC 研究インターン面談 / 2026-06-26 / テーマ 01-02) + 名工大大学院 触覚学研究室 D3 西村匠生
- Overflow risk: low

### Slide 2: 研究背景: アバターロボットによる遠隔協調就労

- Takeaway: アバターロボットによる遠隔就労は実現したが定型業務中心．2 人で 1 台のロボットを GUI で共有操作する方式を自作し，DAWN カフェで社会実装した
- Layout hint: two-column (左: テキスト，右: システム図 + DAWN 写真)
- Asset: `shared/img/collaborative_fusion_system.png` (中間審査から)，`assets/img/orycafe.jpg`
- Content:
    - アバターロボット (OriHime 等) による遠隔就労の実現
    - GUI 融合操作: 2 人の操作者が 1 台のロボットを共有操作
    - 分身ロボットカフェ DAWN で社会実装・実証 (短期 1 日 + 長期 9 日間，身体障害を有する計 6 名)
- Overflow risk: medium

### Slide 3: 同一システムにおける協調パターンの多様性

- Takeaway: DAWN 実証の長期実験データから，同一システム・同一タスクでもペアの組み合わせによって協調パターンが大きく異なることを確認した
- Layout hint: two-column (左: テキスト + 要点，右: 修論データの可視化)
- Asset: 修論 Fig 5.4 (ペアごとの操作軌跡可視化) を簡略化して使用．または `assets/img/fit-varies.png`
- Content:
    - 同一システム・同一タスクでもペアで操作パターンが異なる
    - 操作軌跡，クリック頻度，介入タイミングがペアごとに変化
    - 主観指標 (IOS, AWWL) もペア構成で異なる傾向
    - → 「相手によって協調が変わる」: 個体でなく組み合わせの問題
- Overflow risk: medium

### Slide 4: 相互作用特徴の発見・較正・適応

- Takeaway: 博士研究では「なぜ組み合わせで変わるのか」を中心命題に据える．人間 h × エージェント j × 文脈 c の組み合わせが相互作用記述子 相互作用特徴 を生むとモデル化し，これを発見・較正・適応する
- Layout hint: content (上: 中心命題，下: 構図 or Stage 0-3)
- Asset: v4 の基本構図を簡略化した図 (新規作成 or mermaid)
- Content:
    - 旧: エージェント j が記述子 x_j を持つ → 新: h, j, c の組み合わせが 相互作用特徴 を生む
    - 三層人間モデル: η^obs (観測), η^trait (安定特性), η^state (一時的状態)
    - Stage 0 (小型検証) → 1 (エージェント同士の探索・記述子発見) → 2 (人間-エージェント較正) → 3 (未知人間への適応)
- Overflow risk: high (情報量が多いため，構図を簡略化して口頭補足)

### Slide 5: リアルタイム協調に向けた段階的検証

- Takeaway: 相互作用を実空間で研究するには，人間とリアルタイムに協調できるエージェント機構が必要．FIS 単体 (JSAI 2025) → FCM/FIS + VLM (RSJ 2025) と段階的に検証し，知見を蓄積した
- Layout hint: two-column (左: JSAI 検証，右: RSJ 検証)
- Asset: 中間審査の動画スクリーンキャプチャ or 図，`assets/img/fuzzydpt_overview.png` (中間審査)
- Content:
    - JSAI 2025: FIS 単体で協調タスク遂行可能か → 実現確認，LLM による FIS ルール編集も確認
    - RSJ 2025: FCM/FIS + 軽量 VLM (5Hz) の DPT 構成 → S1 の 100Hz 行動生成を確認，ただし軽量 VLM では状況判断が不十分 → 非同期 LLM の S2 が必要
    - これらの知見を踏まえて現行 FuzzyDPT-Agent を設計
- Overflow risk: medium

### Slide 6: 提案手法: FuzzyDPT-Agent

- Takeaway: 段階的検証の知見を統合した現行アーキテクチャ．FCM/FIS による高速な S1 + 非同期 LLM による S2 で，リアルタイム性と推論能力を両立
- Layout hint: two-column (左: 特徴リスト，右: アーキテクチャ図)
- Asset: `assets/img/fuzzydpt_architecture_latest.drawio.svg`
- Content:
    - 技術的課題 (2 行): LLM は遅い，FSM は離散的 → FCM/FIS + 非同期 LLM で解決
    - S1 (FCM/FIS): 連続的な状況評価 + ルールベースの行動生成 (100Hz)
    - S2 (LLM): ToM による意図推定，Planner による方針誘導 (非同期)
    - S1↔S2 連携: 不確実性指標に基づく適応的 S2 起動
    - L0 適応: 報酬に基づく FCM/FIS パラメータのオンライン更新
- Overflow risk: high (要点に絞る)

### Slide 7: CoPlace 環境での協調性能評価

- Takeaway: FuzzyDPT-Agent の CoPlace 環境 (エージェント同士) での協調プレイ結果
- Layout hint: two-column (左: 実験設計，右: 結果)
- Asset: `assets/img/coplace_gui_field_screenshot.png`，結果の図 (ユーザーが用意)
- Content:
    - 実験設計: CoPlace 環境，エージェント同士の協調プレイ
    - 結果: (ユーザーが具体的な数値・図を提供)
- Overflow risk: medium (結果の内容次第)

### Slide 8: テーマ 01-02 との接続: 相互作用を考慮した人体姿勢予測

- Takeaway: 01-02 (8) の「相互作用を考慮した姿勢予測」は，v4 の「相手を読む」と同型の問題構造．インターンではこの視点を持ち込む
- Layout hint: content
- Content:
    - 01-02 (8): 映像から人の未来 3D 姿勢を予測，鍵は 3 種の相互作用 (人-人 / 人-ロボット / 人-環境)
    - 本研究との対応: 相互作用特徴 のモデル化 = 相互作用条件付き予測
    - インターンでの展望 (2-3 行): 既存予測モデルに相互作用条件を組み込む拡張 + 相互作用品質の評価指標設計
- Overflow risk: medium

### Slide 9: まとめ

- Takeaway: 修士の観察から博士の問いへ，そしてリアルタイム協調の機構を構築してきた．この「相互作用を読む」一貫した視点を 01-02 に持ち込む
- Layout hint: content (closing variant)
- Content:
    - 観察: 同一システムでもペアの組み合わせで協調が変わる
    - 問い: 相互作用特徴 相互作用特徴 の発見・較正・適応
    - 機構: FuzzyDPT-Agent によるリアルタイム協調の実現
    - 接続: 01-02 (8) の相互作用予測に同じ視点を持ち込む
- Overflow risk: low

## Must-Use Assets

- 既存 deck から流用 (再描画なし)
    - `assets/img/portrait.jpg` (表紙)
    - `assets/img/fusion-system.png` (GUI 融合操作概要)
    - `assets/img/orycafe.jpg` (DAWN カフェ)
    - `assets/img/fuzzydpt_architecture_latest.drawio.svg` (FuzzyDPT 全体構成)
    - `assets/img/coplace_gui_field_screenshot.png` (CoPlace タスク画面)
- 中間審査 deck からシンボリックリンクまたはコピー
    - `fuzzydpt_overview.png` (FuzzyDPT 概観，スライド 5 用)
- 新規作成または修論から抽出
    - 修論 Fig 5.4 相当の可視化 (ペアごとの協調パターン差異)
    - v4 基本構図の簡略化図 (mermaid or SVG)
- ユーザーが用意
    - CoPlace での FuzzyDPT 結果の図表

## Forbidden Patterns

- 過剰な専門用語の羅列 (HRI 専門家ではない聴き手を想定)
- 数式の羅列 (直感的に伝える．v4 の数式は口頭説明に留める)
- 01-02 のサブテーマを「全部やりたい」と言う (フォーカスを示す)
- インターン条件 (期間・場所・報酬) を発表中で言及 (後半の討議に回す)
- FuzzyDPT を研究の中心メッセージにする (中心は v4 の問い．FuzzyDPT はそれを実現する機構)
- 検証済みの範囲と未検証の範囲を曖昧にする (JSAI/RSJ は部品検証，現行設計は CoPlace で検証中)
- Co-Embodiment への言及 (計画段階のため含めない)

## References

- `/Users/hapticslab/Documents/nishi/lab/notes/20_Research/NOTE_人間–エージェント協調における相互作用特徴の発見・較正・適応_v4.md`
- `/Users/hapticslab/Documents/nishi/lab/experiment/2023_Master_Thesis/src/main.pdf` (修論データ)
- `/Users/hapticslab/Documents/nishi/lab/decks/decks/2026/02-20-midterm-examination/slide.md` (中間審査スライド)
- `/Users/hapticslab/Documents/nishi/lab/notes/85_Tasks/TASK-99 NEC 面談 (01-02 サイバーフィジカルインテリジェンス研).md`
- `/Users/hapticslab/Documents/nishi/lab/notes/30_Projects/2026_05_JobHunting28/attachments/2026インターンテーマ説明資料_20260423.pdf` (テーマ 01-02 詳細)

## Notes for Authoring

- 物語の軸は「観察→問い→方向性→機構→接続」．全スライドがこの流れのどこにいるかが明確であること
- v4 の数理的詳細 (完全媒介，識別性) はスライドに載せない．口頭で「同じ客観的な協調でも人によって知覚が異なる → だから人ごとの適応が必要」程度に触れる
- FuzzyDPT は「v4 の問いを実空間で検証するために必要な機構」として位置づける
- スライド 3 が物語の起点．修論データの「ペアで変わる」事実が聴き手の関心を引く鍵
- 各スライドは文字量を絞り図を主役に
