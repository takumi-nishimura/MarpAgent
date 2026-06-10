# %%
import japanize_matplotlib
import matplotlib.pyplot as plt
import pandas as pd

japanize_matplotlib
df = pd.read_csv(
    "decks/2026/midterm-examination/data/産業別の雇用状況_身体障害種別.csv"
)

# %%
num_cols = [
    "視覚障害者",
    "聴覚又は平衡機能障害者",
    "音声・言語・そしゃく機能障害者",
    "肢体不自由者",
    "内部障害者",
    "身体障害者計",
]
for c in num_cols:
    df[c] = pd.to_numeric(df[c].astype(str).str.replace(",", ""), errors="coerce")

# プロット（産業別・合計）
plot_df = (
    df[["区分", "身体障害者計"]]
    .dropna()
    .set_index("区分")
    .sort_values("身体障害者計", ascending=True)
)

ax = plot_df["身体障害者計"].plot(kind="barh", figsize=(10, 6))
ax.set_xlabel("人数")
ax.set_ylabel("産業")
ax.set_title("身体障害者計：産業別雇用人数")
plt.tight_layout()
plt.show()

# %%
types = [
    "視覚障害者",
    "聴覚又は平衡機能障害者",
    "音声・言語・そしゃく機能障害者",
    "肢体不自由者",
    "内部障害者",
]

for c in types:
    df[c] = pd.to_numeric(df[c].astype(str).str.replace(",", ""), errors="coerce")
df[types] = df[types].fillna(0)

df["plot_total"] = df[types].sum(axis=1)

plot_df = (
    df[["区分"] + types + ["plot_total"]]
    .sort_values("plot_total", ascending=False)
    .set_index("区分")
)

ax = plot_df[types].plot(kind="barh", stacked=True, figsize=(12, 7))
ax.invert_yaxis()

ax.set_xlabel("人数 [人]")
ax.set_ylabel("産業")
ax.set_title(
    "産業別身体障害者雇用人数 (出典: 令和７年 障害者雇用状況の集計結果, 厚生労働省)"
)
plt.tight_layout()
plt.show()

# %%
