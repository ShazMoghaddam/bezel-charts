"""Helpers line and area charts share, ported from the xy helpers in src/core/series.js."""

from __future__ import annotations

import math

from ._time import date_ticks
from ._util import (
    at, DASHES, N, R, anim, clamp, goal_line, has, hit, jmax, jmin, legend, marker, new_id, nice_scale, small, text,
    to_number, tw,
)


class Frame:
    """The scales and plot box xy_frame works out: X(i), Y(v), px, pw, top and ph, plus clip and uneven."""

    def __init__(self, svg, X, Y, px, pw, top, ph, clip="", uneven=False):
        self.svg, self.X, self.Y, self.px, self.pw, self.top, self.ph = svg, X, Y, px, pw, top, ph
        self.clip, self.uneven = clip, uneven


class _Scale:
    def __init__(self, lo, hi, ticks, log=False, a=0, b=0):
        self.lo, self.hi, self.ticks, self.log, self.a, self.b = lo, hi, ticks, log, a, b


def fixed_scale(lo, hi, has_min, has_max):
    """A scale from lo to hi where min, max or both are fixed. See fixedScale in JavaScript."""
    nice = nice_scale(lo, hi, 4)
    a = lo if has_min else nice.lo
    b = hi if has_max else nice.hi
    step = nice.ticks[1] - nice.ticks[0]
    ticks = [t for t in nice.ticks if a - step * 1e-9 <= t <= b + step * 1e-9]
    if has_min and (not ticks or ticks[0] - a > step * 0.4):
        ticks.insert(0, a)
    if has_max and (not ticks or b - ticks[-1] > step * 0.4):
        ticks.append(b)
    return _Scale(a, b, ticks)


def log_scale(lo, hi):
    """Whole powers of ten from lo to hi, with 2 and 5 between them when it spans two powers or fewer."""
    a = math.floor(math.log10(lo))
    b = math.ceil(math.log10(hi))
    if b == a:
        b += 1
    ticks = []
    for e in range(a, b + 1):
        p = float("1e" + str(e))
        ticks.append(p)
        if b - a <= 2 and e < b:
            ticks += [2 * p, 5 * p]
    return _Scale(ticks[0], ticks[-1], ticks, True, a, b)


def xy_frame(o, th, c, x0, y0, w, h) -> Frame:
    """The legend, the value axis with its gridlines, labels along the bottom and notes. See xyFrame in JavaScript."""
    s = ""
    top = y0
    n = c["n"]
    labels = c["labels"]
    T = c.get("dates")
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
    # A min or max you set wins over the data, the goal and zero. Both together must leave some room between them.
    cmin, cmax = c.get("min", math.nan), c.get("max", math.nan)
    has_min, has_max = math.isfinite(cmin), math.isfinite(cmax)
    if has_min and has_max and cmin >= cmax:
        has_min = has_max = False
    if c.get("log"):
        sc = log_scale(cmin if has_min and cmin > 0 else c["posLo"], cmax if has_max and cmax > 0 else c["posHi"])
    elif has_min or has_max:
        sc = fixed_scale(cmin if has_min else mn, cmax if has_max else mx, has_min, has_max)
    else:
        sc = nice_scale(mn, mx, 4)
    tl = [c["tick"](t) for t in sc.ticks]
    axis_w = jmax(*[tw(t, 10, True) for t in tl]) + 10
    bottom = 20 if labels or T else 4
    px = x0 + axis_w
    pw = w - axis_w
    ph = h - (top - y0) - bottom
    t0 = jmin(*T) if T else 0
    span = jmax(*T) - t0 if T else 0

    # With dates, points sit where they fall in time; otherwise they are evenly spaced.
    def X(i):
        if T:
            return px + (T[i] - t0) / span * pw if span else px + pw / 2
        return px + pw / 2 if n == 1 else px + i * pw / (n - 1)

    def Y(v):
        if getattr(sc, "log", False):
            return top + ph - (math.log10(v) - sc.a) / (sc.b - sc.a) * ph if v > 0 else math.nan
        return top + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph

    clip = ""
    if has_min or has_max:
        cid = new_id("c")
        s += (
            '<defs><clipPath id="' + cid + '"><rect x="' + R(px - 4) + '" y="' + R(top - 4) + '" width="' + R(pw + 8)
            + '" height="' + R(ph + 8) + '"/></clipPath></defs>'
        )
        clip = ' clip-path="url(#' + cid + ')"'

    for i, t in enumerate(sc.ticks):
        y = Y(t)
        s += (
            '<line x1="' + R(px) + '" x2="' + R(px + pw) + '" y1="' + R(y) + '" y2="' + R(y) + '" stroke="'
            + th["grid"] + '"' + ("" if t == 0 else ' stroke-dasharray="2 4"') + "/>"
            + text(px - 8, y + 3.5, tl[i], small(th, 10, 'text-anchor="end"'))
        )
    if T:
        # Date ticks pick their own step, and labels near the ends are nudged in so they stay inside the plot.
        for d in date_ticks(t0, t0 + span, pw, o.lang if has(o.lang) else "en-GB"):
            half = tw(d["text"], 10, True) / 2
            x = px + (d["t"] - t0) / span * pw if span else px + pw / 2
            s += text(clamp(x, px + half, px + pw - half), top + ph + 15, d["text"], small(th, 10, 'text-anchor="middle"'))
    elif labels:
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
    return Frame(s, X, Y, px, pw, top, ph, clip, bool(T))


def xy_finish(o, th, f: Frame, n, tip, S) -> str:
    """The goal line, then one hover column per point; dated points reach halfway to each neighbour."""
    g = f.Y(to_number(o.goal)) if has(o.goal) else math.nan
    s = goal_line(o, th, f.px, f.px + f.pw, g) if math.isfinite(g) else ""
    step = f.pw / (n - 1) if n > 1 else f.pw
    X = f.X
    for j in range(n):
        if not f.uneven:
            s += hit(X(j) - step / 2, f.top, step, f.ph, tip(j), j, at(S, j))
            continue
        left = (X(j - 1) + X(j)) / 2 if j else X(0) - ((X(1) - X(0)) / 2 if n > 1 else f.pw / 2)
        right = (X(j) + X(j + 1)) / 2 if j < n - 1 else X(j) + ((X(j) - X(j - 1)) / 2 if n > 1 else f.pw / 2)
        s += hit(left, f.top, jmax(1, right - left), f.ph, tip(j), j, at(S, j))
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
        # On a log scale, zero and negative values have no position, so they get no marker.
        if not math.isfinite(Y(y)):
            continue
        if i % every == 0 or i == len(ys) - 1:
            s += marker(mk, X(i), Y(y), 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"' + anim(o, "bzc-a", 0.6 + k * 0.15))
    return s
