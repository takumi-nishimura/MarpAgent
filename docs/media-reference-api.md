# Media reference API

CommonJS module: `src/media-reference-graph.js`．#58 の一覧・検索と #59 の bundle 収集で共用する．既存の `findMissingAssets` と `copyDeckForRender` の挙動は変更しない．

```js
const {
    collectDeckReferences,
    resolveAssetReference,
    inspectAssetPath,
    isPathInside,
} = require("./src/media-reference-graph");

const references = collectDeckReferences(deckPath, markdown, {
    repoRoot,
    policy: "bundle",
    includeHidden: false,
    // slideMap: previouslyBuiltMap,
});
const resolution = resolveAssetReference("assets/img/figure.png", {
    repoRoot,
    deckDir,
    policy: "bundle",
});
```

`collectDeckReferences(deckPath, markdown?, options)` は配列を原稿順に返す．markdown を省略する場合は `undefined` を渡す．repoRoot は必須．policy の既定値は `permissive`，includeHidden の既定値は true．同じ実体への参照も参照位置ごとに保持する．Markdown/HTML/CSS の抽出は既存 `src/media-assets.js` の抽出器を使用し，ネットワーク取得・原稿編集・素材内容の読取を行わない．frontmatter の CSS URL も含む．

| Field       | Value                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| reference   | 抽出器が decode した参照文字列．URL の percent encoding は元表記を保持 |
| kind        | `local` / `remote` / `data` / `fragment` / `unsupported`               |
| status      | local は `safe` / `unsafe` / `missing`，それ以外は kind と同値         |
| path        | ローカル参照を deckDir から解決した絶対パス．非ローカルは null         |
| realPath    | symlink 解決後の絶対パス．欠落・循環・非ローカルは null                |
| exists      | ローカルは boolean，非ローカルは null                                  |
| fileType    | `file` / `directory` / `other` / null                                  |
| insideRepo  | realpath が repo の realpath 内か．未解決・非ローカルは null           |
| symlinks    | 下記のリンク情報配列                                                   |
| diagnostics | 下記の診断配列                                                         |
| allowed     | この policy で収集候補となる通常ファイルなら true                      |
| origin      | collectDeckReferences のみ，下記の原稿位置                             |

```js
// Symlink metadata. directory is null when the target cannot be inspected.
{ path, target, resolvedPath, absolute, directory, shared }

// Diagnostic. link and target identify a link requiring repair when present.
{ code, message, path, link?, target? }

// Source origin. Coordinates are 1-based except the 0-based JS string index.
{
  file, index, line, column, scope, // scope: "slide" | "frontmatter"
  slide, renderedSlide, page, hidden, context
}
```

`origin.file` は原稿の絶対パス．slide は非表示を含む Markdown slide 番号，renderedSlide は可視 slide 順，page は表示ページ番号．hidden では renderedSlide/page が null，frontmatter では slide/renderedSlide/page が null，hidden は false．context は原稿の周辺最大5行であり，caption・出典の推測を含まない．column/index は参照を含む構文の位置であり，URL 文字列の置換範囲を意味しない．

`resolveAssetReference(reference, { repoRoot, deckDir, policy })` は origin 以外の上記データを返す．`inspectAssetPath(filePath, options)` は URL の処理を行わず，path から allowed までの情報を返す．`isPathInside(root, candidate)` は component 境界を尊重する**字句上の**包含判定であり，呼出側で realpath を渡せば実体の包含判定になる．

`permissive` は既存の通常ファイルなら規約診断があっても allowed とし，bundle は診断のあるローカル参照を拒否する．欠落・循環・ディレクトリ・非ローカルはどちらも allowed=false．リモート等の許容・strictOffline の判定は bundle 呼出側が行う．

bundle は repo root とファイルの実体を比較し，親ディレクトリを含めた symlink を検査する．repo root 自身の alias は canonicalize する．symlink target の `link/..` はlinkの展開後に親へ進み，OSと同じ意味で解決する．最終パスは `fs.realpathSync.native` で照合する．repo 内の相対ファイルリンクと，deck 直下の `shared -> repo/assets` を許容する．絶対リンク，repo 外へ出る経路，別デッキへの直接参照，別ディレクトリ単位の流用は拒否する．

診断 code: `missing`，`broken-symlink`，`symlink-cycle`，`unreadable`，`outside-repo`，`absolute-symlink`，`directory-reuse`，`cross-deck-reference`，`not-file`．通常 validator は引き続き既存の `findMissingAssets` を使用するため，この API の strict 判定を適用しない．

この API は検査時点のメタデータを返す．bundle が後で内容を読む際のファイル交換や出力側の安全性は呼出側で確認する．source rewrite，CSS 内再帰参照，HTML 内の非 media 資源を扱う場合も，その抽出・書換えは呼出側が担当する．
