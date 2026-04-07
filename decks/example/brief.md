# Presentation Brief

- Generated: 2026-04-07

## Audience

- Primary audience: エンジニア, テクニカルライター, プレゼン資料を頻繁に作成するチームリーダー
- Existing knowledge: Markdownの基本記法を理解している. スライド作成の経験あり
- What they care about: スライド作成の効率化, 品質の担保, デザインの一貫性

## Duration

- Total talk length: 10 min
- Target slide count: 10–12

## Core Message

- One-sentence takeaway: MarpAgentは brief → outline → slide の構造化ワークフローと自動バリデーションで, Markdownだけで高品質なプレゼンを実現するツールである
- Supporting points:
    - 3ステージワークフロー (brief → outline → slide) で構成が破綻しない
    - ビジュアルオーバーフロー検出により, 本番前に表示崩れを防止できる
    - Claude Code スキル統合で, AIアシストによるスライド作成が可能

## Audience Action

- What the audience should think, decide, or do after the talk: MarpAgentを自分のプロジェクトで試してみようと思い, `npx marpx -n` でデッキを作り始める

## Required Sections

1. MarpAgentとは何か — 概要と解決する課題
2. ワークフロー — brief → outline → slide の3ステージ
3. Lab テーマとコンポーネント — デザインシステムの紹介
4. バリデーション — オーバーフロー検出と品質ゲート
5. AI統合 — Claude Code スキルによるアシスト
6. デモ / 始め方 — CLIコマンドとクイックスタート

## Must-Use Assets

- `assets/img/laser-pointer-demo.png` — プレゼンモードのレーザーポインタ機能
- `assets/img/overview-mode.png` — オーバービューモード (サムネイルグリッド)
- `shared/logos/marp-logo.svg` — Marp ロゴ (タイトルスライドで使用)

## Forbidden Patterns

- Topics, claims, tones, layouts, or visuals to avoid: 他ツールとの直接比較や批判. 過度に技術的な実装詳細. テキストの縮小やフォントサイズの極端な変更

## References

- Source 1: MarpAgent README.md
- Source 2: MarpAgent CLI (bin/marpx.js)

## Notes for Authoring

- State uncertain facts explicitly.
- Prefer one idea per slide.
- Split dense material instead of shrinking text.
