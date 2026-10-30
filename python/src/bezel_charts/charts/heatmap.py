"""Calendar heatmap, one square per day. Ported from src/charts/heatmap.js."""

from __future__ import annotations

import datetime as dt
import math
import re

from .._js import full_date, month_short, weekday_short
from .._tile import dims, tile
from .._util import N, R, empty_state, esc, fmt, has, jmax, jmin, nums, palette, small, stat_of, text, to_string, total, truthy

_ISO = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")


def _parse_start(value) -> dt.date:
    """'YYYY-MM-DD' read like new Date(...) in V8, which rolls days 29 to 31 into the next month."""
    m = _ISO.match(to_string(value))
    y, mo, d = (int(g) for g in m.groups())
    if not 1 <= mo <= 12 or not 1 <= d <= 31:
        raise ValueError(f'bezel_charts: start must be a real date as YYYY-MM-DD, not "{to_string(value)}".')
    return dt.date(y, mo, 1) + dt.timedelta(days=d - 1)


def heatmap(o, th) -> str:
    v = nums(o.values)
    c = palette(o, th)[0]
    lang = o.lang if truthy(o.lang) else "en-GB"
    if has(o.start) and _ISO.match(to_string(o.start)):
        start = _parse_start(o.start)
    else:
        start = dt.date.today() - dt.timedelta(days=max(0, len(v) - 1))
    offset = start.weekday()
    cols = int(jmax(1, math.ceil((offset + len(v)) / 7)))
    d0 = dims(o)
    left_w = 28
    max_cols = int(jmax(1, math.floor((d0["w"] - left_w) / 10)))
    # On narrow screens keep the most recent weeks that fit, rather than shrinking cells until they are unreadable.
    if cols > max_cols:
        drop = (cols - max_cols) * 7 - offset
        v = v[drop:]
        start = start + dt.timedelta(days=drop)
        offset = 0
        cols = max_cols
    pitch = jmin(18, (d0["w"] - left_w) / cols)
    gap = 1 if pitch < 8 else 3
    cell = pitch - gap
    h = 16 + 7 * pitch + 26
    mx = jmax(*v) if v else 0
    st = stat_of(v, o, "")

    def draw(x0, y0, w, h):
        if not v:
            return empty_state(th, x0, y0, w, h)
        s = ""
        gx, gy = x0 + left_w, y0 + 16
        last_month_x = -99
        op = [0.28, 0.5, 0.75, 1]
        if pitch >= 9:
            for r in (0, 2, 4):
                s += text(x0, gy + r * pitch + cell / 2 + 3.5, weekday_short(dt.date(2024, 1, 1 + r), lang), small(th, 9))
        for i, val in enumerate(v):
            k = offset + i
            col, row = k // 7, k % 7
            day = start + dt.timedelta(days=i)
            x = gx + col * pitch
            y = gy + row * pitch
            if (day.day == 1 or i == 0) and x - last_month_x > 30:
                s += text(x, y0 + 9, month_short(day, lang), small(th, 9))
                last_month_x = x
            lvl = 0 if val <= 0 or not mx else math.ceil(val / mx * 4)
            fill = c if lvl else th["grid"]
            fo = op[lvl - 1] if lvl else 0.7
            s += (
                '<rect x="' + R(x) + '" y="' + R(y) + '" width="' + R(cell) + '" height="' + R(cell) + '" rx="'
                + R(cell * 0.24) + '" fill="' + fill + '" fill-opacity="' + N(fo) + '"'
                + (' class="bzc-a" style="animation-delay:' + R(col * 0.012) + 's"' if o.animate else "")
                + ' data-tip="' + esc(full_date(day, lang) + ": " + fmt(val, o)) + '"/>'
            )
        ly = gy + 7 * pitch + 14
        lc = 10
        lx = x0 + w - 5 * (lc + 3) - 30
        s += text(x0, ly + 8, fmt(total(v), o, True) + " in " + str(len(v)) + " days", small(th, 10))
        s += text(lx - 6, ly + 8, "Less", small(th, 9, 'text-anchor="end"'))
        for j in range(5):
            s += (
                '<rect x="' + R(lx + j * (lc + 3)) + '" y="' + N(ly) + '" width="' + N(lc) + '" height="' + N(lc)
                + '" rx="2.5" fill="' + (c if j else th["grid"]) + '" fill-opacity="' + N(op[j - 1] if j else 0.7) + '"/>'
            )
        s += text(lx + 5 * (lc + 3) + 3, ly + 8, "More", small(th, 9))
        return s

    return tile(o, th, h, draw, {"stat": st, "summary": fmt(total(v), o) + " across " + str(len(v)) + " days"})
