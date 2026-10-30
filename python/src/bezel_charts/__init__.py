"""Bezel Charts for Python.

Polished SVG charts from pandas DataFrames, NumPy arrays and plain lists, drawn
exactly like the Bezel Charts web components. Zero dependencies.

    import bezel_charts as bc

    bc.line(df, x="month", y=["sales", "costs"], heading="Sales", prefix="£")
    bc.spark([4, 6, 5, 8, 9], heading="Signups").save("signups.svg")
    bc.bars(df["language"].value_counts(), horizontal=True, heading="Languages")

Created by Shaz Moghaddam, London. https://shazmoghaddam.github.io
"""

from __future__ import annotations

import re
from os import PathLike
from pathlib import Path
from typing import Any

from . import _data
from ._render import ALL_TYPES
from ._render import render as _render
from ._render import to_svg as _to_svg
from ._tile import THEMES as themes
from .charts import TYPES

__version__ = "0.3.0"
__all__ = ["Chart", "bars", "heatmap", "line", "render", "scatter", "spark", "themes", "to_svg", "types", "__version__"]

#: Chart types available in this release. The rest of the ten follow in later releases.
types = list(TYPES)


def render(type: str, options: dict | None = None, **kwargs: Any) -> str:
    """Renders a chart to an SVG string with hover targets, the same as render() in JavaScript.

    Options use the HTML attribute names in snake_case, kebab-case or camelCase:
    ``show_values``, ``show-values`` and ``showValues`` all work.
    """
    return _render(type, {**(options or {}), **kwargs})


def to_svg(type: str, options: dict | None = None, **kwargs: Any) -> str:
    """Renders a clean static SVG, the same as toSVG() in JavaScript."""
    return _to_svg(type, {**(options or {}), **kwargs})


class Chart:
    """A rendered chart. Shows itself in Jupyter, and converts to an SVG string with str()."""

    def __init__(self, type: str, options: dict):
        self.type = type
        self.options = dict(options)
        self.svg = _to_svg(type, self.options)
        m = re.search(r'width="(\d+)" height="(\d+)"', self.svg)
        self.width, self.height = (int(m.group(1)), int(m.group(2))) if m else (0, 0)

    def __str__(self) -> str:
        return self.svg

    def __repr__(self) -> str:
        return f"<bezel_charts.Chart {self.type} {self.width}x{self.height}>"

    def _repr_svg_(self) -> str:
        return self.svg

    def save(self, path: str | PathLike) -> Path:
        """Writes the chart as an .svg file and returns its path."""
        p = Path(path)
        if p.suffix.lower() != ".svg":
            p = p.with_suffix(".svg") if p.suffix else p.with_name(p.name + ".svg")
        p.write_text(self.svg, encoding="utf-8")
        return p


def _options(options: dict, values, names, lbls) -> dict:
    out = dict(options)
    if values is not None:
        out["values"] = values
    if names and "series" not in out:
        out["series"] = names
    if lbls and "labels" not in out:
        out["labels"] = lbls
    if "notes" in out:
        out["notes"] = _data.notes(out["notes"])
    return out


def spark(data: Any = None, *, x: Any = None, y: Any = None, x_format: str | None = None, **options: Any) -> Chart:
    """A sparkline: one series, its latest value and the change since the start.

    ``data`` can be a list, a NumPy array, a pandas Series, or a DataFrame with ``y=`` naming the column.
    Labels come from ``x=`` (a column), a non-default index, or ``labels=``. They show up in notes.
    """
    if data is None:
        return Chart("spark", _options(options, None, None, None))
    values, _, lbls = _data.prepare(data, x, y, x_format, single=True)
    return Chart("spark", _options(options, values[0], None, lbls))


def line(data: Any = None, *, x: Any = None, y: Any = None, x_format: str | None = None, **options: Any) -> Chart:
    """A line chart with one or more series, a value axis and labels along the bottom.

    ``data`` can be a DataFrame (``x=`` for labels, ``y=`` for one column or a list of them; by default
    every numeric column), a Series, a dict of name to values, a list of lists, or a single list.
    Dates are written as YYYY-MM-DD unless you pass ``x_format`` (for example ``"%b %Y"``).
    """
    if data is None:
        return Chart("line", _options(options, None, None, None))
    values, names, lbls = _data.prepare(data, x, y, x_format)
    return Chart("line", _options(options, values, names, lbls))


def bars(data: Any = None, *, x: Any = None, y: Any = None, x_format: str | None = None, **options: Any) -> Chart:
    """Bar charts: vertical or horizontal, one series or grouped side by side.

    One column or list gives single bars, with the highest one highlighted. Several columns, a dict
    or a list of lists give grouped bars with a legend, like this year next to last year.
    A Series with labels in its index, such as ``df["city"].value_counts()``, works directly.
    Use ``horizontal=True`` for long labels and ``show_values=True`` to print every value.
    """
    if data is None:
        return Chart("bars", _options(options, None, None, None))
    values, names, lbls = _data.prepare(data, x, y, x_format)
    return Chart("bars", _options(options, values, names, lbls))


def scatter(
    data: Any = None, *, x: Any = None, y: Any = None, by: Any = None, label: Any = None, **options: Any
) -> Chart:
    """A scatter plot, with an optional least-squares trend line and Pearson's r (``trend=True``).

    With a DataFrame, ``x=`` and ``y=`` name the columns, ``by=`` splits the points into coloured groups
    and ``label=`` names each point (for ``notes``). The column names become the axis titles unless you
    set ``x_label`` and ``y_label``. Without a DataFrame, pass the values as ``x=`` and ``y=``.
    Points with a missing x or y are left out, with a warning.
    """
    if data is None and x is None and y is None:
        return Chart("scatter", _options(options, None, None, None))
    xs, ys, names, lbls = _data.scatter_groups(data, x, y, by, label)
    out = _options(options, None, names, lbls)
    out["x"], out["y"] = xs, ys
    if _data._is_frame(data):
        out.setdefault("x_label", _data.label(x))
        out.setdefault("y_label", _data.label(y))
    return Chart("scatter", out)


def heatmap(data: Any = None, *, x: Any = None, y: Any = None, start: Any = None, **options: Any) -> Chart:
    """A calendar heatmap with one square per day, like a GitHub contributions chart.

    Pass daily numbers with ``start=`` (a date or "YYYY-MM-DD"; by default the last value is today),
    a Series with a date index, a DataFrame with ``x=`` naming the date column and ``y=`` the values,
    or just a list or column of dates, where each day counts how many times it appears.
    Missing days are filled with 0. On narrow tiles the most recent weeks are kept.
    """
    if data is None:
        out = _options(options, None, None, None)
    else:
        found = _data.daily(data, x, y)
        if found is None:
            if x is not None or y is not None:
                raise TypeError("bezel_charts: x= and y= pick DataFrame columns.")
            out = _options(options, _data.numbers(data), None, None)
        else:
            values, first = found
            out = _options(options, values, None, None)
            if start is None and first is not None:
                start = first
    if start is not None:
        out["start"] = _data.to_date(start).isoformat()
    return Chart("heatmap", out)


def __getattr__(name: str):
    if name in ALL_TYPES:
        raise AttributeError(
            f"bezel_charts.{name}() is coming in a later release. Available now: {', '.join(types)}."
        )
    raise AttributeError(f"module 'bezel_charts' has no attribute {name!r}")
