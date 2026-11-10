"""Box plot, ported from src/charts/boxplot.js."""

from __future__ import annotations

import math

from .._tile import tile
from .._util import (
    R, anim, bool_, empty_state, fmt, goal_line, has, hit, jmax, jmin, lst, marker, nice_scale, num, palette, series,
    small, text, to_number, to_string, trunc, truthy, tw,
)


def boxplot(o, th) -> str:
    S = series(o.values)
    names = lst(o.series)
    pal = palette(o, th)
    k = len(S)
    horiz = bool_(o.horizontal)
    many = len(lst(o.color)) > 1
    show_mean = "mean" in lst(o.mark)
    stats = [summary(v, o.whiskers == "range") for v in S]
    h = num(o.height, jmax(120, k * 36 + 24) if horiz else 200)

    def name_of(i):
        return names[i] if i < len(names) and names[i] else "Group " + str(i + 1)

    def f(v):
        return fmt(v, o)

    if k == 1:
        about = "median " + f(stats[0]["median"]) + ", middle half " + f(stats[0]["q1"]) + " to " + f(stats[0]["q3"])
    elif k:
        meds = [st["median"] for st in stats]
        about = str(k) + " groups, medians from " + f(jmin(*meds)) + " to " + f(jmax(*meds))
    else:
        about = "no data"

    def draw(x0, y0, w, h):
        if not k:
            return empty_state(th, x0, y0, w, h)
        lo = jmin(*[st["min"] for st in stats])
        hi = jmax(*[st["max"] for st in stats])
        if has(o.goal):
            lo = jmin(lo, to_number(o.goal))
            hi = jmax(hi, to_number(o.goal))
        sc = nice_scale(lo, hi, 4)
        s = ""
        tl = [fmt(t, o, True) for t in sc.ticks]
        # Value axis: up the left when upright, along the bottom when horizontal. Group names take the other side.
        name_w = jmin(w * 0.4, jmax(*[tw(name_of(i), 11) for i in range(k)]) + 12) if horiz else 0
        axis_w = 0 if horiz else jmax(*[tw(t, 10, True) for t in tl]) + 10
        px = x0 + (name_w if horiz else axis_w)
        pw = w - (name_w if horiz else axis_w)
        ph = h - 20

        def V(v):
            if horiz:
                return px + (v - sc.lo) / (sc.hi - sc.lo) * pw
            return y0 + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph

        band = (ph if horiz else pw) / k
        half = jmin(28, band * 0.28)

        def C(i):
            return (y0 if horiz else px) + band * (i + 0.5)

        # A point from a group's centre line c and a value position v.
        def P(c, v):
            return [v, c] if horiz else [c, v]

        def seg(c1, v1, c2, v2, attrs):
            a, b = P(c1, v1), P(c2, v2)
            return '<line x1="' + R(a[0]) + '" y1="' + R(a[1]) + '" x2="' + R(b[0]) + '" y2="' + R(b[1]) + '"' + attrs + "/>"

        for i, t in enumerate(sc.ticks):
            v = V(t)
            s += seg(y0 if horiz else px, v, y0 + ph if horiz else px + pw, v, ' stroke="' + th["grid"] + '"' + ("" if t == 0 else ' stroke-dasharray="2 4"'))
            s += text(v, y0 + ph + 15, tl[i], small(th, 10, 'text-anchor="middle"')) if horiz else text(px - 8, v + 3.5, tl[i], small(th, 10, 'text-anchor="end"'))
        for i, st in enumerate(stats):
            c = C(i)
            col = pal[i % len(pal)] if many else pal[0]
            line = ' stroke="' + col + '" stroke-width="1.5"'
            # One unnamed group needs no name under it.
            if k > 1 or names:
                label = fit(name_of(i), name_w - 10 if horiz else band - 6, 11 if horiz else 10, not horiz)
                s += text(x0, c + 4, label, small(th, 11, "", th["fg"])) if horiz else text(c, y0 + ph + 15, label, small(th, 10, 'text-anchor="middle"'))
            if not st["n"]:
                continue
            a1 = P(c - half, V(st["q1"]))
            a2 = P(c + half, V(st["q3"]))
            s += (
                "<g" + anim(o, "bzc-a", jmin(0.6, i * 0.06)) + ">"
                + seg(c, V(st["low"]), c, V(st["q1"]), line) + seg(c, V(st["q3"]), c, V(st["high"]), line)
                + seg(c - half / 2, V(st["low"]), c + half / 2, V(st["low"]), line)
                + seg(c - half / 2, V(st["high"]), c + half / 2, V(st["high"]), line)
                + '<rect x="' + R(jmin(a1[0], a2[0])) + '" y="' + R(jmin(a1[1], a2[1])) + '" width="' + R(abs(a2[0] - a1[0]))
                + '" height="' + R(jmax(1, abs(a2[1] - a1[1]))) + '" rx="3" fill="' + col + '" fill-opacity=".22"' + line + "/>"
                + seg(c - half, V(st["median"]), c + half, V(st["median"]), ' stroke="' + col + '" stroke-width="2.5"')
            )
            for v in st["outliers"]:
                p = P(c, V(v))
                s += '<circle cx="' + R(p[0]) + '" cy="' + R(p[1]) + '" r="2.5" fill="none"' + line + "/>"
            if show_mean:
                m = P(c, V(st["mean"]))
                s += marker("diamond", m[0], m[1], 4, ' fill="' + to_string(o.background if truthy(o.background) else th["tile"]) + '"' + line)
            s += "</g>"
        if has(o.goal):
            g = V(to_number(o.goal))
            s += seg(g, y0, g, y0 + ph, ' stroke="' + th["fg"] + '" stroke-opacity=".55" stroke-dasharray="4 4"') if horiz else goal_line(o, th, px, px + pw, g)
        for i, st in enumerate(stats):
            if not st["n"]:
                continue
            n_out = len(st["outliers"])
            tip = (
                name_of(i) + "\nMedian " + f(st["median"]) + "\nMiddle half " + f(st["q1"]) + " to " + f(st["q3"])
                + "\n" + ("Range without outliers " if n_out else "Range ") + f(st["low"]) + " to " + f(st["high"])
                + ("\n" + str(n_out) + (" outlier" if n_out == 1 else " outliers") if n_out else "")
                + ("\nMean " + f(st["mean"]) if show_mean else "") + "\nn = " + str(st["n"])
            )
            s += hit(px, C(i) - band / 2, pw, band, tip, i, st["median"], i) if horiz else hit(C(i) - band / 2, y0, band, ph, tip, i, st["median"], i)
        return s

    return tile(o, th, h, draw, {"summary": about})


def fit(name, width, size, mono):
    """Shortens a name with an ellipsis until it fits the width."""
    t = str(name)
    while len(t) > 1 and tw(t, size, mono) > width:
        t = trunc(t, len(t) - 1)
    return t


def quantile(s, p):
    """Quartile p of sorted values, interpolating between neighbours (pandas' default, also called type 7)."""
    h = (len(s) - 1) * p
    i = math.floor(h)
    return s[i] + (h - i) * (s[i + 1] - s[i]) if i + 1 < len(s) else s[i]


def summary(v, full_range):
    """The five numbers, the mean and the outliers for one group. full_range makes the whiskers reach the extremes."""
    s = sorted(v)
    n = len(s)
    if not n:
        return {"n": 0, "outliers": []}
    q1, q3 = quantile(s, 0.25), quantile(s, 0.75)
    iqr = q3 - q1
    low_fence = -math.inf if full_range else q1 - 1.5 * iqr
    high_fence = math.inf if full_range else q3 + 1.5 * iqr
    inside = [x for x in s if low_fence <= x <= high_fence]
    t = 0
    for x in s:
        t += x
    return {
        "n": n, "min": s[0], "max": s[-1], "q1": q1, "median": quantile(s, 0.5), "q3": q3, "mean": t / n,
        "low": inside[0], "high": inside[-1], "outliers": [x for x in s if x < low_fence or x > high_fence],
    }
