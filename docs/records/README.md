# Decision, Exploration, and Issue Records

このリポジトリでは，Structured MADRを基礎とする独自プロファイルで，採用判断をADR，試行と知見をXR，延期する実装作業をissue（ISS）として記録する．Markdownを正本とし，YAML frontmatterを機械可読メタデータとして用いる．

## ディレクトリ

```text
docs/
├── decisions/
│   ├── template.md
│   └── ADR-NNNN-short-title.md
├── explorations/
│   ├── template.md
│   └── XR-NNNN-short-title.md
├── issues/
│   ├── template.md
│   └── ISS-NNNN-short-title.md
└── records/
    └── README.md
.github/
├── records.py
└── workflows/
    └── validate-records.yml
```

issueは単一ディレクトリで管理し，`_closed/`のような移動先ディレクトリを作らない．閉鎖はfrontmatterの`status: closed`で表現する．

ADR／XRの運用補助コードと検証規則は`.github/records.py`へ集約する．リポジトリ直下に専用の`scripts/`，`schemas/`，Python packageを追加しない．

## ADR・XR・issueの使い分け

**ADR**は，将来のarchitecture，package境界，schema，公開API，実験条件，評価方法，主要ツールまたは運用方式へ影響する採用判断を記録する．

**XR**は，prototype，technical spike，benchmark，仮説検証，採用しなかった実装，一部だけ再利用可能な試行を記録する．結果が否定的または不確定でも，将来同じ試行を繰り返す可能性があるなら残す．

**issue**は，今すぐ実行しない実装可能な作業単位を記録する．完了条件（Acceptance criteria）が書ける粒度であること．判断の理由を将来参照するならADR，観測結果を将来参照するならXR，作業して終わるならissueに書き，1つの記録に混載しない．

## 作成

```bash
uv run .github/records.py new adr "Adopt typed channel arbitration"
uv run .github/records.py new xr "Evaluate flat rule aggregation"
uv run .github/records.py new issue "Fix login redirect loop"
```

作成時にauthorを埋める場合は`--author`を指定する．

```bash
uv run .github/records.py new xr "Evaluate flat rule aggregation" \
  --author implementation-agent
```

## 検証

```bash
uv run .github/records.py validate
```

`.github/records.py`はPEP 723 inline metadataを持つ．`uv`はPyYAMLとjsonschemaを一時環境へ解決するため，project dependencyと`uv.lock`は変更されない．

検証内容は次のとおり．

* YAML frontmatterの構文
* ADR／XR／ISS別メタデータ規則
* IDとファイル名の整合
* frontmatterのtitleとH1の整合
* 必須H2セクション
* 重複ID
* `depends_on`，`informs`，`evaluates`，`supersedes`，`issues`の参照整合と型制約
* `depends_on`，`evaluates`，`supersedes`の循環禁止
* superseded状態とincoming `supersedes`の一意性
* issueのlifecycle規則（`resolution`，`resolved`，`duplicate_of`）

## Relationship Type

frontmatterへ保存する正方向の関係は次の5種類とする．逆方向はCLIが推論する．

| 正方向 | 逆方向（CLI表示） | 制約 |
|---|---|---|
| `depends_on` | `required by` | ADR／XRからADR／XR，またはISSからISS．循環禁止 |
| `informs` | `informed by` | XRからADR |
| `evaluates` | `evaluated by` | XRからADR／XR．循環禁止 |
| `supersedes` | `superseded by` | 同じ記録型．循環禁止 |
| `issues` | `tracks` | ADR／XRからISS．CLIは正方向を`tracked in`と表示する |

```yaml
depends_on:
  - ADR-0003
informs:
  - ADR-0007
evaluates:
  - XR-0007
supersedes:
  - XR-0001
issues:
  - ISS-0004
```

`superseded_by`はfrontmatterへ記録しない．CLIは全記録の`supersedes`から逆方向を推論し，superseded状態の記録に後継がちょうど一つ存在することを検証する．superseded状態とは，ADR／XRでは`status: superseded`，issueでは`status: closed`かつ`resolution: superseded`を指す．

`supersedes`を宣言するsourceは，ADRでは`accepted`，`deprecated`，`superseded`のいずれか，XRでは`adopted`，`rejected`，`inconclusive`，`superseded`のいずれかでなければならない．issueは任意の状態でsourceになれる（置換後継は通常まだ`open`である）．sourceが後続のrecordによって後にsuperseded状態になっても，その既存の`supersedes`は有効である．

`related`は正規Relationship Typeではない．既存文書の段階的移行だけのためにlegacy入力として一時受理するが，新規template，query，graph，JSON，Mermaidには含めない．通常の`validate`は残存件数をwarningとして報告し，移行完了の確認には次を使う．

```bash
uv run .github/records.py validate --strict-relations
```

revision，manifest，結果ディレクトリ，実行コマンドは`artifacts`に記録する．

```yaml
artifacts:
  revisions:
    - abc1234
  manifests:
    - experiments/manifests/example.yaml
  results:
    - results/xr-0007/
  commands:
    - uv run pytest tests/test_example.py
```

## 状態

ADR：`proposed`，`accepted`，`rejected`，`deprecated`，`superseded`

XR：`planned`，`running`，`adopted`，`rejected`，`inconclusive`，`superseded`

issue：`open`，`in-progress`，`in-review`，`blocked`，`closed`

`failed`は状態として使用しない．実装失敗，仮説棄却，性能不足，実験中断を本文で区別する．

## Issue lifecycle

issueの閉鎖はファイル移動ではなく，frontmatterで表現する．

* `status: closed`のissueは`resolution`と`resolved`（YYYY-MM-DD）を必須とする．
* `resolution`は`completed`（完了），`abandoned`（中止），`duplicate`（重複），`superseded`（置換）のいずれかとする．中止の理由は本文へ書く．
* `resolution: duplicate`は`duplicate_of`（本流issueのID）を必須とし，それ以外では`duplicate_of`を書けない．
* `resolution: superseded`のissueは，後継issueの`supersedes`からちょうど一つ参照されなければならない．titleを大きく変えたい場合はrenameせず，新issueで置換してこの形で閉じる．
* `resolution`，`resolved`，`duplicate_of`は`closed`以外の状態およびADR／XRでは書けない．
* IDは不変であり，ファイル名のslug部（`ISS-NNNN-`以降）は自由に変更してよい．

issueは実装可能な作業単位を追跡し，ADRは採用判断，XRは試行と観測結果を記録する．ADR／XRからissueを参照する場合はfrontmatterの`issues`を使用する．issueからADR／XRへの参照専用fieldは設けない．関係はADR／XR側の宣言から CLI（`show`／`query`／`graph`）が逆方向を推論して閲覧する．本文で理由の説明に必要な場合のみIDへ言及する．

## 更新規則

* 過去記録の結論を新しい結論へ書き換えない．
* 再検証は新しいXRとして記録する．
* 判断の置換は新しいADRを作り，旧ADRを`superseded`にする．
* 新記録の`supersedes`から旧記録を参照し，旧記録を`superseded`へ変更する．逆方向はCLIが推論する．
* 不採用実装を削除する前に，必要なcommit，条件，結果がXRから追跡可能であることを確認する．
