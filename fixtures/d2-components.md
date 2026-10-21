---
marp: true
theme: lab
paginate: true
style: |
  section .d2-diagram svg text { font-size: 80px; }
  section .d2-diagram { --d2-max-height: 420px; }
---

## D2：日本語と同一図の独立性

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px">
<div>

```d2
direction: right
*.style.font-size: 32
human: 人間
robot: 共有ロボット
human -> robot: 方針 {style.italic: false}
```

</div>
<div>

```d2
direction: right
*.style.font-size: 32
human: 人間
robot: 共有ロボット
human -> robot: 方針 {style.italic: false}
```

</div>
</div>

---

## D2：グループと数式

```d2
direction: right
*.style.font-size: 28
agent: {
  label: 協調エージェント
  input: 入力
  update: 更新
  input -> update
}
formula: |latex
x^2 + \alpha = \frac{1}{2}
|
agent -> formula
```

---

## D2：長いラベルと配置の変更

```d2
vars: {d2-config: {layout-engine: elk; theme-id: 300}}
direction: right
*.style.font-size: 28
source: 日本語の長いラベルを持つ入力
result: 出力
source -> result
```
