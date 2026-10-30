"""Scatter plot with an optional least-squares trend line. Ported from src/charts/scatter.js."""

from __future__ import annotations

import math
import re

from .._js import to_fixed
from .._tile import tile
from .._util import (
    N, Opts, R, bool_, clamp, empty_state, fmt, goal_line, has, hit, jmax, jmin, legend, lst, nice_scale, num,
    palette, parse_notes, series, small, text, to_number, to_string, truthy, tw,
)


def fit(xs, ys):
    """Least-squares fit. Returns slope, intercept and Pearson's r, or None when x has no spread."""
    n = min(len(xs), len(ys))
    if n < 2:
        return None
    mx = my = 0.0
    for i in range(n):
        mx += xs[i]
        my += ys[i]
    mx /= n
    my /= n
    sxx = syy = sxy = 0.0
    for i in range(n):
        sxx += (xs[i] - mx) * (xs[i] - mx)
        syy += (ys[i] - my) * (ys[i] - my)
        sxy += (xs[i] - mx) * (ys[i] - my)
    if not sxx:
        return None
    slope = sxy / sxx
    return {"slope": slope, "intercept": my - slope * mx, "r": sxy / math.sqrt(sxx * syy) if syy else 0}


def _axis_width(ticks) -> float:
    return jmax(*[tw(t, 10, True) for t in ticks]) + 10


_YESC = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}


def scatter(o, th) -> str:
    X, Y = series(o.x), series(o.y)
    names, labels, pal = lst(o.series), lst(o.labels), palette(o, th)
    groups = []
    for g in range(max(len(X), len(Y))):
        xs = X[g] if g < len(X) else []
        ys = Y[g] if g < len(Y) else []
        m = min(len(xs), len(ys))
        groups.append({"xs": xs[:m], "ys": ys[:m]})
    groups = [gr for gr in groups if gr["xs"]]
    count = sum(len(gr["xs"]) for gr in groups)
    h = num(o.height, 210)
    multi = len(groups) > 1 or len(names) > 0
    trend = bool_(o.trend)

    def name_of(j):
        return names[j] if j < len(names) and names[j] else "Group " + str(j + 1)

    xo = Opts({"decimals": o.decimals, "compact": o.compact, "lang": o.lang})
    notes = parse_notes(o, labels)

    def draw(x0, y0, w, h):
        if not count:
            return empty_state(th, x0, y0, w, h)
        s = ""
        top = y0
        if multi:
            lg = legend([name_of(j) for j in range(len(groups))], pal, th, x0, top, w)
            s += lg["svg"]
            top += lg["height"]
        ax = [x for gr in groups for x in gr["xs"]]
        ay = [y for gr in groups for y in gr["ys"]]
        ymin, ymax = jmin(*ay), jmax(*ay)
        if has(o.goal):
            ymin = jmin(ymin, to_number(o.goal))
            ymax = jmax(ymax, to_number(o.goal))
        if bool_(o.zero):
            ymin = jmin(0, ymin)
            ymax = jmax(0, ymax)
        sy = nice_scale(ymin, ymax, 4)
        sx = nice_scale(jmin(*ax), jmax(*ax), 5)
        tly = [fmt(t, o, True) for t in sy.ticks]
        axis_w = _axis_width(tly) + (14 if has(o.yLabel) else 0)
        bottom = 20 + (16 if has(o.xLabel) else 0)
        px = x0 + axis_w
        pw = w - axis_w
        ph = h - (top - y0) - bottom

        def PX(v):
            return px + 6 + (v - sx.lo) / (sx.hi - sx.lo) * (pw - 12)

        def PY(v):
            return top + 6 + ph - 6 - (v - sy.lo) / (sy.hi - sy.lo) * (ph - 6)

        for i, t in enumerate(sy.ticks):
            y = PY(t)
            s += (
                '<line x1="' + R(px) + '" x2="' + R(px + pw) + '" y1="' + R(y) + '" y2="' + R(y) + '" stroke="'
                + th["grid"] + '" stroke-dasharray="2 4"/>' + text(px - 8, y + 3.5, tly[i], small(th, 10, 'text-anchor="end"'))
            )
        every = int(jmax(1, math.ceil(len(sx.ticks) * 44 / pw)))
        for i, t in enumerate(sx.ticks):
            if i % every:
                continue
            x = PX(t)
            s += (
                '<line x1="' + R(x) + '" x2="' + R(x) + '" y1="' + R(top) + '" y2="' + R(top + ph) + '" stroke="'
                + th["grid"] + '" stroke-dasharray="2 4"/>'
                + text(x, top + ph + 15, fmt(t, xo, True), small(th, 10, 'text-anchor="middle"'))
            )
        if has(o.xLabel):
            s += text(px + pw / 2, top + ph + 32, o.xLabel, small(th, 10, 'text-anchor="middle" font-weight="600"'))
        if has(o.yLabel):
            cy = top + ph / 2
            s += (
                '<text x="' + R(x0 + 4) + '" y="' + R(cy) + '" transform="rotate(-90 ' + R(x0 + 4) + " " + R(cy)
                + ')" text-anchor="middle" ' + small(th, 10, 'font-weight="600"') + ' dominant-baseline="hanging">'
                + re.sub(r'[&<>"]', lambda m: _YESC[m.group(0)], to_string(o.yLabel)) + "</text>"
            )
        if has(o.goal):
            s += goal_line(o, th, px, px + pw, PY(to_number(o.goal)))

        if trend:
            for j, gr in enumerate(groups):
                f = fit(gr["xs"], gr["ys"])
                if not f:
                    continue
                xa, xb = jmin(*gr["xs"]), jmax(*gr["xs"])
                ya = f["slope"] * xa + f["intercept"]
                yb = f["slope"] * xb + f["intercept"]
                c = pal[j % len(pal)]
                s += (
                    '<line x1="' + R(PX(xa)) + '" y1="' + R(clamp(PY(ya), top, top + ph)) + '" x2="' + R(PX(xb))
                    + '" y2="' + R(clamp(PY(yb), top, top + ph)) + '" stroke="' + c
                    + '" stroke-width="2" stroke-dasharray="6 4" stroke-linecap="round" stroke-opacity=".9"/>'
                )
                s += text(
                    jmin(PX(xb), px + pw) - 2, clamp(PY(yb), top + 10, top + ph) - 7, "r = " + to_fixed(f["r"], 2),
                    small(th, 10, 'text-anchor="end" font-weight="600"', c),
                )

        idx = 0
        r = 3 if count > 150 else 4.5
        stroke = to_string(o.background) if truthy(o.background) else th["tile"]
        x_name = to_string(o.xLabel) if has(o.xLabel) else "x"
        y_name = to_string(o.yLabel) if has(o.yLabel) else "y"
        for j, gr in enumerate(groups):
            c = pal[j % len(pal)]
            for i, xv in enumerate(gr["xs"]):
                cx, cy = PX(xv), PY(gr["ys"][i])
                lead = (
                    labels[idx] + "\n" if idx < len(labels) and labels[idx]
                    else name_of(j) + "\n" if multi else ""
                )
                tip = lead + x_name + ": " + fmt(xv, xo) + "\n" + y_name + ": " + fmt(gr["ys"][i], o)
                s += (
                    '<circle cx="' + R(cx) + '" cy="' + R(cy) + '" r="' + N(r) + '" fill="' + c
                    + '" fill-opacity=".85" stroke="' + stroke + '" stroke-width="1.5"'
                    + (' class="bzc-a" style="animation-delay:' + R(jmin(0.8, idx * 0.012)) + 's"' if o.animate else "")
                    + "/>"
                )
                s += hit(cx - 8, cy - 8, 16, 16, tip)
                idx += 1

        # Notes point at a point by its position across all groups, or by its label.
        flat = [[PX(xv), PY(gr["ys"][i])] for gr in groups for i, xv in enumerate(gr["xs"])]
        for nt in notes:
            if nt["i"] >= len(flat):
                continue
            p = flat[nt["i"]]
            s += (
                '<circle cx="' + R(p[0]) + '" cy="' + R(p[1]) + '" r="' + N(r + 4) + '" fill="none" stroke="' + th["fg"]
                + '" stroke-width="1.5"/>'
                + text(clamp(p[0], px + 30, px + pw - 30), p[1] - r - 9, nt["text"], small(th, 10, 'text-anchor="middle"', th["fg"]))
            )
        return s

    summary = str(count) + " points" + (" in " + str(len(groups)) + " groups" if multi else "")
    return tile(o, th, h, draw, {"summary": summary})
