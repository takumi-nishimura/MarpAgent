# CI 完全受入れの保存証跡：2026-10-30

実行対象は `0b0fdc00d0a02be789390e9915bd4001057e895c`（`codex/20261030-integration`）である．初回 full は日本語フォント不足の条件で失敗し，隔離した Fontconfig 設定で Noto Sans JP を補完後，全ゲートが成功した．`npm ci` と実 registry を参照する `npm run audit:dependencies` も成功した．各実行前後は同じ HEAD・clean tree・同じ lock SHA256 だった．時刻は原本では UTC，この日付は JST である．

原本は `coordination/acceptance/0b0fdc0-20261030-01`．[当時の report](raw/REPORT.md)，[集約結果](raw/acceptance.json)，各コマンドの JSON と生ログを保存した．今回の作業は証跡の保存と記録検証であり，PR64 候補で full を再実行した結果ではない．

## 実際の結果

| 段階 | 結果 | 原本 |
| --- | --- | --- |
| `npm ci` | exit 0 | [実行条件](raw/npm-ci.json)，[ログ](raw/npm-ci.log.gz) |
| dependency audit | exit 0，既知7 package が既存 baseline 内に残存 | [実行条件](raw/audit-dependencies.json)，[ログ](raw/audit-dependencies.log.gz) |
| 初回 `ci:full` | exit 1，E2E 117成功・2失敗・1 skip | [実行条件](raw/ci-full.json)，[ログ](raw/ci-full.log.gz) |
| フォント補完後の対象2ファイル | exit 0，11成功 | [実行条件](raw/e2e-font-check.json)，[ログ](raw/e2e-font-check.log.gz) |
| フォント補完後の `ci:full` | exit 0 | [実行条件](raw/ci-full-fonts.json)，[ログ](raw/ci-full-fonts.log.gz) |

最終 full は記録73件，D2 7件，portable D2 ZIP 2件，strict unit 528件，strict rendered fixture/example 18件，Chromium E2E 105件，Firefox E2E 14件が成功した．Firefox の1 skip は既存の Chromium CDP 専用 native touch injection であり，ブラウザ不足による skip ではない．E2E は12 workers，retry なし．audit は脆弱性ゼロを意味せず，baseline の拡大はない．

初回の失敗は `caption-wrapping.spec.js:119` と `lab-refinement.spec.js:137`．`fc-list :lang=ja` は空で，`fc-match` は DejaVu Sans を選んでいた．検証済み static weight 400 の Noto Sans JP をプロセス専用 `FONTCONFIG_FILE` に登録後，対象テストと full の両方が成功した．[補完前後の観測](raw/browser-font-setup.json)と[実際の設定](raw/fonts.conf)を保存した．追跡されたテスト・style・runtime・workflow・baseline の変更はなかった．失敗ログを最終成功で置き換えていない．

## PR64 候補との対応

保存時の候補は `b19b98d0094e0d0a65ae48bb908a647c7f615140`（`codex/20261030-pr64`）．次の比較は exit 0 で，docs 以外の全 tree が実行対象と一致した．runtime，workflow，tests，package／lock，audit baseline，decks／assets を含む．

```sh
git diff --exit-code 0b0fdc00d0a02be789390e9915bd4001057e895c b19b98d0094e0d0a65ae48bb908a647c7f615140 -- . ':!docs/**'
git diff --name-status 0b0fdc00d0a02be789390e9915bd4001057e895c b19b98d0094e0d0a65ae48bb908a647c7f615140
```

差分は次の3ファイルに限られる．

| パス | 実行対象から PR64 候補への差分 |
| --- | --- |
| `docs/ci.md` | 作業固有の絶対 lock パスを汎用例に変更 |
| `docs/design-assets-integration.md` | PR52 の歴史的記録 XR-0008 を案内する追記が候補にはない |
| `docs/explorations/XR-0008-preserve-the-october-18-design-capability-audit.md` | 統合実行には存在したが候補にはない |

したがって記録集合は同一ではない．候補では `uv run .github/records.py validate` を別途実行し，ADR-0012 の証跡更新後も72件が成功した（[出力](records.txt)，[条件・ADR hash](manifest.json)）．今回追加する差分はこの保存ディレクトリと ADR-0012 だけであり，実装の同一性は維持する．後続の実装変更の受入れはこの結果へ含めない．

## 保存形式と検証

ログは gzip で可逆圧縮し，ほかの原本は byte 単位で複写した．[manifest.json](manifest.json) に元ファイル名・圧縮前後の SHA256・サイズを記載し，複写前に既存 `manifest.sha256` と照合した．Fontconfig 原本は `browser-font-setup.json` の hash と照合した．[SHA256SUMS](SHA256SUMS) はこのディレクトリ内の保存ファイルを検証する．元 report／JSON 内の絶対パスと未圧縮ログへの参照は当時の記録として保持し，保存先との対応は manifest に示す．

```sh
cd docs/evidence/ci-acceptance-2026-10-30
sha256sum -c SHA256SUMS
gzip -cd raw/ci-full-fonts.log.gz
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
for (const f of JSON.parse(readFileSync('manifest.json')).files) {
  const bytes = readFileSync(f.archiveFile);
  const raw = f.encoding === 'gzip' ? gunzipSync(bytes) : bytes;
  if (createHash('sha256').update(raw).digest('hex') !== f.rawSha256) throw Error(f.archiveFile);
}
console.log('All original bytes verified.');
JS
```

主要な生ログ SHA256：

| ログ | SHA256 |
| --- | --- |
| 初回 full | `0d2180ef326b0ffd3ac0c23670eec58e6a6b19a74c68b46e4e8994a5b4918e08` |
| 最終 full | `1d97d06a05eb325d908a31b25058de6aae5f2cbdb791c1cdcb5787596e0e2e80` |
| audit | `3e5c5904b86e71fbd0efc6a5c3974deb0d36a39ef7db1f9b673a60b2ea5aed8a` |

browser の画像・動画・trace・HTML report，生成 ZIP，導入済み binary／font はこのコンパクトな保存には含めない．原本 report が参照する画像は原本側の保存物である．

## 再現条件と限界

[environment.json](raw/environment.json) に Node 25.6.0，npm 11.8.0，uv 0.13.1，D2 0.9.0，fonttools 4.60.1，Playwright 1.58.2，Chromium 145.0.7632.6，Firefox 146.0.1，Puppeteer 25.13.0 と実体の SHA256 を保存した．lock は `0110761e135d67493d6a7fa42341b9ac23bd99b8ef63f8f2c056f241e6fa7ec1`．D2 と browser はともに static Noto Sans JP weight 400（`6f513200a25f77ccd4388393d973f4c32a3f06fe9145e6a0fab38d16f2dc4819`）を使用した．

再実行は対象 revision の隔離 checkout で [CI 手順](../../ci.md)に従って `npm ci`，固定 D2／font，Chromium／Firefox を準備する．既存実体を再利用する場合も manifest の hash を確認する．[準備時のスクリプト](raw/prepare-tools.sh)と[Fontconfig 補完処理](raw/prepare-browser-fonts.cjs)は履歴であり，その絶対パスを別環境へそのまま適用しない．新しい保存先の font directory／cache directory を指定した Fontconfig を作成し，`fc-match` と `fc-list :lang=ja` で選択を確認する．

```sh
export MARP_AGENT_D2_PATH=/absolute/path/to/d2-v0.9.0/bin/d2
export MARP_AGENT_D2_FONT_PATH=/absolute/path/to/NotoSansJP-Regular.ttf
export FONTCONFIG_FILE=/absolute/path/to/fonts.conf
export CHROME_NO_SANDBOX=1
unset CI
git rev-parse HEAD
git status --short
flock /tmp/marpagent-browser.lock npm run ci:full
npm run audit:dependencies
```

共有ホストの lock は全作業者で同じものを使う．これは WSL2/Linux で既存 browser を検証して再利用したローカル受入れであり，hosted GitHub workflow や Ubuntu の新規 `--with-deps` 導入の結果ではない．Firefox は設定済み overview／reload／scroll の E2E 範囲を検証し，native Puppeteer Firefox BiDi PDF の既知制限は対象外である．macOS／Windows や個々の研究 deck の内容・視覚品質もこの結果へ含めない．
