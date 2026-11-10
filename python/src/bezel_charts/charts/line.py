"""Line chart, ported from src/charts/line.js."""

from __future__ import annotations

import math

from .._series import line_key, point_marks, series_line, xy_finish, xy_frame
from .._time import has_times, parse_dates, point_name
from .._tile import tile
from .._util import (
    DASHES, SHAPES, R, bool_, empty_state, fmt, has, jmax, jmin, lst, new_id, num, palette, parse_notes, path_of, series,
    small, stat_of, style_of, text, to_number, to_string, truthy,
)


def line(o, th) -> str:
    S = series(o.values)
    names = lst(o.series)
    labels = lst(o.labels)
    pal = palette(o, th)
    h = num(o.height, 170)
    n = int(jmax(0, *[len(s) for s in S]))
    notes = parse_notes(o, labels)
    multi = len(S) > 1 or len(names) > 0
    st = stat_of(S[0] if S else [], o, "")
    dash_of = style_of(o.dash, list(DASHES), "solid")
    mark_of = style_of(o.markers, SHAPES, "none")
    bg = to_string(o.background if truthy(o.background) else th["tile"])
    # With dashes or markers, the legend shows a short sample of each line instead of a dot.
    key = line_key(pal, dash_of, mark_of, bg) if dash_of or mark_of else None

    def name_of(k):
        return names[k] if k < len(names) and names[k] else "Series " + str(k + 1)

    T = parse_dates(o, n)
    timed = bool(T) and has_times(T)
    lang = o.lang if has(o.lang) else "en-GB"
    # A log scale needs positive values; zero and negative ones leave gaps. With none at all, the axis stays linear.
    flat = [x for v in S for x in v]
    pos = [x for x in flat if x > 0]
    if has(o.goal) and to_number(o.goal) > 0:
        pos.append(to_number(o.goal))
    log = bool_(o.log) and len(pos) > 0

    def draw(x0, y0, w, h):
        if not n:
            return empty_state(th, x0, y0, w, h)
        f = xy_frame(o, th, {
            "n": n, "names": [name_of(k) for k in range(len(S))] if multi else None, "pal": pal, "key": key,
            "kw": 24 if key else None, "lo": jmin(*flat), "hi": jmax(*flat), "zero": bool_(o.zero), "labels": labels,
            "notes": notes, "tick": lambda t: fmt(t, o, True), "dates": T,
            "min": to_number(o.min) if has(o.min) else math.nan, "max": to_number(o.max) if has(o.max) else math.nan,
            "log": log, "posLo": jmin(*pos) if log else 0, "posHi": jmax(*pos) if log else 0,
        }, x0, y0, w, h)
        s, X, Y, px, pw, top, ph = f.svg + ("<g" + f.clip + ">" if f.clip else ""), f.X, f.Y, f.px, f.pw, f.top, f.ph
        for k, v in enumerate(S):
            c = pal[k % len(pal)]
            P = [[X(i), Y(y)] for i, y in enumerate(v)]
            if len(P) == 1:
                P = [[px, P[0][1]], [px + pw, P[0][1]]]
            # On a log scale the line breaks around points it can't place.
            if log:
                runs = [[]]
                for p in P:
                    if math.isfinite(p[1]):
                        runs[-1].append(p)
                    elif runs[-1]:
                        runs.append([])
                runs = [r for r in runs if r]
            else:
                runs = [P]
            if not runs:
                continue
            d = "".join(path_of(r, bool_(o.straight)) for r in runs)
            P = [p for r in runs for p in r]
            # The soft fill under the first line has no floor to reach on a log scale, so it's left out there.
            if k == 0 and not log:
                g = new_id("g")
                last = P[-1]
                s += (
                    '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'
                    + c + '" stop-opacity=".26"/><stop offset="1" stop-color="' + c
                    + '" stop-opacity="0"/></linearGradient></defs>'
                    + '<path d="' + d + "L" + R(last[0]) + "," + R(top + ph) + "L" + R(P[0][0]) + "," + R(top + ph)
                    + 'Z" fill="url(#' + g + ')"' + (' class="bzc-a"' if o.animate else "") + "/>"
                )
            mk = mark_of(k) if mark_of else "none"
            s += series_line(o, d, c, k, DASHES[dash_of(k)] if dash_of else "")
            if mk != "none":
                s += point_marks(o, mk, v, X, Y, c, bg, k)
            else:
                e = P[-1]
                s += '<circle cx="' + R(e[0]) + '" cy="' + R(e[1]) + '" r="4" fill="' + c + '" stroke="' + bg + '" stroke-width="2"/>'
            if bool_(o.showValues):
                for i, y in enumerate(v):
                    if math.isfinite(Y(y)):
                        s += text(X(i), Y(y) - 8, fmt(y, o, True), small(th, 9, 'text-anchor="middle"'))
        if f.clip:
            s += "</g>"

        def tip(j):
            t = point_name(labels, T, j, lang, timed)
            for k, v in enumerate(S):
                if j < len(v):
                    t += "\n" + (name_of(k) + ": " if multi else "") + fmt(v[j], o)
            return t

        return s + xy_finish(o, th, f, n, tip)

    return tile(o, th, h, draw, {"stat": st, "summary": str(len(S)) + " series over " + str(n) + " points"})
