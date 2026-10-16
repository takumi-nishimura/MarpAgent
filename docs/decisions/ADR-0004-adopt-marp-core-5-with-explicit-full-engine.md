---
id: ADR-0004
title: "Adopt Marp Core 5 with explicit full engine"
type: decision
status: accepted
date: "2026-10-15"
authors:
  - codex
scope:
  - package.json
  - marp.config.js
  - scripts/mermaid-plugin.js
  - src/mermaid-render.js
  - themes/src/_shared/_code.css
  - themes/src/_shared/_typography.css
tags:
  - dependencies
  - rendering
depends_on: []
supersedes: []
issues: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands:
    - npm run marpx -- --theme
    - npm test
    - MARP_AGENT_REQUIRE_VISUAL=1 npm run validate:fixtures
    - npm run test:e2e:strict
---

# Adopt Marp Core 5 with explicit full engine

## Context and Problem Statement

ユーザーはMarp upstreamの公開済み最新版へ対応し，プレリリースのCore 5系も取り込むことを指定した．2026-10-15時点の対象はCLI 4.5.1，Core 5.0.2，Marpit 3.2.3である．Core 5では既定のエントリポイントが軽量版となり，数式・ハイライト・Mermaidはプラグインとoptional peer dependenciesへ分離された．

CLI 4.5.1は利用者が導入したCore 5を優先するが，内部にはCore 4も依存として持つ．作業ディレクトリからの自動解決だけに頼ると，CLIと内部のページ解析が異なるエンジンを利用しうる．またCore 5はMermaid fenceを専用tokenへ変換するため，従来のfence rendererだけを拡張しても図中数式とキャッシュが適用されない．

## Decision Drivers

* CLIと内部処理で同じCore 5の機能を利用する．
* KaTeX・MathJax，非表示スライド，独自サイズ，日本語の改行を維持する．
* Mermaidの日本語ラベル・複数行レイアウト・図中数式・キャッシュを維持する．
* 共通テーマの既存配色をShikiへ移す．

## Considered Options

### Option 1：フル機能版を明示的に生成する

* 利点：作業ディレクトリやCLI内のfallback依存から独立して，全描画機能を揃えられる．
* 欠点：全optional peer dependenciesを明示的に導入するため，依存数は増える．

### Option 2：軽量版と必要なプラグインを個別に構成する

* 利点：利用機能を絞れる．
* 欠点：CLIの既定構成と独自構成の対応を継続して管理する必要がある．

## Decision Outcome

### Chosen Option

Option 1を採用する．`marp.config.js`で`@marp-team/marp-core/full`から必ず新しいエンジンを生成し，内部処理のimportも同じエントリポイントへ揃える．CLIのCore 4依存をoverrideで書き換えず，設定された描画エンジンの一致を動作テストで確認する．

Core 5のoptional peer dependenciesを直接宣言する．beautiful-mermaid 1.1.3の公開APIをES Modulesとして読み込み，日本語幅計算と複数行レイアウトをupstreamへ任せ，旧0.1系のソースパッチを削除する．通常のMermaid fenceは専用tokenのrendererでも独自拡張を適用し，属性付きfenceはupstreamの処理へ委譲する．

コード配色は`.hljs-*`から`--marp-shiki-*`へ移し，既存のdesign tokensを参照する．

Core 5が埋め込むブラウザ用scriptとMermaidのstyleをBudouXの処理から保護する．MathJax 4の行内SVGにはTailwindのblock表示を上書きし，Shikiの強調行にはテーマ側で背景を指定する．

### Scope

依存とlockfile，設定エンジン，ページ解析，Mermaid拡張，共通テーマ，関連テストと診断．

### Non-goals

Node.jsのバージョン方針変更，独自のoverviewの置換，無関係な依存の一括更新．

## Consequences

### Positive

* リポジトリ外からの実行でもCore 5の数式・Shikiを利用できる．
* Mermaidライブラリの内部ソース構造への依存がなくなる．
* PDF・PPTX・HTML・画像と内部解析の描画構成が揃う．

### Negative

* Core 5.0.2は安定版タグではなくリリース候補である．更新時は回帰テストを通して採用する．
* 利用者が独自に追加した`.hljs-*`の配色指定はShiki変数への移行が必要である．

### Neutral

* CLIが宣言するCore 4もlockfileに残るが，このリポジトリの設定エンジンはCore 5を使う．

## Validation

* `tests/unit/marp-engine.test.js`で内部エンジンとリポジトリ外のCLI実行について，Shikiの行強調，KaTeX／MathJax，図中数式を確認する．
* `tests/unit/mermaid-render.test.js`で日本語幅，明示的な改行，数式とキャッシュを確認する．
* `tests/e2e/core5-rendering.spec.js`でlab・muji・toshibaの明暗配色をブラウザ上で確認する．
* `fixtures/core5-slide.md`を実描画validatorとPDF・PPTX・HTML・画像の出力テストで使用する．
* 2026-10-15の検証結果：単体テスト275件，実描画fixture 14件，E2E 28件が成功した．検証用ブラウザは`PLAYWRIGHT_BROWSERS_PATH=/tmp/marpagent-playwright`へ導入し，ブラウザを使うコマンドにはこの変数と`CHROME_NO_SANDBOX=1`を指定した．

## Related Records

* [Core 5 migration guide](https://github.com/marp-team/marp-core/blob/v5.0.2/docs/migration-v5.md)
* [Core 5.0.2 release](https://github.com/marp-team/marp-core/releases/tag/v5.0.2)
* [CLI 4.5.1 engine resolution](https://github.com/marp-team/marp-cli/blob/v4.5.1/src/engine.ts)
