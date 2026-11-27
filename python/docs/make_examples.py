"""Draws the example charts in the README. Run from the python folder: python docs/make_examples.py"""

from pathlib import Path

import pandas as pd

import bezel_charts as bc

here = Path(__file__).parent
df = pd.DataFrame({
    "month": pd.date_range("2026-01-01", periods=9, freq="MS"),
    "Revenue": [42, 48, 45, 53, 61, 58, 66, 72, 79],
    "Costs": [30, 31, 35, 34, 36, 41, 40, 43, 44],
})

bc.line(df, x="month", x_format="%b", heading="Revenue vs costs", prefix="£", suffix="k",
        notes={"May": "Launch"}, width=560, theme="light").save(here / "line.svg")
bc.spark(df["Revenue"], heading="Monthly revenue", prefix="£", suffix="k").save(here / "spark.svg")

sales = pd.DataFrame({"quarter": ["Q1", "Q2", "Q3", "Q4"], "2026": [42, 51, 47, 63], "2025": [38, 44, 49, 52]})
bc.bars(sales, x="quarter", heading="Orders by quarter", suffix="k", show_values=True, width=560,
        theme="light").save(here / "bars.svg")

languages = pd.Series(["Python"] * 46 + ["SQL"] * 31 + ["JavaScript"] * 22 + ["R"] * 9 + ["Go"] * 5)
bc.bars(languages.value_counts(), horizontal=True, heading="Languages in our team", suffix=" people").save(
    here / "bars-horizontal.svg")

study = pd.DataFrame({
    "Hours studied": [2, 3, 4, 5, 6, 7, 8, 9, 10, 4.5, 6.5, 8.5, 3.5, 7.5],
    "Exam score": [48, 55, 52, 63, 66, 71, 74, 82, 86, 58, 69, 79, 51, 70],
})
bc.scatter(study, x="Hours studied", y="Exam score", trend=True, heading="Study time vs results", suffix="%",
           width=560, theme="light").save(here / "scatter.svg")

runs = pd.Series([(i * 7) % 11 if (i * 5) % 4 else 0 for i in range(182)],
                 index=pd.date_range("2026-04-27", periods=182, freq="D"))
bc.heatmap(runs, heading="Running", suffix=" km", stat="total", width=560).save(here / "heatmap.svg")

bc.ring({"Move": 72, "Exercise": 45, "Stand": 90}, heading="Today", width=360, theme="light").save(here / "ring.svg")
budget = pd.DataFrame({"category": ["Rent", "Food", "Travel", "Bills", "Fun"], "spend": [1250, 420, 180, 260, 140]})
bc.donut(budget, x="category", y="spend", heading="Monthly spending", prefix="£", center_label="Spent",
         width=360).save(here / "donut.svg")

bc.gauge(63, label="CPU", zones=[60, 85], goal=80, heading="Server load", width=300, theme="light").save(
    here / "gauge.svg")
bc.progress({"Done": 46, "In review": 18, "Blocked": 6}, max=100, goal=75, heading="Sprint", width=420).save(
    here / "progress.svg")
print("Saved the example charts to", here)

# 1.12.0: a fan chart of forecast scenarios, and a treemap grouped by sector.
years = list(range(2016, 2031))
history = [24, 26, 25, 31, 29, 37, 34, 41, 47, 52] + [None] * 5


def scenario(rate, spread):
    path = [None] * 9 + [52.0]
    for i in range(1, 6):
        path.append(round(52 * (1 + rate) ** i, 1))
    lo = [None if v is None else round(v * (1 - spread * i / 5), 1) for i, v in enumerate(path, -9)]
    hi = [None if v is None else round(v * (1 + spread * i / 5), 1) for i, v in enumerate(path, -9)]
    return lo, path, hi


forecast = pd.DataFrame({"year": years, "revenue": history})
for name, rate, spread in (("bad", -0.02, 0.08), ("middling", 0.04, 0.06), ("good", 0.08, 0.07)):
    forecast[name + "_lo"], forecast[name], forecast[name + "_hi"] = scenario(rate, spread)
bc.line(forecast, x="year", y="revenue", series=["Actual"], heading="Revenue forecast", prefix="$", suffix="bn", width=560, theme="light",
        notes={2020: "2020 shock", (2022, 2023): "Rate rises"},
        bands=[{"name": n.capitalize(), "low": n + "_lo", "mid": n, "high": n + "_hi"} for n in ("bad", "middling", "good")],
        ).save(here / "fan.svg")

holdings = pd.DataFrame({
    "holding": ["Apple", "Microsoft", "Nvidia", "Alphabet", "JPMorgan", "Visa", "Mastercard", "UnitedHealth", "Eli Lilly", "Amazon", "Tesla"],
    "weight": [7.1, 6.4, 5.9, 3.8, 4.1, 3.2, 2.6, 3.3, 2.8, 2.9, 2.1],
    "sector": ["Tech"] * 4 + ["Finance"] * 3 + ["Health"] * 2 + ["Consumer"] * 2,
})
bc.treemap(holdings, x="holding", y="weight", by="sector", heading="Portfolio by holding", suffix="%", decimals=1,
           width=560, theme="dark").save(here / "treemap.svg")
