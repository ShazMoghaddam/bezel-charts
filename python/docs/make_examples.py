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
print("Saved the example charts to", here)
