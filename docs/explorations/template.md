---
id: XR-0000
title: Replace with exploration title
type: exploration
status: planned
date: "YYYY-MM-DD"
authors:
  - Replace with author or agent identifier
scope:
  - Replace with affected path or subsystem
tags:
  - replace-with-tag
depends_on: []
informs: []
evaluates: []
supersedes: []
issues: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Replace with exploration title

## Context and Question

検証対象となる問いと背景を記述する．

## Motivation

この試行を行う理由を記述する．

## Hypothesis

期待する結果，反証条件，判断基準を記述する．

## Approach

試行した設計，prototype，technical spikeまたは実験方法を記述する．

## Evaluation Conditions

* Revision／commit：
* Manifest／設定：
* 実行コマンド：
* Seed：
* Data：
* Baseline：
* Metrics：
* Stop conditions：

## Observed Results

### Observations

観測事実，測定値，エラー，予想外の挙動を記述する．

### Interpretation

観測から導く解釈と不確実性を記述する．

## Conclusion

`adopted`，`rejected`，`inconclusive`の判断と根拠を記述する．

## Reusable Findings

* 再利用可能な知見を記述する．
* 部分的に有効だった構成を記述する．
* 避けるべき条件を記述する．

## Artifacts

* revision／commit，manifest，結果，traceなどの保存先を記述する．

## Revisit Conditions

* 再検討する価値が生じる前提変更を記述する．

## Related Records

* 機械可読な前提は`depends_on`，判断材料は`informs`，直接評価は`evaluates`，置換は`supersedes`に記述する．
* 型付き関係に含めない背景ADR／XRがあれば，関係を本文で説明する．
