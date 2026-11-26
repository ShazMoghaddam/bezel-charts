"""Line chart, ported from src/charts/line.js."""

from __future__ import annotations

import math

from .._series import line_key, point_marks, series_line, xy_finish, xy_frame
from .._time import has_times, parse_dates, point_name
from .._bands import band_at, band_key, band_tip, band_values, bands_of, draw_bands
from .._tile import tile
from .._util import (
    DASHES, SHAPES, R, bool_, empty_state, fill_of, fmt, fmtv, gap_note, has, real, runs_of, jmax, jmin, lst, new_id, num, palette, parse_notes, path_of, series,
    small, stat_of, style_of, text, to_number, to_string, truthy,
)


def line(o, th) -> str:
    S = series(o.values)
    names = lst(o.series)
    labels = lst(o.labels)
    pal = palette(o, th)
    B = bands_of(o, pal, len(S))
    h = num(o.height, 170)
    n = int(jmax(0, *[len(s) for s in S], *[b["n"] for b in B]))
    notes = parse_notes(o, labels)
    multi = len(S) > 1 or len(names) > 0 or len(B) > 0
    st = stat_of(S[0] if S else [], o, "")
    dash_of = style_of(o.dash, list(DASHES), "solid")
    mark_of = style_of(o.markers, SHAPES, "none")
    bg = to_string(o.background if truthy(o.background) else th["tile"])
    # With dashes, markers or bands, the legend shows a short sample of each line instead of a dot, and each band's
    # shading.
    key = line_key(pal, dash_of, mark_of, bg) if dash_of or mark_of or B else None
    if B:
        line_sample = key

        def key(k, x, y):
            return line_sample(k, x, y) if k < len(S) else band_key(B[k - len(S)], x, y)

    def name_of(k):
        return names[k] if k < len(names) and names[k] else "Series " + str(k + 1)

    T = parse_dates(o, n)
    timed = bool(T) and has_times(T)
    lang = o.lang if has(o.lang) else "en-GB"
    # A log scale needs positive values; zero and negative ones leave gaps. With none at all, the axis stays linear.
    flat = [x for v in S for x in v]
    all_ = real(flat + band_values(B))
    pos = [x for x in all_ if x > 0]
    if has(o.goal) and to_number(o.goal) > 0:
        pos.append(to_number(o.goal))
    log = bool_(o.log) and len(pos) > 0
    # Bands are shaded already, so the soft fill under the first line is off unless you ask for it.
    fill = "none" if B and not has(o.fill) else fill_of(o)

    def draw(x0, y0, w, h):
        if not all_:
            return empty_state(th, x0, y0, w, h)
        f = xy_frame(o, th, {
            "n": n, "names": [name_of(k) for k in range(len(S))] + [b["name"] for b in B] if multi else None, "pal": pal, "key": key,
            "kw": 24 if key else None, "lo": jmin(*all_), "hi": jmax(*all_), "zero": bool_(o.zero), "labels": labels,
            "notes": notes, "tick": lambda t: fmt(t, o, True), "dates": T,
            "min": to_number(o.min) if has(o.min) else math.nan, "max": to_number(o.max) if has(o.max) else math.nan,
            "log": log, "posLo": jmin(*pos) if log else 0, "posHi": jmax(*pos) if log else 0,
        }, x0, y0, w, h)
        s, X, Y, px, pw, top, ph = f.svg + ("<g" + f.clip + ">" if f.clip else ""), f.X, f.Y, f.px, f.pw, f.top, f.ph
        # Bands go underneath, so the lines read on top of them.
        if B:
            s += draw_bands(o, B, X, Y, bool_(o.straight), bg, len(S))
        for k, v in enumerate(S):
            c = pal[k % len(pal)]
            P = [[X(i), Y(y)] for i, y in enumerate(v)]
            if len(P) == 1:
                P = [[px, P[0][1]], [px + pw, P[0][1]]]
            # The line breaks at a missing value, and on a log scale around points it can't place.
            runs = runs_of(P)
            if not runs:
                continue
            d = "".join(path_of(r, bool_(o.straight)) for r in runs)
            P = [p for r in runs for p in r]
            # A soft fill under the first line, every line or none. It has no floor to reach on a log scale, so it's
            # left out there.
            if (fill == "all" or (fill == "first" and k == 0)) and not log:
                g = new_id("g")
                s += (
                    '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'
                    + c + '" stop-opacity="' + (".16" if fill == "all" and len(S) > 1 else ".26") + '"/><stop offset="1" stop-color="' + c
                    + '" stop-opacity="0"/></linearGradient></defs>'
                    + '<path d="' + "".join(
                        path_of(r, bool_(o.straight)) + "L" + R(r[-1][0]) + "," + R(top + ph) + "L" + R(r[0][0]) + "," + R(top + ph) + "Z"
                        for r in runs
                    ) + '" fill="url(#' + g + ')"' + (' class="bzc-a"' if o.animate else "") + "/>"
                )
            mk = mark_of(k) if mark_of else "none"
            s += series_line(o, d, c, k, DASHES[dash_of(k)] if dash_of else "")
            if mk != "none":
                s += point_marks(o, mk, v, X, Y, c, bg, k)
            else:
                # A value on its own between gaps has no line to sit on, so it gets a dot.
                for q, r in enumerate(runs):
                    if len(r) == 1 and q < len(runs) - 1:
                        s += '<circle cx="' + R(r[0][0]) + '" cy="' + R(r[0][1]) + '" r="2.5" fill="' + c + '"/>'
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
            tips = "".join(band_tip(b, j, o) for b in B)
            # Where the bands carry on past a line, such as a forecast after its history, the line's gap isn't listed.
            for k, v in enumerate(S):
                if j < len(v) and not (tips and not math.isfinite(v[j])):
                    t += "\n" + (name_of(k) + ": " if multi else "") + fmtv(v[j], o)
            return t + tips

        return s + xy_finish(o, th, f, n, tip, S)

    # A line that stops where the bands carry on, such as history before a forecast, isn't missing anything there.
    counted = [x for v in S for i, x in enumerate(v) if not band_at(B, i)] if B else flat
    word = " and " + str(len(B)) + (" band" if len(B) == 1 else " bands") if B else ""
    return tile(o, th, h, draw, {"stat": st, "summary": str(len(S)) + " series" + word + " over " + str(n) + " points" + gap_note(counted)})
