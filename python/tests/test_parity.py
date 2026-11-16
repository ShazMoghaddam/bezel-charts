"""The Python charts must draw exactly the same SVG as the JavaScript ones.

The fixtures come from scripts/py-fixtures.mjs, which runs the real JavaScript
renderers. Gradient, pattern and clip path ids are worked out from the chart in both
languages, so the SVG is compared byte for byte, ids included.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from bezel_charts import render, to_svg
from bezel_charts._js import js_str
from bezel_charts._util import Opts, fmt, nice_scale

FIXTURES = Path(__file__).parent / "fixtures"
CHART_TYPES = ["spark", "line", "area", "bars", "combo", "waterfall", "histogram", "boxplot", "scatter", "ring", "donut", "gauge", "progress", "bullet", "heatmap"]


def load(name: str):
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


def chart_cases():
    for type_ in CHART_TYPES:
        for i, row in enumerate(load(type_)):
            yield pytest.param(type_, row, id=f"{type_}-{i}")


@pytest.mark.parametrize(("type_", "row"), list(chart_cases()))
def test_chart_matches_javascript(type_, row):
    opts = row["options"]
    assert render(type_, **{**opts, "animate": False}) == row["render"]
    assert render(type_, **{**opts, "animate": True}) == row["animated"]
    assert to_svg(type_, **opts) == row["static"]


NUMBERS = load("numbers")


@pytest.mark.parametrize("row", NUMBERS["fmt"], ids=lambda r: f"{r['v']}-{r['o']}-{r['short']}")
def test_number_format_matches_intl(row):
    assert fmt(row["v"], Opts(row["o"]), row["short"]) == row["out"]


@pytest.mark.parametrize("row", NUMBERS["scales"], ids=lambda r: f"{r['min']}..{r['max']}")
def test_nice_scale_matches(row):
    sc = nice_scale(row["min"], row["max"], 4)
    assert [sc.lo, sc.hi, sc.ticks] == [row["out"]["lo"], row["out"]["hi"], row["out"]["ticks"]]


@pytest.mark.parametrize(("value", "expected"), NUMBERS["strings"])
def test_number_to_string_matches(value, expected):
    assert js_str(value) == expected
