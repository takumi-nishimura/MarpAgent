# 素材の発見・参照確認・流用

`marpx assets` は指定repoの共有素材とデッキ素材を調べる．原稿は `decks/**/slide.md` / `paper.md`，素材はrepo直下の `assets/`，デッキ配下の `assets/`，および原稿が参照するrepo内ファイルを対象とする．ディレクトリsymlinkは再帰走査せず，原稿が使うファイルだけを参照解決する．

```bash
marpx assets list --repo /path/to/my-decks
marpx assets search "測定装置" --repo /path/to/my-decks --type image
marpx assets list --repo /path/to/my-decks --used-by decks/my-talk/slide.md --format json
marpx assets doctor --repo /path/to/my-decks
```

一覧と検索はパス，形式，bytes，SHA256，画像寸法または取得不能理由，実体・alias，同一内容候補，参照原稿・元行・slide・描画順・表示pageを返す．原稿にあるcaptionや出典は周辺抜粋と原稿位置から確認できる．ない出典や所有元は推測しない．`location` は実体の配置を示す．aliasesは同じ実体，identicalは内容ハッシュが一致する別実体の候補であり，自動で統合・移動・削除しない．

hidden参照も既定で保持し，表示pageとは別にhiddenと明記する．`--visible-only` で表示対象から外せる．frontmatterのCSS参照はglobalと示し，特定のpage番号を与えない．

## 変更・削除前の利用先確認

```bash
marpx assets list --repo /path/to/my-decks \
  --uses decks/owner/assets/img/figure.svg --format json
```

指定ファイルと同じ実体へ解決されるaliasの参照原稿をまとめて調べられる．`references[].origin` に原稿と行がある．存在しないcatalogパスを指定するとエラーになり，利用先ゼロとは扱わない．同一hashでも別実体のファイルは，更新が連動するaliasとして扱わない．private/ignoreの除外範囲は次項のとおりで，除外先の利用確認が必要なら明示的にその範囲も調べる．

## 既定の表示範囲

private / .private / \_privateおよび `private-*` 等のパス，隠しパス，Git ignore対象は既定で除外する．ignoreはtrackedファイルにも適用する．symlinkの実体・途中のrepo内パスにも同じ検査を行う．除外対象を参照する原稿や，除外パスの語を周辺抜粋に含む原稿ではcontextを伏せ，除外対象のパス・caption・hashをJSONやpreviewへ出さない．hidden参照を非表示にしてもこの判定には含める．周辺抜粋は最大4096文字で，埋込data URLの内容は伏せる．

```bash
marpx assets list --repo /path/to/my-decks --include-private --format json
```

`--include-private` はprivate/ignore/隠しパスを明示的に含めるローカル操作である．`.git` / `.ssh` / `.aws` / `.env` / node_modulesは常に除外する．Git管理でないディレクトリではGit ignoreを適用せず，JSONの `privacy.ignoreSource` が `path-only` になる．private判定はこれらのパス規約によるもので，原稿本文や画像内容から機密性を推測する機能ではない．

`excluded.private` は走査中に除外したパスの件数である．privateディレクトリの中は走査しないため，配下の全素材数を意味しない．repo外ファイルの内容はinclude-privateでも読まず，外部の実体パスや絶対targetは出力で伏せ，修正すべきrepo内リンク・原稿行を示す．

## ローカルpreview

```bash
marpx assets search "figure" --repo /path/to/my-decks --preview
```

同じ検索結果からsystem temporary directoryに `catalog.html` を作り，パスを表示する．画像のthumbnail，source行へのリンク，caption等の抜粋，動画のnative controlsをローカルで確認できる．動画は `preload="none"` とし，変換やthumbnail生成を要求しない．既存poster画像も独立した画像素材として検索・表示できる．未対応画像・音声・font・PDFもファイルリンクとmetadataを利用できる．

HTMLはscriptやインラインSVGを含めず，外部ネットワークを許可しないCSPを持つ．一時ディレクトリとHTML以外のcacheや画像を作らず，原稿・素材を編集しない．`--format json --preview` の場合は結果の `previewPath` に一時HTMLのパスを追加する．

## 明示的な流用

```bash
# Check the exact source, destination and relative target first.
marpx assets reuse \
  decks/owner/assets/img/figure.svg \
  decks/consumer/assets/img/from-owner-figure.svg \
  --repo /path/to/my-decks --dry-run

# Create the relative file symlink selected above.
marpx assets reuse \
  decks/owner/assets/img/figure.svg \
  decks/consumer/assets/img/from-owner-figure.svg \
  --repo /path/to/my-decks
```

source/destinationはrepo相対または絶対filesystemパスで，日本語・空白を含む名前はshellでquoteする．一覧のパスをそのまま利用でき，結果にはMarkdown向けにURL encodeしたreferenceも含む．sourceはcatalog上の既知の安全な通常ファイルで，destinationは `slide.md` / `paper.md` を持つ利用デッキの `assets/` 内の名前付きファイルとする．選んだsourceのパスへ相対ファイルsymlinkを作るため，sourceの更新へ追従する．固定コピーや所有元の選定は自動で行わない．

dry-runはディレクトリも作らない．実行時にはsourceとdestinationを再検証し，存在する通常ファイル・symlink・dangling linkを上書きしない．destination親のsymlink，repo外への経路，危険なsourceリンクは拒否する．作成に必要なデッキ内ディレクトリだけを作り，失敗時は空の新規ディレクトリを片付ける．検査は実行時点のfilesystemに対するもので，並行した変更を検出した場合は再計画を求める．

Windows等でsymlink作成権限や機能が不足する場合は理由を報告し，コピーへ切り替えない．Git index上のsymlinkが通常ファイルとしてcheckoutされている場合は `symlink-checkout` と診断する．この状態ではOS/Gitのsymlink設定とcheckoutを直してから利用する．配布用ZIPでの通常ファイル化とは別の操作である．

## 診断とAPI

`doctor` は欠落，broken/cyclic/absolute symlink，repo外参照，別デッキへの直接参照，ディレクトリ単位の流用，symlink checkoutを診断し，findingがあればexit 1を返す．相対ファイル流用と許容される `shared -> repo/assets` を区別する．doctorは素材内容のhash・寸法計測を省く．`--format json` も利用できる．

通常validatorの既存挙動は維持し，この操作の規約診断やZIPのstrict policyを通常検証へ追加しない．APIとJSONのデータ形式は [media-reference-api.md](media-reference-api.md) を参照する．`node scripts/media-assets.js <command> ...` でも同じCLIを実行できる．my-decksの個別リンク修正・元素材の移動はこの機能の実装に含まない．
