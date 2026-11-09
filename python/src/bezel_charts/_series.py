"""Helpers line and area charts share, ported from the xy helpers in src/core/series.js."""

from __future__ import annotations

import math

from ._util import (
    DASHES, N, R, anim, clamp, goal_line, has, hit, jmax, jmin, legend, marker, nice_scale, small, text, to_number, tw,
)


class Frame:
    """The scales and plot box xy_frame works out: X(i), Y(v), px, pw, top and ph."""

    def __init__(self, svg, X, Y, px, pw, top, ph):
        self.svg, self.X, self.Y, self.px, self.pw, self.top, self.ph = svg, X, Y, px, pw, top, ph


def xy_frame(o, th, c, x0, y0, w, h) -> Frame:
    """The legend, the value axis with its gridlines, labels along the bottom and notes. See xyFrame in JavaScript."""
    s = ""
    top = y0
    n = c["n"]
    labels = c["labels"]
    if c["names"] is not None:
        lg = legend(c["names"], c["pal"], th, x0, top, w, c["key"], c["kw"])
        s += lg["svg"]
        top += lg["height"]
    mn, mx = c["lo"], c["hi"]
    if has(o.goal):
        mn = jmin(mn, to_number(o.goal))
        mx = jmax(mx, to_number(o.goal))
    if c["zero"]:
        mn = jmin(0, mn)
        mx = jmax(0, mx)
    sc = nice_scale(mn, mx, 4)
    tl = [c["tick"](t) for t in sc.ticks]
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
    for nt in c["notes"]:
        if nt["i"] >= n:
            continue
        x = X(nt["i"])
        s += (
            '<line x1="' + R(x) + '" x2="' + R(x) + '" y1="' + R(top + 12) + '" y2="' + R(top + ph) + '" stroke="'
            + th["fg"] + '" stroke-opacity=".4" stroke-dasharray="3 3"/>'
            + text(clamp(x, px + 30, px + pw - 30), top + 8, nt["text"], small(th, 10, 'text-anchor="middle"', th["fg"]))
        )
    return Frame(s, X, Y, px, pw, top, ph)


def xy_finish(o, th, f: Frame, n, tip) -> str:
    """The goal line, then one hover column per point. tip(j) gives each column's tooltip."""
    s = goal_line(o, th, f.px, f.px + f.pw, f.Y(to_number(o.goal))) if has(o.goal) else ""
    step = f.pw / (n - 1) if n > 1 else f.pw
    for j in range(n):
        s += hit(f.X(j) - step / 2, f.top, step, f.ph, tip(j))
    return s


def line_key(pal, dash_of, mark_of, bg):
    """A legend swatch for a line: a short sample with its dash and marker."""

    def key(k, x, y):
        c = pal[k % len(pal)]
        dk = DASHES[dash_of(k)] if dash_of else ""
        mk = mark_of(k) if mark_of else "none"
        return (
            '<line x1="' + R(x) + '" x2="' + R(x + 18) + '" y1="' + R(y + 6) + '" y2="' + R(y + 6) + '" stroke="' + c
            + '" stroke-width="2.5" stroke-linecap="round"' + (' stroke-dasharray="' + dk + '"' if dk else "") + "/>"
            + (marker(mk, x + 9, y + 6, 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"') if mk != "none" else "")
        )

    return key


def series_line(o, d, c, k, dk) -> str:
    """A series line along path d. The draw-in animation is itself a dash, so dashed lines fade in instead."""
    if dk:
        return (
            '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" '
            'stroke-linejoin="round" stroke-dasharray="' + dk + '"' + anim(o, "bzc-a", k * 0.15) + "/>"
        )
    return (
        '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" '
        'stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1'
        + (";animation-delay:" + N(k * 0.15) + "s" if o.animate else "") + '"'
        + (' class="bzc-d"' if o.animate else "") + "/>"
    )


def point_marks(o, mk, ys, X, Y, c, bg, k) -> str:
    """Markers on a series' points. Long series get one on every few points, and always on the last."""
    s = ""
    every = math.ceil(len(ys) / 40)
    for i, y in enumerate(ys):
        if i % every == 0 or i == len(ys) - 1:
            s += marker(mk, X(i), Y(y), 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"' + anim(o, "bzc-a", 0.6 + k * 0.15))
    return s
