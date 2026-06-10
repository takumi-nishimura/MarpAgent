# Outline

- Source brief: brief.md
- Generated: 2026-06-10
- Target slide count: 6（タイトル含む）
- Template fidelity: パナソニック フォーマット1（研究背景 → 具体的な取り組み → 考察・今後の展望）に準拠．「自身の強み」はフォーマット2要素のため独立スライドを置かず本文に織り込む
- Section headers: 「取り組み①②」のような連番ヘッダーは使わず，内容を表す見出しにする
- Future arc: 蓄積（協調スタイルを集める＝combine-accumulate）→ 適応（集を使って相手に合わせる＝ai-adapts）の順で展開

## Deck Intent

- Audience summary: パナソニックOJT書類選考の採用担当・現場研究者．第1希望は「人の暗黙知を取り込み再現するAIエージェント」
- Core message: 人の意図・感情・暗黙知を技術へ写し取り，人が主体性を保ったまま心地よく協調するAIエージェントを，実証から構想まで一貫して設計・実装できる研究者である
- Must-use assets:
    - `assets/img/portrait.jpg` — 本人の顔写真（タイトル）
    - `assets/img/portfolio.png` — 実研究のモンタージュ（タイトル横帯）
    - `assets/img/fusion-system.png` — 2操作者→1台のロボット（GUI融合操作，背景）
    - `assets/img/fit-varies.png` — 合う協調は人それぞれ（着想）
    - `assets/img/combine-accumulate.png` — 試す→集める→蓄積＝協調スタイル集（展望：蓄積）
    - `assets/img/ai-adapts.png` — 相手を知る→選ぶ→AIが変わる（まとめ：適応）
    - Mermaid×1 — 階層協調アーキ（System2/System1/System0）
- Strengths woven in (no dedicated slide): 実装力＝背景でGUI融合システムを自作・DAWN実証／遂行力＝長期実証を完遂／観察力＝仕組みで操作体験を言語化し評価指標化
- Forbidden patterns: 専門用語の羅列／フォント縮小／枚数稼ぎ／競合他社名の露出／誇張

## Slide Plan

### Slide 1: ヘッダー（タイトル）

- Title: 意図・感情の推測に基づき動的に協調する共有操作AIエージェント
- Sub: 名古屋工業大学大学院 触覚学研究室（田中由浩研究室）博士後期3年 ／ 西村 匠生
- Tagline: 「人が主体性を保ったまま，心地よく協調する」
- Takeaway: 研究テーマ・所属・氏名を一目で（フォーマット1ヘッダー兼）．顔写真＋ポートフォリオ帯で人物と実績を即提示
- Layout hint: title
- Asset: `assets/img/portrait.jpg`（氏名横に円形）＋ `assets/img/portfolio.png`（下に横帯）
- Overflow risk: medium（要素が多いので余白厳守）

### Slide 2: 研究背景

- Title: 研究背景 — アバター遠隔就労の可能性と「協創」
- Takeaway: アバターは遠隔就労を実現したが定型業務中心．自ら開発した「GUI融合操作」で創造的な協働＝協創を実証した
- Points: OriHime等による遠隔就労／定型業務という壁／GUI融合操作（カーソル共有で暗黙的な意思疎通・操作分担）＝申請者が自作／分身ロボットカフェDAWNで社会実装・実証（実装力・遂行力を暗に示す）
- Layout hint: two-column（左テキスト・右に system 図）
- Asset: `assets/img/fusion-system.png`
- Overflow risk: medium

### Slide 3: 着想に至った経緯

- Title: 着想 — 実証で見えた課題から
- Takeaway: 実証の2課題から「1人をAIに置き換え，人どうしが互いを気づかうふるまいをAIにも写し取る」着想に至った
- Points: 課題①常時2人で運用コスト高／課題②相性依存のペア作成が属人的・最適化困難（合う協調は人それぞれ）／着想＝1人をAIエージェントに置換／人の協創に宿る「相手を気づかい，関わり方を変えるふるまい」をAIにも写し取る／狙いは心的充足（意欲的な操作者にはあえて支援を控え達成感を引き出す）
- Note: 「与える」は不使用 → 「写し取る／再現する／持たせる」
- Layout hint: two-column（左テキスト・右に fit-varies 図）
- Asset: `assets/img/fit-varies.png`
- Overflow risk: medium

### Slide 4: エージェントの仕組み

- Title: エージェントの仕組み — LLM×ファジィの階層協調
- Takeaway: 高次推論(LLM)と高速反射(ファジィ)を階層統合し，心的状態を推定して協調を動的に調整．被験者実験で多角評価
- Points: System2(LLM)=意図推定・長期計画・対話／System1(VLM)=視覚×対話でサブゴール計画／System0(ファジィ)=低遅延で滑らかなGUI操作／心的状態(意図・感情・性格)を推定し協調を動的調整，被験者実験(主体感・納得感・介入頻度)で心的充足を評価
- Layout hint: content（Mermaidアーキ図＋簡潔な箇条．溢れたら two-column 化）
- Asset: Mermaid（System2 → System1 → System0 の縦スタック）
- Overflow risk: medium-high（4箇条＋図．溢れたら 評価 を次へ）

### Slide 5: 今後の展望 — 協調スタイルを蓄積する

- Title: 今後の展望 — 協調スタイルを蓄積する
- Takeaway: AI同士の協調を大量に試し，可解釈な「協調スタイル集」を蓄積．人との協調で確かめる
- Points: AI同士で多様な組み合わせを試す／協調結果を集めて可解釈な特性として蓄積＝協調スタイル集（archive）／人との協調データで転移を較正／単一の正解を最適化せず，多様な協調の地図を作る
- Layout hint: two-column もしくは content（「試す→集める→蓄積」を図で提示．Mermaidは使わない）
- Asset: `assets/img/combine-accumulate.png`
- Overflow risk: low

### Slide 6: まとめ — 相手に適応し，経験を次へ

- Title: まとめ — 相手に合わせて適応する
- Takeaway: 蓄積した協調スタイル集から相手に合う関わり方を選び，その人に望ましい協調へ適応しWell-beingを高める．これがパナの暗黙知エージェントの延長
- Points: 蓄積した集から相手に合う関わり方を選び適応（先回り／確認／見守りを切替）／一貫した問い＝人の意図・勘・暗黙知を技術へ写し取り，人が主体性を保つ協調／パナソニックOJT「人の暗黙知を取り込み再現するAIエージェント」への適合／CTA=暮らしや現場に近い貴社で，誰かの経験を次の人の力に変える技術へ育てたい
- Layout hint: two-column（左に適応＋まとめ・右に ai-adapts 図）または content（closing variant）
- Asset: `assets/img/ai-adapts.png`
- Overflow risk: medium（適応＋まとめを1枚に．溢れたら CTA を簡潔化）

## Source Notes

- Source 1: パナソニック.md（チャレンジシート）
- Source 2: 2025_DC2_naiyo.pdf（背景・着想・取り組み・強み）
- Source 3: NOTE_LLM協調シミュレーション...md（今後の展望）
- Source 4: summary_ojt_sum.pptx フォーマット1
- 画像出典: companies/attachments のイラスト（中立名にリネーム）＋ repo assets/img の実写真・顔写真
