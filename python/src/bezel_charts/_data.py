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
            raise ValueError(f"bezel_charts: this chart draws one column. Choose one with y=, from {ys}.")
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
            raise ValueError("bezel_charts: this chart draws one series. Pass a single list.")
        names = [label(k) for k in data]
        return [numbers(v, f"values in {k!r}") for k, v in data.items()], names, None

    rows = _to_list(data)
    if rows and all(hasattr(r, "__iter__") and not isinstance(r, str) for r in rows):
        if single and len(rows) > 1:
            raise ValueError("bezel_charts: this chart draws one series. Pass a single list.")
        return [numbers(r) for r in rows], None, None
    return [numbers(rows)], None, None


# Scatter and heatmap take their data differently from the other charts --------------------

def _column(data, name):
    if name not in data.columns:
        raise KeyError(f"bezel_charts: column {name!r} not found. Columns: {list(data.columns)}")
    return _to_list(data[name])


def scatter_groups(data, x, y, by=None, label_col=None):
    """Returns (xs per group, ys per group, group names or None, point labels or None).

    Rows with a missing x or y are dropped, since a point needs both to have a place.
    """
    if _is_frame(data):
        if x is None or y is None:
            raise TypeError("bezel_charts: pass the column names, for example scatter(df, x='hours', y='score').")
        xs_all, ys_all = _column(data, x), _column(data, y)
        keys = _column(data, by) if by is not None else [None] * len(xs_all)
        lbls_all = _column(data, label_col) if label_col is not None else None
    else:
        if data is not None:
            raise TypeError("bezel_charts: pass a DataFrame with x= and y= columns, or the values as x= and y=.")
        if x is None or y is None:
            raise TypeError("bezel_charts: a scatter plot needs both x= and y=.")
        if by is not None or label_col is not None:
            raise TypeError("bezel_charts: by= and label= pick DataFrame columns.")
        xl, yl = _to_list(x), _to_list(y)
        if xl and all(hasattr(r, "__iter__") and not isinstance(r, str) for r in xl):
            groups_x = [_to_list(r) for r in xl]
            groups_y = [_to_list(r) for r in yl]
            out_x, out_y = [], []
            for gx, gy in zip(groups_x, groups_y):
                px, py = _paired(gx, gy)
                out_x.append(px)
                out_y.append(py)
            return out_x, out_y, None, None
        px, py = _paired(xl, yl)
        return [px], [py], None, None

    order, gx, gy, glab, dropped = [], {}, {}, {}, 0
    for i, (xv, yv) in enumerate(zip(xs_all, ys_all)):
        xn, yn = _number(xv), _number(yv)
        if not (math.isfinite(xn) and math.isfinite(yn)):
            dropped += 1
            continue
        key = keys[i]
        if key not in gx:
            order.append(key)
            gx[key], gy[key], glab[key] = [], [], []
        gx[key].append(xn)
        gy[key].append(yn)
        glab[key].append(label(lbls_all[i]) if lbls_all is not None else "")
    _warn_dropped(dropped)
    names = [label(k) for k in order] if by is not None else None
    lbls = [t for k in order for t in glab[k]] if lbls_all is not None else None
    return [gx[k] for k in order], [gy[k] for k in order], names, lbls


def _paired(xs, ys):
    out_x, out_y, dropped = [], [], 0
    for xv, yv in zip(xs, ys):
        xn, yn = _number(xv), _number(yv)
        if math.isfinite(xn) and math.isfinite(yn):
            out_x.append(xn)
            out_y.append(yn)
        else:
            dropped += 1
    _warn_dropped(dropped)
    return out_x, out_y


def _warn_dropped(dropped: int) -> None:
    if dropped:
        warnings.warn(
            f"bezel_charts: {dropped} point{'s' if dropped != 1 else ''} with a missing x or y "
            f"{'were' if dropped != 1 else 'was'} left out.",
            stacklevel=5,
        )


def to_date(v):
    """A datetime.date from a date, datetime, pandas Timestamp or 'YYYY-MM-DD' string."""
    import datetime as dt

    if isinstance(v, str):
        return dt.date.fromisoformat(v[:10])
    if isinstance(v, dt.datetime) or (hasattr(v, "date") and callable(v.date) and not isinstance(v, dt.date)):
        return v.date()
    if isinstance(v, dt.date):
        return v
    raise TypeError(f"bezel_charts: {v!r} is not a date.")


def _is_datelike(v) -> bool:
    return hasattr(v, "strftime") or (isinstance(v, str) and len(v) >= 10 and v[4:5] == "-" and v[7:8] == "-")


def daily(data, x=None, y=None):
    """Values per day from dated data. Returns (values, start date) or None for plain numbers.

    Totals come from a value column or a Series with a date index; with dates alone, each day counts its rows.
    Days with nothing get 0, so the calendar has no gaps.
    """
    import datetime as dt

    if _is_frame(data):
        dates = _column(data, x) if x is not None else (
            _to_list(data.index) if not _is_default_index(data.index) else None
        )
        if dates is None:
            raise TypeError("bezel_charts: name the date column with x=, for example heatmap(df, x='date', y='commits').")
        amounts = numbers(_column(data, y), f"values in {y!r}") if y is not None else [1.0] * len(dates)
    elif _is_series(data) and not _is_default_index(data.index) and all(_is_datelike(i) for i in _to_list(data.index)[:5]):
        dates, amounts = _to_list(data.index), numbers(data)
    else:
        items = _to_list(data)
        if not items or not all(_is_datelike(i) for i in items if i is not None):
            return None
        dates, amounts = items, [1.0] * len(items)

    per_day: dict = {}
    for d, a in zip(dates, amounts):
        if d is None or type(d).__name__ == "NaTType":
            continue
        day = to_date(d)
        per_day[day] = per_day.get(day, 0.0) + a
    if not per_day:
        return [], None
    first, last = min(per_day), max(per_day)
    span = (last - first).days + 1
    return [per_day.get(first + dt.timedelta(days=i), 0.0) for i in range(span)], first


def parts(data, x=None, y=None, x_format=None):
    """Values and their names for rings and donuts. A dict maps each name to its value."""
    if isinstance(data, Mapping):
        if x is not None or y is not None:
            raise TypeError("bezel_charts: x= and y= pick DataFrame columns.")
        return numbers(list(data.values())), [label(k) for k in data]
    values, _, lbls = prepare(data, x, y, x_format, single=True)
    return values[0], lbls
