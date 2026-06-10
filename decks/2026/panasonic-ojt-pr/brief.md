# Presentation Brief

- Generated: 2026-06-10
- Format: パナソニック「自己PR資料 作成要領」フォーマット1（研究テーマ型）に準拠．提出PDF（口頭発表ではなく読ませる資料）

## Audience

- Primary audience: パナソニックグループ 夏季OJTインターンシップ 書類選考の採用担当および現場研究者
- Theme fit: 第1希望「人の暗黙知を取り込み再現するAIエージェントシステムの設計・開発・評価」（HD DX・CPS本部 AIソリューション部）
- Existing knowledge: 技術系だが必ずしも専門（HRI/テレオペ/協調エージェント）は一致しない読み手．AI/LLMの基礎は理解
- What they care about: 研究の社会的意義，本人の独創性，実装力と遂行力，自社テーマへの適合

## Duration

- Format: 提出PDF資料（自己ペースで閲覧）
- Target slide count: タイトル含め 6–7 枚（フォーマット1は1枚以上．多くても加点なしのため簡潔・余白重視）
- Size constraint: 10MB以内（画像は縮小・圧縮して埋め込む）

## Core Message

- One-sentence takeaway: 人の意図・感情・暗黙知を技術へ写し取り，人が主体性を保ったまま心地よく協調できるAIエージェントを，実証から構想まで一貫して設計・実装できる研究者である
- Supporting points:
    - GUI融合操作（2人で1台のロボットを協調操作）を開発し，分身ロボットカフェDAWNで社会実装・実証した実装力と観察力
    - 実証で見えた課題（運用コスト・相性依存のペア作成）から「1人をAIに置換し，相方を慮る対人的行為を与える」着想に至った物語
    - LLM×ファジィの階層協調アーキテクチャを設計し，心的状態推定に基づく動的協調を被験者実験で多角評価
    - 今後は協調行動特性空間の構築と適応協調パートナーへ発展させる構想

## Audience Action

- What the audience should think, decide, or do after the talk: 「この学生はパナソニックの暗黙知エージェントテーマに最適だ，オンライン面談に進めたい」と判断する

## Required Sections

1. ヘッダー（研究テーマ名・大学/所属・氏名）＝フォーマット1ヘッダー
2. 研究背景・意義（アバター遠隔就労の可能性と壁，協創）
3. 着想に至った経緯（実証の2課題 → AI置換＋相方を慮る能力）
4. 具体的な取り組み（LLM×ファジィ階層協調アーキ＋心的状態推定＋評価）
5. 今後の展望（協調行動特性空間と適応協調パートナー）
6. 自身の強み＆まとめ（観察力・実装力・遂行力 → パナ暗黙知テーマへ接続）

## Must-Use Assets

- `shared/img/collaborative_fusion_system.png` — 2操作者→1台のロボット（GUI融合操作システム図，背景）
- `shared/img/分身ロボットカフェDAWN.jpg` — DAWN公開実証（社会実装の証跡）
- `assets/img/two-bodies-fusion.png` — 2人で→融合→1つの身体（着想の概念図．toshiba-pr-kf1-two-bodies.png を流用，中立名にリネーム）
- Mermaid図2点 — 階層協調アーキ（System2/System1/System0），今後構想パイプライン（archive→較正→online適応）

## Forbidden Patterns

- 専門用語の過剰な羅列，読み手の専門一致を前提にした説明
- フォントの縮小や枚数稼ぎ（要領で「多くても加点なし」）
- 競合他社名の露出（流用画像は中立名にリネーム）
- 誇張・未達成事項の既成事実化．陶芸/身体融合の暗黙知モデル化は橋渡し程度に留め，主役は共有操作エージェント

## References

- Source 1: パナソニック.md（チャレンジシート／応募テーマ，2026_05_JobHunting28）
- Source 2: 2025_DC2_naiyo.pdf（研究背景・着想・取り組み・強み）
- Source 3: NOTE_LLM協調シミュレーションに基づく協調行動特性空間の構築と適応的エージェント設計.md（今後の展望）
- Source 4: summary_ojt_sum.pptx フォーマット1（提出フォーマット要領）

## Notes for Authoring

- 各ページは自己完結・読ませる文量（口頭発表より厚め）．ただし validator のハード上限（本文600字・10行・トップ12箇条）を厳守し，超えたら分割
- 図は縮小版を deck の assets/img に置き，PDF を10MB以内に収める
- State uncertain facts explicitly. Prefer one idea per slide.
