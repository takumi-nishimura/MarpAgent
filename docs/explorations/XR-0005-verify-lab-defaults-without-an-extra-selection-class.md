---
id: XR-0005
title: "Verify lab defaults without an extra selection class"
type: exploration
status: adopted
date: "2026-10-21"
authors: [codex-main]
scope: [themes, tests]
tags: [lab, typography]
depends_on: [XR-0003]
informs: [ADR-0010]
evaluates: [ADR-0010]
supersedes: []
issues: [ISS-0049]
artifacts:
  revisions: ["1f303a5", "9bd58e1", "7b33018", "4029409"]
  manifests:
    - docs/evidence/integration-2026-10-21/lab-default-validation.json
  results:
    - docs/evidence/ISS-0049-lab-default/README.md
    - docs/evidence/ISS-0049-lab-default/summary.json
  commands:
    - npm run quality:gate:strict
    - npm run test:d2
    - npm run test:zip:d2
---

# Verify lab defaults without an extra selection class

## Context and Question

lab-refinedで比較した外観を通常のlabへ取り込み，追加classなしで同じ文字階層と図説明を使えるか．既存の通常labとの見た目の変化と，paper・他テーマの互換性を分けて確認する．

## Motivation

利用者の目的はlab自体の改善であり，選択式の比較が済んだ後も公開classを増やす必要はない．一方，既定化によってすべてのlab原稿が対象になるため，新しい条件で描画と回帰を確認する必要がある．

## Hypothesis

追加classなしで改良済みの本文・見出し・caption・脚注・強調が適用される．代表の内容・構図を保ち，paperと他テーマの寸法，色scheme，明示的な上書きが維持される．不意のclipping，情報欠落，他テーマへの適用，品質閾値の緩和は反証条件とする．

## Approach

既存browserテストのoracleを，通常labで改善された寸法を要求する形に変更してREDを確認する．classによる選択を除去し，GREENを確認する．同じ実フォントを使う代表例の画像と計測値を保存し，mainで統合gateを実行する．過去の比較画像・記録・原稿を変更せず，新しい証跡へ保存する．

## Evaluation Conditions

基準はPR #62の1f303a5．実行環境はLinux x64，Node25.6.0，Marp Core5.0.2，Playwright1.58.2．browser実行は共有lockで直列化し，font設定と内容hashを新しい証跡へ記録する．対象は既定labの文字・強調・captionと.bodyの代表構図，paper，muji/toshiba，既存の図・コード・scroll・exportである．

## Observed Results

plain labのstrongに700を要求するbrowser回帰で，変更前の実測500によるREDを確認し，同じ回帰が実装後にGREENとなった．担当の関連unit52件・rendered unit22件・browser46件はskipなしで成功した．paperの独立した文字寸法，muji/toshiba，名前付き色scheme，原稿の明示上書き，16:9/4:3のbody構図を含む．

mainの初回gateはunit504件成功後，過密fixtureのedge-crowdingが出なくなり失敗した．既定行高の変化で文字が検査帯を外れたため，検査用原稿に行高normalを明示した．本文の欠け194pxと端から17pxの文字を再計測し，既存の20px閾値と期待する診断を保持した．検出条件を緩める修正はない．

4029409で全体を再実行し，unit504件，strict fixture18件，browser113件が成功した．既存Firefox native touch1件は対象外skip．固定D2 0.9.0とNoto400による実D2 7件，D2入りZIP 2件はskipなしで成功した．ログhash・環境・コマンドはlab-default-validation.jsonに保存した．

同じ400/700の日本語fontで，body4ページ，typography4ページ，baseline14ページ，example15ページの計37ページを比較した．本文37/37とpaginationが一致し，captionのwrap差は2箇所だった．本文・見出し・表セルのwrap差はなく，代表2組では旧選択式の外観とも画素一致した．bodyとtypographyのclippingは0．旧baselineのbodyなし縦長図1ページは新旧ともclippingが残り，最大86px→83pxだった．新規のclipping，overlap，small text，media/render errorはなかった．mainも代表4枚を目視し，captionの収まり，色付き強調，マーカーと留保の保持を確認した．

比較用画像の番号をmainが読み違えたため，描画順を逆にしてpagination属性と表示文字列を照合した．37/37ページで一致し，代表4枚のhashも初回と一致した．実装・証跡の番号不整合はなかった．

## Conclusion

採用．追加classなしで改善済みのlab外観を使え，検査した構図・色scheme・明示上書き・paper・他テーマの条件を保持した．既存labの外観が旧版と画素一致する変更ではなく，captionと脚注の拡大・文字の行高と太さの変更を伴う．未検査の原稿や任意fontでの収まりを保証せず，旧baselineの欠けも解消済みとはしない．

## Reusable Findings

選択式の導入は比較段階の手段であり，恒久的な公開APIが必要な理由とは別に判断する．既定化では旧版との画素一致ではなく，意図した変更・内容保持・対象外の互換性を確認する．

## Artifacts

旧条件はXR-0003，新しい結果は本XRとdocs/evidence/ISS-0049-lab-default/へ保存する．

## Revisit Conditions

font・Marp/browser版，文字token，既定の構図やpaperの文字体系を変更するときに再評価する．

## Related Records

ADR-0010の採用を検証する．旧XR-0003の観測値は書き換えない．
