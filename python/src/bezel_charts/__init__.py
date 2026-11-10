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

import html
import re
from os import PathLike
from pathlib import Path
from collections.abc import Mapping
from typing import Any

from . import _data
from ._render import _camel
from ._render import render as _render
from ._render import to_svg as _to_svg
from ._tile import THEMES as themes
from ._util import Opts, fmt, lst, series
from .charts import TYPES
from .charts.waterfall import walk as _walk

__version__ = "1.9.0"
__all__ = [
    "Chart", "area", "bars", "boxplot", "bullet", "combo", "histogram", "donut", "gauge", "heatmap", "line", "progress", "render", "ring", "scatter", "spark", "themes",
    "to_svg", "types", "waterfall", "__version__",
]

#: Every chart type, the same as in the JavaScript package.
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

    @property
    def alt(self) -> str:
        """Alt text for the chart: its title and summary, then up to 12 values with their labels.

        An exported SVG is an image, so screen readers only get what the page says about it::

            chart.save("signups.svg")
            print(f"![{chart.alt}](signups.svg)")
        """
        m = re.search(r'aria-label="([^"]*)"', self.svg)
        out = html.unescape(m.group(1)) if m else f"{self.type} chart"
        o = Opts({_camel(k): v for k, v in self.options.items()})
        S = series(o.values) if self.type in ("spark", "line", "area", "bars", "donut", "progress", "bullet") else []
        if len(S) == 1:
            labels = lst(o.labels)
            parts = [(labels[i] + " " if i < len(labels) and labels[i] else "") + fmt(v, o) for i, v in enumerate(S[0])]
            more = len(parts) - 12
            out += ". " + ", ".join(parts[:12]) + (f" and {more} more" if more > 0 else "")
        elif self.type == "waterfall":
            # Totals read as the running total they show, changes as signed steps.
            steps = _walk((series(o.values) or [[]])[0], lst(o.labels), o.totals)
            parts = [
                st["name"] + (" total " + fmt(st["to"], o) if st["kind"] == "total" else " " + ("+" if st["change"] > 0 else "") + fmt(st["change"], o))
                for st in steps
            ]
            more = len(parts) - 12
            if parts:
                out += ". " + ", ".join(parts[:12]) + (f" and {more} more" if more > 0 else "")
        return out

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


def _dated(options: dict, data, x, x_format, lbls) -> dict:
    """Adds dates= when the x column or the index holds real dates, so points sit where they fall in time."""
    if "dates" in options:
        return options
    iso = _data.iso_dates(data, x)
    return {**options, "dates": iso} if iso else options


def _undated(options: dict, data, x, x_format) -> bool:
    """Whether automatic dates replace the labels: they do unless x_format asks for labels of its own."""
    return "dates" not in options and not x_format and _data.iso_dates(data, x) is not None


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
    When ``x=`` (or the index) holds real dates, points sit where they fall in time and the axis picks its own
    date steps. ``x_format`` (for example ``"%b %Y"``) still names the points in tooltips.
    """
    if data is None:
        return Chart("line", _options(options, None, None, None))
    values, names, lbls = _data.prepare(data, x, y, x_format)
    return Chart("line", _options(_dated(options, data, x, x_format, lbls), values, names, None if _undated(options, data, x, x_format) else lbls))


def area(data: Any = None, *, x: Any = None, y: Any = None, x_format: str | None = None, **options: Any) -> Chart:
    """An area chart: one or more filled series over time, with the value axis always starting at zero.

    Takes the same data as ``line()``. With several series, ``stacked=True`` piles them up so the top edge is
    the total, and ``stacked="percent"`` scales each column to 100% to show shares.
    """
    if data is None:
        return Chart("area", _options(options, None, None, None))
    values, names, lbls = _data.prepare(data, x, y, x_format)
    return Chart("area", _options(_dated(options, data, x, x_format, lbls), values, names, None if _undated(options, data, x, x_format) else lbls))


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


def boxplot(data: Any = None, *, y: Any = None, by: Any = None, **options: Any) -> Chart:
    """Box plots: one box per group of raw values, with quartiles calculated the way pandas does.

    ``data`` can be a list or Series (one box), a dict of name to values, a DataFrame (one box per numeric column,
    or ``y=`` to choose), or a long DataFrame split by a column with ``by=``: ``bc.boxplot(df, y="salary", by="team")``.
    ``whiskers="range"`` reaches the lowest and highest values, ``mark="mean"`` adds a diamond at the mean and
    ``horizontal=True`` lays the boxes on their side.
    """
    if data is None:
        return Chart("boxplot", _options(options, None, None, None))
    if by is not None:
        groups = {str(name): g[y] for name, g in data.groupby(by, sort=False)}
        values, names, _labels = _data.prepare(groups, None, None, None)
    else:
        values, names, _labels = _data.prepare(data, None, y, None)
    return Chart("boxplot", _options(options, values, names, None))


def combo(
    data: Any = None, *, x: Any = None, bars: Any = None, line: Any = None, x_format: str | None = None, **options: Any
) -> Chart:
    """Bars on the left axis and one or more lines on the right, for two measures with different units.

    With a DataFrame, ``bars=`` and ``line=`` name a column or a list of columns, and ``x=`` the labels:
    ``bc.combo(df, x="month", bars="sales", line="conversion", line_suffix="%")``. Without one, pass the data
    straight in: ``bc.combo(bars=[182, 214], line=[3.1, 3.4], labels=["Jan", "Feb"])``. ``stacked=True`` piles
    several bar series up. ``line_prefix``, ``line_suffix`` and ``line_decimals`` format the right axis.
    """
    out = dict(options)
    if data is not None:
        # A combo always has a legend, so even a single column keeps its name.
        if bars is not None:
            values, names, lbls = _data.prepare(data, x, bars, x_format)
            out = _options(out, values, names or ([str(bars)] if isinstance(bars, str) else None), lbls)
        if line is not None:
            lvalues, lnames, lbls = _data.prepare(data, x, line, x_format)
            lnames = lnames or ([str(line)] if isinstance(line, str) else None)
            out.setdefault("line", lvalues)
            if lnames:
                out.setdefault("line_series", lnames)
            if lbls and "labels" not in out:
                out["labels"] = lbls
    else:
        if bars is not None:
            values, names, lbls = _data.prepare(bars, None, None, x_format)
            out = _options(out, values, names, lbls)
        if line is not None:
            lvalues, lnames, _lbls = _data.prepare(line, None, None, x_format)
            out.setdefault("line", lvalues)
            if lnames:
                out.setdefault("line_series", lnames)
    return Chart("combo", _options(out, None, None, None))


def histogram(data: Any = None, *, y: Any = None, **options: Any) -> Chart:
    """A histogram: counts how many raw values fall into each range, with round edges chosen for you.

    ``data`` can be a Series or list of raw values, a DataFrame (``y=`` for one column or a list of them; by default
    every numeric column), or a dict of name to values. Several series share the same ranges and overlap.
    ``bins=`` sets roughly how many ranges, ``bin_width=`` an exact width, ``mark="mean,median"`` adds those lines
    and ``percent=True`` shows shares instead of counts.
    """
    if data is None:
        return Chart("histogram", _options(options, None, None, None))
    values, names, _labels = _data.prepare(data, None, y, None)
    return Chart("histogram", _options(options, values, names, None))


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


def _parts_chart(type_: str, data, x, y, x_format, options) -> Chart:
    if data is None:
        return Chart(type_, _options(options, None, None, None))
    values, lbls = _data.parts(data, x, y, x_format)
    return Chart(type_, _options(options, values, None, lbls))


def ring(data: Any = None, *, x: Any = None, y: Any = None, x_format: str | None = None, **options: Any) -> Chart:
    """Progress rings, one per value, like activity rings. Values are out of 100 unless you set ``max``.

    One value draws a single large ring with the number in the middle; several draw nested rings
    with a legend. Pass a list, a dict of name to value, a Series (its index names the rings) or a
    DataFrame with ``y=`` for the values and ``x=`` for the names.
    """
    return _parts_chart("ring", data, x, y, x_format, options)


def donut(data: Any = None, *, x: Any = None, y: Any = None, x_format: str | None = None, **options: Any) -> Chart:
    """A donut chart of parts of a whole, with the total in the middle and percentages in the legend.

    Beyond six parts, the five largest are kept and the rest are added up as "Other". Negative values
    count as 0. Pass a list, a dict of name to value, a Series such as ``value_counts()``, or a
    DataFrame with ``y=`` for the values and ``x=`` for the names.
    """
    return _parts_chart("donut", data, x, y, x_format, options)


def gauge(value: Any = None, *, label: Any = None, **options: Any) -> Chart:
    """A half-circle gauge for one value, from ``min`` (default 0) to ``max`` (default 100).

    ``zones=[60, 85]`` colours the arc green, amber or red depending on which band the value is in,
    ``goal=`` adds a marker, and ``label=`` writes a word under the number. ``value`` can be a number,
    or a list or Series, whose first value is used.
    """
    out = dict(options)
    if label is not None:
        out.setdefault("labels", [_data.label(label)])
    if value is not None:
        vals = _data.numbers(value if hasattr(value, "__iter__") and not isinstance(value, str) else [value])
        out["values"] = vals[:1]
    return Chart("gauge", out)


def progress(data: Any = None, *, x: Any = None, y: Any = None, x_format: str | None = None, **options: Any) -> Chart:
    """A progress bar. One number is a percentage (or out of ``max``); several stack up with a legend.

    Stacked parts fill up to their total unless you set ``max``. Pass a number, a list, a dict of
    name to value, a Series, or a DataFrame with ``y=`` for the values and ``x=`` for the names.
    """
    if data is not None and not hasattr(data, "__iter__") and not isinstance(data, Mapping):
        data = [data]
    return _parts_chart("progress", data, x, y, x_format, options)


def waterfall(data: Any = None, *, x: Any = None, y: Any = None, x_format: str | None = None, totals: Any = None, **options: Any) -> Chart:
    """A waterfall: how a starting value rises and falls, step by step, to where it ends up.

    Pass the changes as a list, a dict of step to change, a Series (its index names the steps) or a DataFrame
    with ``y=`` for the changes and ``x=`` for the names. ``totals=`` lists the bars that show the running total,
    by name or position. A total adds its own value first, so give the opening amount for a start and 0 for a
    subtotal::

        bc.waterfall({"Revenue": 420, "Costs": -160, "Tax": -38, "Profit": 0}, totals=["Revenue", "Profit"])

    Rises, falls and totals use the theme's colours; ``color=[rise, fall, total]`` changes them.
    """
    out = dict(options)
    if totals is not None:
        out["totals"] = [totals] if isinstance(totals, (str, int)) else list(totals)
    return _parts_chart("waterfall", data, x, y, x_format, out)


def bullet(
    data: Any = None, *, x: Any = None, y: Any = None, target: Any = None, x_format: str | None = None, **options: Any
) -> Chart:
    """Bullet charts: one row per measure, with the actual value as a bar, the target as a line and bands behind.

    Pass the actual values as a list, a dict of name to value, a Series or a DataFrame with ``y=`` for the values
    and ``x=`` for the names. ``target=`` is a column name, a list (one per row) or one number for every row.
    ``zones=`` sets the band edges, the same as the gauge's: ``zones=[150, 180]`` for every row, or one list per
    row such as ``zones=[[150, 180], [40, 55]]``. ``zone_labels=["Poor", "Fair", "Good"]`` names the bands.
    """
    out = dict(options)
    if target is not None:
        if isinstance(target, str) and _data._is_frame(data):
            out["targets"] = _data.numbers(data[target], "targets")
        elif isinstance(target, (int, float)) and not isinstance(target, bool):
            out["targets"] = [float(target)]
        else:
            out["targets"] = _data.numbers(target, "targets")
    return _parts_chart("bullet", data, x, y, x_format, out)
