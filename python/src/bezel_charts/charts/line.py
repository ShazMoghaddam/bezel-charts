"""Line chart, ported from src/charts/line.js."""

from __future__ import annotations

import math

from .._tile import tile
from .._util import (
    N, R, bool_, clamp, empty_state, fmt, goal_line, has, hit, jmax, jmin, legend, lst, new_id, nice_scale, num,
    palette, parse_notes, path_of, series, small, stat_of, text, to_number, to_string, truthy, tw,
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

    def series_name(k):
        return names[k] if k < len(names) and names[k] else "Series " + str(k + 1)

    def draw(x0, y0, w, h):
        if not n:
            return empty_state(th, x0, y0, w, h)
        s = ""
        top = y0
        if multi:
            lg = legend([series_name(k) for k in range(len(S))], pal, th, x0, top, w)
            s += lg["svg"]
            top += lg["height"]
        flat = [x for v in S for x in v]
        mn, mx = jmin(*flat), jmax(*flat)
        if has(o.goal):
            mn = jmin(mn, to_number(o.goal))
            mx = jmax(mx, to_number(o.goal))
        if bool_(o.zero):
            mn = jmin(0, mn)
            mx = jmax(0, mx)
        sc = nice_scale(mn, mx, 4)
        tl = [fmt(t, o, True) for t in sc.ticks]
        axis_w = jmax(*[tw(t, 10, True) for t in tl]) + 10
        bottom = 20 if labels else 4
        px = x0 + axis_w
        pw = w - axis_w
        ph = h - (top - y0) - bottom

        def X(i):
            return px + pw / 2 if n == 1 else px + i * pw / (n - 1)

        def Y(v):
            return top + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph

        for i, t in enumerate(sc.ticks):
            y = Y(t)
            s += (
                '<line x1="' + R(px) + '" x2="' + R(px + pw) + '" y1="' + R(y) + '" y2="' + R(y) + '" stroke="'
                + th["grid"] + '"' + ("" if t == 0 else ' stroke-dasharray="2 4"') + "/>"
                + text(px - 8, y + 3.5, tl[i], small(th, 10, 'text-anchor="end"'))
            )
        if labels:
            widest = jmax(*[tw(lb, 10, True) for lb in labels])
            every = int(jmax(1, math.ceil(n * (widest + 10) / pw)))
            for i in range(0, n, every):
                if i >= len(labels):
                    continue
                anchor = "start" if n > 1 and i == 0 else "end" if n > 1 and i == n - 1 else "middle"
                s += text(X(i), top + ph + 15, labels[i], small(th, 10, 'text-anchor="' + anchor + '"'))
        for nt in notes:
            if nt["i"] >= n:
                continue
            x = X(nt["i"])
            s += (
                '<line x1="' + R(x) + '" x2="' + R(x) + '" y1="' + R(top + 12) + '" y2="' + R(top + ph) + '" stroke="'
                + th["fg"] + '" stroke-opacity=".4" stroke-dasharray="3 3"/>'
                + text(clamp(x, px + 30, px + pw - 30), top + 8, nt["text"], small(th, 10, 'text-anchor="middle"', th["fg"]))
            )
        tile_bg = o.background if truthy(o.background) else th["tile"]
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
            s += (
                '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" '
                'stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1'
                + (";animation-delay:" + N(k * 0.15) + "s" if o.animate else "") + '"'
                + (' class="bzc-d"' if o.animate else "") + "/>"
            )
            e = P[-1]
            s += (
                '<circle cx="' + R(e[0]) + '" cy="' + R(e[1]) + '" r="4" fill="' + c + '" stroke="' + to_string(tile_bg)
                + '" stroke-width="2"/>'
            )
            if bool_(o.showValues):
                for i, y in enumerate(v):
                    s += text(X(i), Y(y) - 8, fmt(y, o, True), small(th, 9, 'text-anchor="middle"'))
        if has(o.goal):
            s += goal_line(o, th, px, px + pw, Y(to_number(o.goal)))
        step = pw / (n - 1) if n > 1 else pw
        for j in range(n):
            tip = labels[j] if j < len(labels) and labels[j] else "#" + str(j + 1)
            for k, v in enumerate(S):
                if j < len(v):
                    tip += "\n" + (series_name(k) + ": " if multi else "") + fmt(v[j], o)
            s += hit(X(j) - step / 2, top, step, ph, tip)
        return s

    return tile(o, th, h, draw, {"stat": st, "summary": str(len(S)) + " series over " + str(n) + " points"})
