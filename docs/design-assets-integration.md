# デザイン・アセット・D2の並行開発と統合

更新：2026-10-21．親：[#53 / ISS-0045](issues/ISS-0045-coordinate-design-improvements-and-asset-distribution.md)．統合ブランチ：`coord/issues-53-61-20261021`．上流基準はmain `74f287d`，作業記録を加えた共通開始点は`1711332`．

本人の指示に従い，#53〜#61ごとにCodex `gpt-6.1-sol`／reasoning `max`のサブリーダーを起動し，Herdrの独立worktreeで実装した．main leaderが共有API，競合，統合と受け入れを管理する．最新の運用方針は，GitHubにPRを作成し，内容のレビューはローカルで済ませることである．PR作成，ローカルレビュー，merge，Issue閉鎖を別の状態として管理する．

## 現在の公開・レビュー方針

既に組合せを検証した統合ブランチを，1本のDraft PRとしてmainへ提示する．PR本文から各ISSの説明・代表画像・検証結果へ辿れるようにし，担当ごとの論理commitを保持する．GitHub上でreviewerを指定したり，GitHubレビュー承認を完了条件に加えたりしない．

ローカルでは各担当の差分確認，mainの共有API・競合解消差分の確認，resolverおよびD2の限定レビュー，修正の回帰試験を実施済みである．既存結果を再利用し，今回の説明追記・公開方針変更はmainが差分とリンクを確認する．未完了だった独立再レビューを完了と読み替えない．テスト対象コードはbe3fc23から変わっていないため，説明だけの追記では全体gateを再実行せず，records検証とリンク・差分検査を行う．

Draftを解除・mergeする前に，#55の一般的な指定数削減を確認できなかった条件をどう扱うかを明示する．既存Draft PR #52は別の調査記録であり，同PRのXR-0003と今回のXR-0003は異なる記録に同じIDを持つため，両方を取り込む場合は採番の整合が必要になる．本PRは#52をmerge・closeしたことにはしない．

## 方針と並行作業

D2は積極採用する．[10月20日の設計検討](https://github.com/takumi-nishimura/MarpAgent/issues/53#issuecomment-6284716041)の未採用という状態は，10月21日の実装指示で更新された．構図は原稿と描画で確認し，色付き太字・マーカー・留保・出典を保持する．[既存方針](https://github.com/takumi-nishimura/MarpAgent/pull/52#issuecomment-6251211532)どおりPeleは採用せず，研究内容や写真を汎用fixtureへ転記しない．

| 開発系列 | 並行できる作業 | 接続と統合の順序 |
| --- | --- | --- |
| 配置・外観 | #54基準，#55配置，#56診断，#57外観を別所有範囲で進める | #54基準を固定→#55公開寸法契約→#56新classの認識→#57同一構図の比較 |
| 素材・配布 | #58 resolverと#59 plannerをAPI契約で接続し，一覧UIを待たない | #58 resolver→#59 ZIP→#58検索・流用→D2入りZIPの実閲覧 |
| D2 | #61のadapter・SVG・共通engineを独立開発する | 共通診断をHTML単回変換の出口へ接続し，固定CLIと日本語fontで確認 |
| プレビュー | #60の既定ポート競合を独立修正する | 既存CLI・notifier・終了処理と統合して先行確認 |
| 管理 | #53が境界と証跡を追跡し，mainが最終統合する | 未コミットの他worktreeを取り込まず，論理commitを順に適用する |

各worktreeは独立した依存を持つ．browserを使う検証は共通lockで直列化し，担当は対象テスト，mainは統合strict gateを実施する．Devin `fusion-gpt-6-1-sol-xhigh-sidekick-swe-2-high`はprocess runner・互換テスト・限定分析へ，無料OpenCode `opencode/glm-5.3-flash-free`はテスト案等へ限定して使い，担当が結果を点検した．起動失敗や承認拒否を成功とせず，完了しなかった部分はCodex担当が実施した．通常の完了手順として追加reviewerを増やしていない．

## 担当と成果物

すべてmainへ実装commitを提出し，統合済みである．公開前の記録状態はin-reviewとし，修正・最終検証の状況は後節に記す．

| Issue／担当 | 実装結果 | 契約・証跡 |
| --- | --- | --- |
| #53／marp-i53-lead | 依存関係と受け入れ管理 | [ISS-0045](issues/ISS-0045-coordinate-design-improvements-and-asset-distribution.md)，本書 |
| #54／marp-i54-lead | 14ページ7組の標準・境界fixture，3テーマの基準描画と調整試行 | [基準記録](../fixtures/layout-baselines/baseline-2026-10-21.md)，[ISS-0046](issues/ISS-0046-establish-representative-layout-regression-baselines.md) |
| #55／marp-i55-lead | opt-inの.body，captionを確保したmedia fitting，旧配置互換 | [公開契約](theme-contract.md)，[代表比較](evidence/ISS-0047-body-layout/README.md)，[ISS-0047](issues/ISS-0047-improve-body-figure-and-caption-layout-defaults.md) |
| #56／marp-i56-lead | classの未定義・独自定義・不明の判定と元行／ページ付き助言 | [調整手順](layout-adjustments.md)，[比較値](evidence/ISS-0048-body-adjustments/report.json)，[ISS-0048](issues/ISS-0048-clarify-layout-overrides-and-diagnose-undefined-classes.md) |
| #57／marp-i57-lead | lab-refinedの明示選択，tokenによる文字階層と強調 | [移行方法](lab-refinement.md)，[同一構図比較](evidence/ISS-0049-lab-refinement/README.md)，[ISS-0049](issues/ISS-0049-refine-lab-typography-and-visual-hierarchy.md) |
| #58／marp-i58-lead | 共通resolver，assets list/search/doctor/reuse，相対ファイルsymlink流用 | [API](media-reference-api.md)，[操作例](media-assets.md)，[ISS-0050](issues/ISS-0050-discover-and-reuse-repository-media-assets.md) |
| #59／marp-i59-lead | 最終HTMLの資源収集・manifest・ZIP・dry-run・strict-offline | [README](../README.md)，[ISS-0051](issues/ISS-0051-export-portable-html-asset-bundles-as-zip.md) |
| #60／marp-i60-lead | PORT未指定時の8080〜8089探索と明示PORTの尊重 | [ISS-0052](issues/ISS-0052-select-another-preview-port-when-the-default-is-occupied.md) |
| #61／marp-i61-lead | 固定D2 CLI，共通fence renderer，SVG検査・cache・失敗伝達 | [利用・制限](d2.md)，[画像](evidence/ISS-0053-d2/README.md)，[ISS-0053](issues/ISS-0053-render-d2-code-fences-through-the-configured-marp-engine.md) |

## 共有境界の確定

.bodyは通常スライド直下の残余領域で，内部の.fillだけをネストした残余高さへ接続する．captionは非縮小とし，mediaはcontainで収める．.figure-naturalは明示寸法を保持する選択肢．旧.fill単独，表紙，paper，scroll，明示cropを保持する．#57はbody/header-gapを再定義せず，lab-refinedを選ばない表示は比較23ページで画素一致した．classの存在判定は親高さやcascadeの成立を保証しない．

#58のresolveAssetReference／inspectAssetPathは参照の解決と診断を共有する．既定permissiveとbundleを区別し，ZIPはbundleを明示する．#59は最終HTML→CSS/SVGを辿り，private実体・絶対参照・file URL・欠落・循環等を拒否し，公開manifestから内部path/contextを除く．通常ファイルだけを収め，失敗時に元素材と既存出力を保持する．通常のvalidatorへZIPの厳格な収集policyを一律適用しない．

#61のassertD2RenderSucceeded(html)を#59が必須importし，同じHTMLの生成直後に呼ぶ．ブラウザや二度目のcompileを失敗検出に使わない．D2のrender診断はvalidationと全exportで共有する．D2なしの既存原稿と，生成済みD2図をD2なしで閲覧する条件は別に試験した．

共有bin/marpx.js，package/lock，validator，READMEはmainが両契約を保持して統合した．生成テーマはソースを統合して再生成し，差分が出ないことを確認した．依存定義の競合修復後にnpm ciが成功している．

## 検証と限定レビュー

初回統合c3b6f5dのnpm run quality:gate:strictはunit493件とfixture全件，browser111件が成功した．Firefoxのnative touch1件は既存の対象外条件でskipであり，成功件数に含めない．同revisionのnpm run test:d2は固定0.9.0と日本語Noto400で6件成功した．

追加#59接続後のnpm run test:zip:d2は2件成功した．元repo・指定D2実体・font入力を除き，空PATHと通信遮断の条件でfile/HTTP表示を確認し，実D2構文エラーと未導入時に既存ZIPを保持した．

最終コードrevision be3fc23でmainが再実行し，quality:gate:strictはunit504件，strict fixture18件，browser113件が成功した．既存Firefox native touch1件だけが対象外skipで，失敗はない．固定D2 0.9.0／Noto400のtest:d2は7件，test:zip:d2は2件成功し，いずれもskipはない．[検証manifest](evidence/integration-2026-10-21/validation.json)に条件・コマンド・ログhashと限定確認の範囲を保存した．

resolver b7fa592の限定レビューは固定POSIX treeと明示bundleで包含不具合なし，関連24件・追加8件成功．ZIP側で必要なpolicy明示，private実体判定，公開field選別，読取り時の交換対策を#59へ渡し，3f91136のunitと実CLI E2Eへ反映した．ZIP追加独立レビューはサービスの応答制限により静的読取り後に中断し，再現・ZIP実体の確認完了とは扱わない．担当の境界テストとmainの統合試験を確認の根拠とする．

D2の外部processとSVGを扱う具体的なリスクに対し，完了済み#60担当が限定レビューを行った．34f8d9fで，CSS image-setの文字列URL，短時間で終了する親が残すdetached子，inline blockの境界解釈によるimport見逃しとcwd間cache混同を再現した．#61が5f7d501／5699ea4／d7d077dで境界別に修正し，mainは差分を読み，37件のD2 unitを含む全体gateと固定CLIの回帰を確認した．Linuxの子終了回帰は3試行とも終了し，呼出元と同名env値を持つ無関係なprocessは生存した．独立した修正後の再確認はサービス側の応答制限で完了せず，再送や別modelへの迂回は行っていない．担当のRED/GREENとmainの統合試験を修正確認の根拠とする．

## 判断記録と受け入れ範囲

[ADR-0007](decisions/ADR-0007-adopt-opt-in-body-layout-and-lab-visual-refinement.md)は配置・外観，[ADR-0008](decisions/ADR-0008-share-media-resolution-and-export-resource-only-portable-zip-bundles.md)は素材・配布，[ADR-0009](decisions/ADR-0009-render-d2-fences-with-a-pinned-external-cli.md)はD2を扱う．[XR-0003](explorations/XR-0003-compare-representative-layouts-under-controlled-fonts.md)と[XR-0004](explorations/XR-0004-evaluate-fixed-d2-rendering-configuration-and-japanese-fonts.md)で試行結果と限界を分ける．mainが記録CLIで中央採番し，records検証は66件成功した．

縦長二列は旧版の高さ1宣言を新bodyの個別高さ0へ置換できたが，旧幅utilityでも修復できる．必要な個別高さが一律に減るという結論にはしない．lab-refinedはcaptionのwrapや自然幅を変え得るため，既定labの置換は行わない．

Linuxでの検証であり，Windows/macOS実機，投影距離での可読性，任意fontの計測精度，別PDF/PowerPoint viewerでの全ページ目視は未実施．D2は信頼済みの自己完結した原稿を対象とし，任意の悪意あるCLIや原稿のOS隔離を保証しない．[my-decks #2](https://github.com/takumi-nishimura/my-decks/issues/2)は別repo所有のままとする．

mainはD2の3指摘解消と統合版のstrict gate・D2・ZIPの成功を確認し，ローカル統合を受け入れた．今回作成したADR-0007〜0009をaccepted，XR-0003〜0004をadoptedとする．既存記録の判断は置換しない．#55の個別指定数の一般的削減と#57のPR添付条件は達成済みとせず，親・子ISSは公開前のin-reviewを保つ．

ローカルで差分を辿る順序は，#60を独立単位とし，配置系列を#54→#55→#56→#57，素材系列を#58→#59，D2を#61とする．D2入りZIPの接続は#59と#61の両方を前提にし，最後に#53の横断確認へ進む．この順序はPRを分割する必須条件ではなく，今回の統合PR内の読み順として使う．各work branch，論理commit，元の作業worktreeを保持した．
