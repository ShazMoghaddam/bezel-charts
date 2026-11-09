"""Area chart, ported from src/charts/area.js."""

from __future__ import annotations

from .._js import js_round
from .._series import line_key, point_marks, series_line, xy_finish, xy_frame
from .._tile import tile
from .._util import (
    DASHES, PATTERNS, SHAPES, Opts, R, bool_, empty_state, fmt, jmax, jmin, lst, new_id, num, palette, parse_notes,
    path_of, pattern, series, small, stat_of, style_of, text, to_string, truthy,
)


def area(o, th) -> str:
    S = series(o.values)
    names = lst(o.series)
    labels = lst(o.labels)
    pal = palette(o, th)
    h = num(o.height, 170)
    k = len(S)
    n = int(jmax(0, *[len(s) for s in S]))
    mode = ("percent" if o.stacked == "percent" else "stack" if bool_(o.stacked) else "") if k > 1 else ""
    notes = parse_notes(o, labels)
    multi = k > 1 or len(names) > 0

    def name_of(j):
        return names[j] if j < len(names) and names[j] else "Series " + str(j + 1)

    def val(j, i):
        return S[j][i] if i < len(S[j]) else 0

    # Where each band starts and ends in every column. In a stack, positive parts pile up from zero and negative parts
    # down from it, as stacked bars do. In a percent stack, each column's positive parts are scaled to add up to 100.
    lows = [[] for _ in S]
    highs = [[] for _ in S]
    totals, pos = [], []
    for i in range(n):
        up = down = t = p = 0
        for j in range(k):
            t += val(j, i)
            p += jmax(0, val(j, i))
        totals.append(t)
        pos.append(p)
        for j in range(k):
            v = (jmax(0, val(j, i)) / p * 100 if p else 0) if mode == "percent" else val(j, i)
            if not mode:
                lows[j].append(0)
                highs[j].append(v)
            elif v >= 0:
                lows[j].append(up)
                up += v
                highs[j].append(up)
            else:
                lows[j].append(down)
                down += v
                highs[j].append(down)
    edges = [x for band in lows + highs for x in band]

    dash_of = style_of(o.dash, list(DASHES), "solid")
    mark_of = style_of(o.markers, SHAPES, "none")
    pat_of = style_of(o.patterns, PATTERNS, "solid") if k > 1 else None
    bg = to_string(o.background if truthy(o.background) else th["tile"])
    defs = ""
    fills = {}
    for q in range(k if pat_of else 0):
        if pat_of(q) == "solid":
            continue
        pid = new_id("g")
        defs += pattern(pid, pat_of(q), pal[q % len(pal)], bg)
        fills[q] = "url(#" + pid + ")"

    # The legend shows each band's pattern, or a sample of its edge when lines have dashes or markers.
    def pattern_key(j, x, y):
        return '<rect x="' + R(x) + '" y="' + R(y + 1) + '" width="10" height="10" rx="2" fill="' + (fills.get(j) or pal[j % len(pal)]) + '"/>'

    key = pattern_key if pat_of else line_key(pal, dash_of, mark_of, bg) if dash_of or mark_of else None

    def share(j, i):
        return js_round(jmax(0, val(j, i)) / pos[i] * 100) if pos[i] else 0

    def draw(x0, y0, w, h):
        if not n:
            return empty_state(th, x0, y0, w, h)
        plain = Opts({"lang": o.lang})
        f = xy_frame(o, th, {
            "n": n, "names": [name_of(j) for j in range(k)] if multi else None, "pal": pal, "key": key,
            "kw": (15 if pat_of else 24) if key else None, "lo": jmin(*edges), "hi": jmax(*edges), "zero": True,
            "labels": labels, "notes": notes,
            "tick": (lambda t: fmt(t, plain, True) + "%") if mode == "percent" else (lambda t: fmt(t, o, True)),
        }, x0, y0, w, h)
        s = ("<defs>" + defs + "</defs>" if defs else "") + f.svg
        X, Y = f.X, f.Y

        # One value stretches across the chart, like a line chart does.
        def pts(ys):
            P = [[X(i), Y(y)] for i, y in enumerate(ys)]
            return [[f.px, P[0][1]], [f.px + f.pw, P[0][1]]] if len(P) == 1 else P

        straight = bool_(o.straight)
        alpha = ".8" if mode else ".22"

        def shown(j):
            return highs[j] if mode else S[j]

        # Fills first, so no band covers another's edge.
        for j in range(k):
            top = pts(shown(j))
            base = list(reversed(pts(lows[j] if mode else [0 for _ in shown(j)])))
            s += (
                '<path d="' + path_of(top, straight) + "L" + path_of(base, straight)[1:] + 'Z" fill="'
                + (fills.get(j) or pal[j % len(pal)]) + '" fill-opacity="' + alpha + '"'
                + (' class="bzc-a" style="animation-delay:' + R(j * 0.1) + 's"' if o.animate else "") + "/>"
            )
        for j in range(k):
            c = pal[j % len(pal)]
            ys = shown(j)
            P = pts(ys)
            mk = mark_of(j) if mark_of else "none"
            s += series_line(o, path_of(P, straight), c, j, DASHES[dash_of(j)] if dash_of else "")
            if mk != "none":
                s += point_marks(o, mk, ys, X, Y, c, bg, j)
            elif not mode:
                s += '<circle cx="' + R(P[-1][0]) + '" cy="' + R(P[-1][1]) + '" r="4" fill="' + c + '" stroke="' + bg + '" stroke-width="2"/>'
            if bool_(o.showValues) and not mode:
                for i, y in enumerate(ys):
                    s += text(X(i), Y(y) - 8, fmt(y, o, True), small(th, 9, 'text-anchor="middle"'))
        # A stack writes its total above each column. Every column of a percent stack is 100%, so it writes nothing.
        if bool_(o.showValues) and mode == "stack":
            for i, t in enumerate(totals):
                top_v = jmax(*[hs[i] for hs in highs], 0)
                s += text(X(i), Y(top_v) - 8, fmt(t, o, True), small(th, 9, 'text-anchor="middle"'))

        def tip(i):
            t = labels[i] if i < len(labels) and labels[i] else "#" + str(i + 1)
            for j, ser in enumerate(S):
                if i < len(ser):
                    t += "\n" + (name_of(j) + ": " if multi else "") + fmt(ser[i], o) + (" (" + R(share(j, i)) + "%)" if mode == "percent" else "")
            return t + ("\nTotal: " + fmt(totals[i], o) if mode else "")

        return s + xy_finish(o, th, f, n, tip)

    word = "as shares of each total" if mode == "percent" else "stacked" if mode else "filled"
    return tile(o, th, h, draw, {
        "stat": stat_of(totals if mode else (S[0] if S else []), o, ""),
        "summary": str(k) + " series " + word + " over " + str(n) + " points",
    })
