"""Turns pandas, NumPy and plain Python data into the options the renderers read.

pandas and NumPy are never imported. Objects are recognised by what they can do
(a .columns attribute, a .tolist() method), so the package stays dependency free.
"""

from __future__ import annotations

import math
import warnings
from collections.abc import Mapping

from ._js import is_num, js_str, to_string


def _is_frame(obj) -> bool:
    return hasattr(obj, "columns") and hasattr(obj, "dtypes") and hasattr(obj, "__getitem__")


def _is_series(obj) -> bool:
    return hasattr(obj, "index") and hasattr(obj, "tolist") and not _is_frame(obj) and hasattr(obj, "name")


def _to_list(obj) -> list:
    if hasattr(obj, "tolist") and not isinstance(obj, str):
        out = obj.tolist()
        return out if isinstance(out, list) else [out]
    if isinstance(obj, (str, bytes)):
        raise TypeError("bezel_charts: pass numbers as a list, Series or array, not a string.")
    return list(obj)


def _is_default_index(index) -> bool:
    return type(index).__name__ == "RangeIndex"


def _number(v) -> float:
    if hasattr(v, "item") and not isinstance(v, (list, tuple)):
        try:
            v = v.item()
        except (TypeError, ValueError):
            pass
    if v is None or isinstance(v, bool):
        return float("nan") if v is None else float(v)
    try:
        return float(v)
    except (TypeError, ValueError):
        return float("nan")


def numbers(seq, what: str = "values") -> list:
    """Floats, with missing values drawn as 0 like the browser version, plus a warning."""
    out, missing = [], 0
    for v in _to_list(seq):
        n = _number(v)
        if not math.isfinite(n):
            missing += 1
            n = 0.0
        out.append(n)
    if missing:
        warnings.warn(
            f"bezel_charts: {missing} missing or non-numeric {what} drawn as 0. "
            "Use .dropna() or .fillna() first if that is not what you want.",
            stacklevel=4,
        )
    return out


def label(v, x_format: str | None = None) -> str:
    """A tidy text label: dates without midnight times, 2026.0 as 2026, missing as blank."""
    if hasattr(v, "item") and not hasattr(v, "strftime"):
        try:
            v = v.item()
        except (TypeError, ValueError):
            pass
    if v is None or (isinstance(v, float) and v != v):
        return ""
    if hasattr(v, "strftime"):
        if type(v).__name__ == "NaTType":
            return ""
        if x_format:
            return v.strftime(x_format)
        if any(getattr(v, part, 0) for part in ("hour", "minute", "second")):
            return v.strftime("%Y-%m-%d %H:%M")
        return v.strftime("%Y-%m-%d") if hasattr(v, "day") else str(v)
    if is_num(v):
        return js_str(v)
    return to_string(v)


def labels(seq, x_format: str | None = None) -> list:
    return [label(v, x_format) for v in _to_list(seq)]


def notes(value):
    """Accepts {"Mar": "Launch", 4: "Peak"} or [(key, text), ...] as well as the "key:text;..." string."""
    if value is None or isinstance(value, str):
        return value
    items = value.items() if isinstance(value, Mapping) else value
    parts = []
    for key, text in items:
        key_s, text_s = label(key), to_string(text)
        if ":" in key_s or ";" in key_s or ";" in text_s:
            raise ValueError(
                f"bezel_charts: note {key_s!r}: {text_s!r} cannot contain ';', and its key cannot contain ':'."
            )
        parts.append(f"{key_s}:{text_s}")
    return ";".join(parts)


def _numeric_columns(df, exclude) -> list:
    cols = []
    for col, dtype in zip(df.columns, df.dtypes):
        if col != exclude and getattr(dtype, "kind", "") in "iuf":
            cols.append(col)
    return cols


def prepare(data, x=None, y=None, x_format=None, single=False):
    """Returns (series values, series names or None, labels or None) for any supported input."""
    if _is_frame(data):
        if x is not None and x not in data.columns:
            raise KeyError(f"bezel_charts: column {x!r} not found. Columns: {list(data.columns)}")
        if y is None:
            ys = _numeric_columns(data, x)
            if not ys:
                raise ValueError("bezel_charts: no numeric columns to plot. Pick one with y='column'.")
        else:
            ys = [y] if isinstance(y, (str, int)) or not hasattr(y, "__iter__") else list(y)
        for col in ys:
            if col not in data.columns:
                raise KeyError(f"bezel_charts: column {col!r} not found. Columns: {list(data.columns)}")
        if single and len(ys) > 1:
            raise ValueError(f"bezel_charts: a sparkline draws one column. Choose one with y=, from {ys}.")
        values = [numbers(data[col], f"values in {col!r}") for col in ys]
        if x is not None:
            lbls = labels(data[x], x_format)
        elif not _is_default_index(data.index):
            lbls = labels(data.index, x_format)
        else:
            lbls = None
        names = [label(c) for c in ys] if len(ys) > 1 else None
        return values, names, lbls

    if x is not None or y is not None:
        raise TypeError("bezel_charts: x= and y= pick DataFrame columns. For lists, pass labels= instead.")

    if _is_series(data):
        lbls = None if _is_default_index(data.index) else labels(data.index, x_format)
        return [numbers(data)], None, lbls

    if isinstance(data, Mapping):
        if single and len(data) > 1:
            raise ValueError("bezel_charts: a sparkline draws one series. Pass a single list.")
        names = [label(k) for k in data]
        return [numbers(v, f"values in {k!r}") for k, v in data.items()], names, None

    rows = _to_list(data)
    if rows and all(hasattr(r, "__iter__") and not isinstance(r, str) for r in rows):
        if single and len(rows) > 1:
            raise ValueError("bezel_charts: a sparkline draws one series. Pass a single list.")
        return [numbers(r) for r in rows], None, None
    return [numbers(rows)], None, None
