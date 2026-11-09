"""Line chart, ported from src/charts/line.js."""

from __future__ import annotations

from .._series import line_key, point_marks, series_line, xy_finish, xy_frame
from .._tile import tile
from .._util import (
    DASHES, SHAPES, R, bool_, empty_state, fmt, jmax, jmin, lst, new_id, num, palette, parse_notes, path_of, series,
    small, stat_of, style_of, text, to_string, truthy,
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

    def draw(x0, y0, w, h):
        if not n:
            return empty_state(th, x0, y0, w, h)
        flat = [x for v in S for x in v]
        f = xy_frame(o, th, {
            "n": n, "names": [name_of(k) for k in range(len(S))] if multi else None, "pal": pal, "key": key,
            "kw": 24 if key else None, "lo": jmin(*flat), "hi": jmax(*flat), "zero": bool_(o.zero), "labels": labels,
            "notes": notes, "tick": lambda t: fmt(t, o, True),
        }, x0, y0, w, h)
        s, X, Y, px, pw, top, ph = f.svg, f.X, f.Y, f.px, f.pw, f.top, f.ph
        for k, v in enumerate(S):
            c = pal[k % len(pal)]
            P = [[X(i), Y(y)] for i, y in enumerate(v)]
            if len(P) == 1:
                P = [[px, P[0][1]], [px + pw, P[0][1]]]
            d = path_of(P, bool_(o.straight))
            if k == 0:
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
                    s += text(X(i), Y(y) - 8, fmt(y, o, True), small(th, 9, 'text-anchor="middle"'))

        def tip(j):
            t = labels[j] if j < len(labels) and labels[j] else "#" + str(j + 1)
            for k, v in enumerate(S):
                if j < len(v):
                    t += "\n" + (name_of(k) + ": " if multi else "") + fmt(v[j], o)
            return t

        return s + xy_finish(o, th, f, n, tip)

    return tile(o, th, h, draw, {"stat": st, "summary": str(len(S)) + " series over " + str(n) + " points"})
