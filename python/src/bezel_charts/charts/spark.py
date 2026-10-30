"""Sparkline, ported from src/charts/spark.js."""

from __future__ import annotations

from .._tile import tile
from .._util import (
    N, R, anim, bool_, clamp, empty_state, fmt, goal_line, has, hit, jmax, jmin, lst, new_id, num, nums,
    palette, parse_notes, path_of, small, stat_of, text, to_number, truthy,
)


def spark(o, th) -> str:
    v = nums(o.values)
    c = palette(o, th)[0]
    h = num(o.height, 64)
    labels = lst(o.labels)
    notes = parse_notes(o, labels)
    st = stat_of(v, o, "last")

    def draw(x0, y0, w, h):
        if not v:
            return empty_state(th, x0, y0, w, h)
        pts = [v[0], v[0]] if len(v) == 1 else v
        mn, mx = jmin(*pts), jmax(*pts)
        if has(o.goal):
            mn = jmin(mn, to_number(o.goal))
            mx = jmax(mx, to_number(o.goal))
        spread = mx - mn
        pad = (spread if truthy(spread) else abs(mx) if truthy(abs(mx)) else 1) * 0.12
        mn -= pad
        mx += pad

        def X(i):
            return x0 + i * w / (len(pts) - 1)

        def Y(n):
            return y0 + h - (n - mn) / (mx - mn) * h

        P = [[X(i), Y(n)] for i, n in enumerate(pts)]
        d = path_of(P, bool_(o.straight))
        g = new_id("g")
        last = P[-1]
        s = (
            '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c
            + '" stop-opacity=".32"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>'
        )
        for f in (1 / 3, 2 / 3):
            s += (
                '<line x1="' + N(x0) + '" x2="' + N(x0 + w) + '" y1="' + R(y0 + h * f) + '" y2="' + R(y0 + h * f)
                + '" stroke="' + th["grid"] + '" stroke-dasharray="2 4"/>'
            )
        s += (
            '<path d="' + d + "L" + R(last[0]) + "," + N(y0 + h) + "L" + N(x0) + "," + N(y0 + h)
            + 'Z" fill="url(#' + g + ')"' + anim(o, "bzc-a") + "/>"
        )
        s += (
            '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" '
            'stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1"' + anim(o, "bzc-d") + "/>"
        )
        if has(o.goal):
            s += goal_line(o, th, x0, x0 + w, Y(to_number(o.goal)))
        for n in notes:
            if n["i"] >= len(v):
                continue
            p = P[n["i"]]
            s += (
                '<circle cx="' + R(p[0]) + '" cy="' + R(p[1]) + '" r="3.5" fill="' + th["fg"] + '"/>'
                + text(clamp(p[0], x0 + 30, x0 + w - 30), p[1] - 9, n["text"], small(th, 10, 'text-anchor="middle"', th["fg"]))
            )
        s += (
            '<circle cx="' + R(last[0]) + '" cy="' + R(last[1]) + '" r="9" fill="' + c + '" fill-opacity=".25"/>'
            '<circle cx="' + R(last[0]) + '" cy="' + R(last[1]) + '" r="4.5" fill="' + c + '"/>'
        )
        if bool_(o.showValues):
            for i, p in enumerate(P):
                if i < len(v):
                    s += text(p[0], p[1] - 8, fmt(v[i], o, True), small(th, 9, 'text-anchor="middle"'))
        step = w / (len(v) - 1) if len(v) > 1 else w
        for i, n in enumerate(v):
            label = labels[i] if i < len(labels) and labels[i] else "#" + str(i + 1)
            s += hit(X(i) - step / 2, y0 - 6, step, h + 12, label + ": " + fmt(n, o))
        return s

    return tile(o, th, h, draw, {"stat": st, "summary": "latest " + fmt(v[-1], o) if v else "no data"})
