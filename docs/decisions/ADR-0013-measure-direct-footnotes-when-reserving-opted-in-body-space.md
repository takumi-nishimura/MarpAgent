---
id: ADR-0013
title: "Measure direct footnotes when reserving opted-in body space"
type: decision
status: proposed
date: "2026-10-30"
authors:
  - codex-layout-astra
scope:
  - themes/src/_shared/_layouts.css
  - scripts/body-footnotes.js
  - marp.config.js
  - src/portable-bundle.js
  - docs/theme-contract.md
tags:
  - layout
  - footnotes
  - compatibility
depends_on: ["XR-0009"]
supersedes: []
issues: ["ISS-0047"]
artifacts:
  revisions:
    - 77e1029ee745cb2d4c49b1e63c5c5f8e97562e3c
    - c8dece4
    - 62cfcab2a9a17b2c51669496548f68c59a00c8e8
    - a4ccb36
  manifests:
    - docs/evidence/integration-2026-10-30/manifest.json
    - docs/evidence/ISS-0047-layout-comparison-2026-10-30/manifest.json
    - docs/evidence/ISS-0047-footnote-reserve-2026-10-30/manifest.json
  results:
    - docs/evidence/integration-2026-10-30/README.md
    - docs/evidence/ISS-0047-footnote-reserve-2026-10-30/README.md
    - docs/evidence/ISS-0047-footnote-reserve-2026-10-30/run/summary.json
    - docs/evidence/ISS-0047-footnote-reserve-2026-10-30/review.md
    - docs/evidence/ISS-0047-footnote-reserve-2026-10-30/checks.json
    - docs/theme-contract.md
  commands:
    - npm ci
    - npm run ci:full
    - npm run audit:dependencies
    - uv run .github/records.py validate --strict-relations
    - node docs/evidence/ISS-0047-footnote-reserve-2026-10-30/compare.cjs --verify
---

# Measure direct footnotes when reserving opted-in body space

## Context and Problem Statement

通常スライドの直下 `.body` は，見出しの下に残る領域を図・caption・本文へ配分する選択式の配置である．従来の `--body-bottom-safe: 48px` は脚注の実際の高さを測らず，絶対配置された長脚注とbodyが干渉し得た．XR-0009のPhase 1では，labの本文要素下端672pxに対し脚注上端667.8125pxとなり，その原稿には `--body-bottom-safe: 56px` が必要だった．

本人の開発継続指示を受け，leadはPhase 1の証拠を固定した後，この手動reserveを除く限定修正を具体化して担当へ依頼した．実測JSという方式を本人が個別に指定・採用したと解釈しない．本ADRは実装済みの `62cfcab` を公開契約として採用する案であり，検証済み `77e1029` の最終統合gateは成功したが，公開契約の採用判断は別に残す `proposed` である．標準例の個別指定が一般的に減るというISS-0047の完了条件を変更・達成扱いにする判断ではない．

## Decision Drivers

* 脚注の自然な高さに追従し，ページ固有の固定値の選択を省く．
* 脚注の絶対位置，本文・caption・脚注の文字設定，source order，pagination，構図を保持する．
* sectionまたはbodyに明示した最低余白，図の明示寸法，crop，`.figure-natural` を尊重する．
* 既存のlegacy／title／paper／scrollと，CSS単独利用時のfallbackを保つ．
* native exportとstrict offline bundleで同じ配置を使い，追加するruntimeの適用範囲と保守負担を説明できること．

## Considered Options

### Option 1：描画時のJavaScriptで直下脚注の境界を測る

脚注をabsoluteのまま保ち，既存のMarpAgent描画script経路で実測値をbodyへ渡す．脚注の変更やfont読込後に再計算でき，著者の最低余白も維持できる．一方でJavaScriptとobserverの管理が必要になり，CSS単独利用には同じ自動追従を提供できない．XR-0009のPhase 2がこの方式の実装と限定検証を記録する．

### Option 2：脚注を通常のflowへ移す

flex／gridの通常flowに脚注を入れれば，CSS自身がその自然高を配分でき，計測scriptを避けられる．ただし既存の絶対位置，bodyより先に書かれた脚注の表示位置，bodyローカルのbottom-safeと脚注側の余白配分を再設計する必要がある．現在の契約を保つ限定修正として採用せず，flow化する場合は別途互換性を設計・検証する．これは契約上の比較であり，XR-0009でflow実装の比較試験を行ったという意味ではない．

### Option 3：固定reserveを維持し，56pxなどを原稿で選ぶ

実装の追加がなく，CSS単独でも使える．Phase 1のlab長脚注3条件には56pxの1値で足り，見出し／caption追加時の再調整も0件だった．ただし別の脚注高，font，canvasに対応する自動測定ではない．56pxを新しい共通既定値にしても任意の脚注は収まらない．著者の手動指定はfallbackとして残すが，MarpAgentの通常描画の解決策にはしない．

## Decision Outcome

### Chosen Option

Option 1を採用案とする．脚注を動かさず，直下bodyの残余領域だけを変えることで，既存の位置・順序と著者指定を保ったまま長脚注に追従できるためである．最終統合gateは `77e1029` で成功し，leadも結果を点検した．この検証結果だけで公開契約の採用を確定せず，`proposed` を維持する．

計測するreserveは，sectionの下border／paddingを除いた使用可能下端から，表示された直下脚注の最も高い上端までの距離に，bodyのcomputed row gapを足した値とする．負値を0に抑え，1/64px単位で切り上げる．presentation／overviewの縮尺をsectionの未拡大座標へ戻して計算し，非表示で寸法が得られないsectionは表示復帰後のresize通知で再測定する．

公開変数 `--body-bottom-safe` はsection・bodyローカル双方で最低余白を指定する契約を維持する．runtimeは非公開の `--marpagent-body-bottom-reserve` に `max(var(--body-bottom-safe), 実測値)` を設定する．このprivate変数はauthoring APIではなく，CSSは変数がないとき従来の `--body-bottom-safe` を使う．著者の明示marginや固定media寸法をscriptで書き換えないため，それらを指定した場合の収まりは著者側でも確認する．

### Scope

MarpAgentのconfigured rendererが読み込むlab／muji／toshibaの，通常スライド直下の `.body` と同じsection直下の `.footnote` を対象にする．title，直下paper-headerを持つpaper，scrollは除外する．legacyの `.fill` 単独，native `footer`，入れ子の脚注は既存の仕組みを使う．本文とcaptionの自然高を残し，必要なら図の領域が縮む．`.figure-natural`，明示寸法，cropは維持する．

HTMLではJavaScriptが動く間に測定する．PNG／PDFのnative exportでは描画時に同じruntimeを実行し，印刷前にも再測定する．画像出力後・PDF閲覧時のscript実行を要求するものではない．CSS単独やJS無効のHTMLは従来の固定reserveへfallbackし，長脚注には手動指定が必要である．

strict offline bundleでは，配布する版の `scripts/body-footnotes.js` の本文hashを既存の許可リストへ加える．既存の前後空白・source map末尾除去を除き，既知のscript本文とのSHA256一致に限定する．本runtimeは外部resourceを取得しない．任意のinline scriptを一括で信頼する変更ではなく，独自scriptは従来どおり依存が解析できないものとして扱い，strict offlineで拒否する．

### Observerの範囲と寿命

初期化時に直下bodyを持つsectionの集合を確定し，対象がなければobserverを作らない．ResizeObserverはsectionと検出した直下脚注を監視し，MutationObserverはsectionの指定属性／直下child変更，bodyのclass／style，脚注内の属性／子／text変更を監視する．文書全体のsubtreeを監視したり，定期pollingを行ったりしない．新しいsectionを含む文書全体の差替えはrendererによる再初期化の責務である．

通常の通知はrequestAnimationFrameにまとめ，計算値が変わる場合だけstyleへ書き込む．font読込完了とbeforeprintで再測定し，afterprint／window resizeでは更新を予約する．再初期化時は前の処理をdisposeし，予約frame，両observer，window listenerを解除する．以前のfont完了通知が後から来てもdisposed状態では更新しない．同じ脚注への監視登録は重複させず，監視の全解除はdispose時に行う．

### Non-goals

一般的な個別指定削減，原稿の自動移行，脚注同士の衝突，過密本文，細かい図内ラベル／脚注の読みやすさ，native footerや入れ子脚注の自動reserveは対象外である．内容削除，文字縮小，overflow隠蔽，構図切替は行わず，収まらない本文は描画診断に残す．

## Consequences

### Positive

* 検証したlab長脚注familyで著者が選ぶ56pxの1値が不要になり，3caseの明示宣言出現数が3→0となる．
* 脚注とpaginationの位置，本文・caption・脚注の文字設定を保持し，見出し／caption／脚注が増えても図の領域を配分し直せる．

### Negative

* 自動測定にはJavaScriptが必要で，rendererとCSSの間にprivate変数を介した実装上の連携が増える．
* 検証63caseのうち直下脚注がある18caseには計算したprivate宣言が生成される．著者の固定値削減とruntimeでの宣言生成を同じ件数として扱わない．
* reserveが増えた分，図と図内ラベルは小さくなる．細かい脚注自体の文字サイズは改善しない．
* 各更新は初期化時に検出したsectionを走査し，geometry読取と必要なstyle更新を行う．通知をまとめる設計はあるが，大規模デッキや連続変形する脚注のCPU負荷・layout回数・メモリをbenchmarkしておらず，性能向上や一定時間での完了を保証しない．

### Neutral

* 著者が指定する公開class／変数は増えず，bottom-safeの選択肢は残る．標準4構図のwrapper／class／gap parameter数も変わらない．
* 実装／再測定は既存の証拠を置換せず，XR-0009のPhase 1／2と各manifestから追跡する．このADRへのリンクは現在のISSと利用契約に置く．

## Validation

XR-0009 Phase 2では，4行脚注でbody下端672pxが脚注上端628.625pxに侵入するREDを確認した後に修正した．固定font・内容・構図の63caseのbeforeは，保存済みPhase 1のbody既定全metricと一致した．afterでは54caseが不変，長脚注9caseだけbodyが縮み，脚注との離隔はlab13px，muji12px，toshiba13pxとなった．labのbefore離隔は−4.1875pxであり，audit上の文字衝突ではなく要素領域の侵入と区別する．

既存の対象unit85件と共有browser.lock下のstrict Chromium79件が成功した．3テーマ×16:9／4:3，見出し・caption追加，遅い脚注変更，明示最低値，縮尺・非表示復帰，source order，crop，legacy／title／paper／scroll，strict offlineの互換性を含む．別のEnglish入力でHTML，PNG12枚，PDF6本12ページを出力し，native寸法，PDFの脚注4行・留保・paginationと境界を確認した．詳しい確認範囲と未確認範囲は[Phase 2報告](../evidence/ISS-0047-footnote-reserve-2026-10-30/README.md)と[目視記録](../evidence/ISS-0047-footnote-reserve-2026-10-30/review.md)を参照する．

2026-10-30にleadが実装scope・縮尺処理・tests・offline hash許可リストを点検した後，検証対象 `77e1029ee745cb2d4c49b1e63c5c5f8e97562e3c` で `npm ci`，共通browser.lock下の `npm run ci:full`，`npm run audit:dependencies` が終了コード0となった．開始・終了とも同じHEADでclean，lock hashも一致した．記録74件，D2 7件，portable ZIP 2件，strict unit529件，描画fixture18件，Chromium126件，Firefox14件が成功し，失敗0件．Firefoxの既存CDP専用touch除外1件だけをskipした．auditは既知7 packageが元baseline内に残り，baselineは変更していない．

脚注runtime15件，HTML／PNG／PDF export6件，strict offline bundleのunitを含む．固定D2・static font・隔離Fontconfig・uvとbrowserの版／hash，rawまたは正規化を明示したログ，clean before／afterは[最終統合受入れ](../evidence/integration-2026-10-30/README.md)と[manifest](../evidence/integration-2026-10-30/manifest.json)から追跡できる．この記録の保存開始時のbranchのHEAD `e905b96` はCI／依存の5パスが検証対象と異なる．更新PR64を取り込んだ後に，文書を除く追跡ファイルの比較を行う．その具体的な範囲・差分・コマンドは証跡に記録し，取り込み前の同一性は主張しない．

統合gate完了とleadによる結果点検を確認した上で，ADRの採用状態はproposedのままとする．ISS-0047の広いACも未達のまま追跡する．この追加は既存の受入れを保存する文書変更だけであり，browserは再実行していない．

## Related Records

`depends_on: [XR-0009]` は採用案を支える比較・限定修正の証拠への依存を表す．`issues: [ISS-0047]` は実装と未達条件の追跡先を表す．ADRからXRへ `informs` を逆向きに記録せず，既存XRの結論やmanifestは変更しない．

既存の[本文・図配置契約](../theme-contract.md#remaining-body-area-and-figures)のopt-in方針，明示サイズとcropの保持を継続する．過去のADRやXRを置換する判断ではないため，`supersedes` は空のままとする．
