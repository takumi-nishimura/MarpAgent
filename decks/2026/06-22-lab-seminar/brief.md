# Presentation Brief

- Generated: 2026-06-17

## Audience

- Primary audience: 研究室全体（他グループ含む）
- Existing knowledge: ロボティクス・HRI の基礎知識あり．自分以外は FuzzyDPT の詳細を知らない
- What they care about: 自分の研究方向性，今後どこへ向かうか

## Duration

- Total talk length: ポスターセッション形式（自由閲覧 + 質疑）
- Target slide count: 8-10 pages (A4 横，印刷．8枚を少し超えてよい)

## Core Message

- One-sentence takeaway: FuzzyDPT は連続質量場に基づく認知アーキテクチャであり，S1 の graded な行動生成と S2 LLM Worker によるパートナー意図推定を組み合わせて協調行動を実現する．次段階では人間との共有身体実験で，パートナーの意図を推定した協調が成立するかを検証する
- Supporting points:
    - FuzzyDPT の S1 は FCM (Decision) + FIS (Execution) + Choquet 質量場合成 + 動的 readout から成り，graded な行動生成を行う
    - S1-only held-out 評価で，全体 score の絶対優位は示されないが，stress 条件での target mismatch 低減（moderation HL 4.0, p<0.0001）が一貫して残る
    - 次段階: Contextual Co-Embodiment（人間-AI 対称共有身体）で，S2（LLM による人間意図推論・文脈理解）を含む完全な fuzzy-dpt が，人間とのパートナーの意図を推定した協調を実現できるかを検証

## Audience Action

- FuzzyDPT の設計思想（S1 質量場 + S2 意図推定）を理解し，Co-Embodiment 実験での検証方針にフィードバックをもらう

## Required Sections

1. 背景・問題設定（アバターロボット共有操作，AI 協調エージェントの課題，DPT アーキテクチャと crisp S1 の限界）
2. 提案手法: FuzzyDPT-Agent アーキテクチャ（Perceptual → Decision FCM → Action FIS bank → Choquet mass-field composition → Dynamical readout + S2 LLM Workers）
3. 質量場合成と動的 readout の直感的説明（符号付き質量，Choquet 合成，gradient flow + pulse firing）
4. 実験設計: CoPlace 共有操作タスク，4 arms × 9 partner styles × 50 held-out seeds
5. 実験結果・考察: 主要アウトカム + target-selection signature + failure-tail + 何が言えて何が言えないか
6. 今後の研究方針 (1): Contextual Co-Embodiment（人間-AI 対称共有身体，S2 意図推定による協調）
7. 今後の研究方針 (2): LLM 協調行動特性空間（synthetic dyad → descriptor → measurement transfer）
8. まとめ

## Must-Use Assets

- assets/img/fuzzydpt_architecture_latest.drawio.svg（アーキテクチャ概念図，mass-field 経路）
- assets/img/coplace_gui_field_screenshot.png（CoPlace タスク環境）
- F1_primary_outcomes.png（arm × style 別 score）— analysis dir からコピー
- F3_substrate_delta.png（per-style substrate delta）— analysis dir からコピー
- F4_stress_buffering_mechanism.png（stress moderation + target mismatch 診断込み）— analysis dir からコピー
- Co-Embodiment 実験 UI スクリーンショット（coagency_pilot.png をコピー: タスク指示・物体・共有ハンド・条件が一枚で伝わる）+ システム構成の簡易図（認知層 fuzzy-dpt + 運動層 MPC + 融合 v_shared = 0.5(v_human + v_AI)）
- LLM 協調行動特性空間のフロー図（**新規作成が必要**: NOTE_v2 の Mermaid をベースに簡略化したブロック図．meta-control → LLM-LLM synthetic dyads → descriptor → Human-LLM transfer verification の流れ）

## Forbidden Patterns

- 「FuzzyDPT は全体的に DPT より優れている」と読める表現
- 数式の羅列（直感的な図解を優先，質量場は物理的比喩で説明）
- Robomech 論文時点の旧アーキテクチャ記述（proposal path, softmax policy）
- 未確定の実験結果を確定的に記述すること
- 速度差を機構的根拠として使うこと

## References

- /Users/hapticslab/Documents/nishi/lab/experiment/2026-02-expt-fuzzy-dpt/expt-fuzzy-dpt/packages/fuzzy-dpt/docs/architecture.md
- /Users/hapticslab/Documents/nishi/lab/experiment/2026-02-expt-fuzzy-dpt/expt-fuzzy-dpt/outputs/analysis/s1_mass_field_synthesis_codrive_ix_readout_new/report_ja.md
- /Users/hapticslab/Documents/nishi/lab/experiment/2026-06-expt-context-coembodiment/expt-context-coembodiment/docs/SPEC.md
- /Users/hapticslab/Documents/nishi/lab/notes/20_Research/NOTE_LLM協調行動特性空間と適応的エージェント設計_v2.md
- /Users/hapticslab/Documents/nishi/lab/notes/40_Writing/2026_02_Robomech/paper draft v4.md（背景・先行研究の文脈として）

## Notes for Authoring

- §2-3（手法）を詳しく: mass-field を物理的直感で説明する．「正の質量は attraction，負の質量は aversion」「readout は質量場上の damped particle」のように
- §5-7（結果・考察）を詳しく: 何が示されたか（stress moderation）と何が示されなかったか（全体優位）を正直に伝える
- stress-aligned target-selection signature の説明: partner の priority が厳しい条件で，fuzzy の target mismatch が相対的に下がる
- failure-tail は隠さない（seed 8008 等）
- 今後の方針は 2 軸: (1) Co-Embodiment: S2（LLM Infer + Steer）を含む完全な fuzzy-dpt で人間-AI 対称融合を実現し，パートナーの意図を推定した協調が成立するかを検証 (2) LLM 協調行動特性空間: synthetic dyad での measurement transfer
- A4 横 8 枚，印刷．カラー前提だがコントラストを確保する
