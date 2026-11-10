"""Histogram, ported from src/charts/histogram.js."""

from __future__ import annotations

import math

from .._js import js_round, to_fixed_number
from .._tile import tile
from .._util import (
    PATTERNS, Opts, R, anim, bool_, empty_state, fmt, has, hit, jmax, jmin, legend, lst, new_id, nice_scale, num,
    palette, pattern, series, small, style_of, text, to_string, truthy, tw,
)


def histogram(o, th) -> str:
    b = binned(o)
    names = lst(o.series)
    pal = palette(o, th)
    h = num(o.height, 190)
    S = b["S"] if b else []
    k = len(S)
    multi = k > 1 or len(names) > 0
    pct = bool_(o.percent)

    def name_of(j):
        return names[j] if j < len(names) and names[j] else "Series " + str(j + 1)

    # Range edges get as many decimals as the range width needs, so 0.5-wide ranges read 2.5, 3.0, 3.5.
    eo = Opts({**o._d, "decimals": o.decimals if has(o.decimals) else (b["dp"] if b else 0)})

    def rng(i):
        return fmt(b["edge"](i), eo) + " to " + fmt(b["edge"](i + 1), eo)

    def share(j, i):
        return js_round(b["counts"][j][i] / len(S[j]) * 100)

    def height(j, i):
        return b["counts"][j][i] / len(S[j]) * 100 if pct else b["counts"][j][i]

    marks = [m for m in lst(o.mark) if m in ("mean", "median")]

    pat_of = style_of(o.patterns, PATTERNS, "solid") if k > 1 else None
    defs = ""
    fills = {}
    for q in range(k if pat_of else 0):
        if pat_of(q) == "solid":
            continue
        pid = new_id("g")
        defs += pattern(pid, pat_of(q), pal[q % len(pal)], to_string(o.background if truthy(o.background) else th["tile"]))
        fills[q] = "url(#" + pid + ")"

    def key(j, x, y):
        return '<rect x="' + R(x) + '" y="' + R(y + 1) + '" width="10" height="10" rx="2" fill="' + (fills.get(j) or pal[j % len(pal)]) + '"/>'

    peak = 0
    n = 0
    if b:
        for i in range(b["count"]):
            if total(b, i) > total(b, peak):
                peak = i
        n = sum(len(s) for s in S)

    def draw(x0, y0, w, h):
        if not b:
            return empty_state(th, x0, y0, w, h)
        s = "<defs>" + defs + "</defs>" if defs else ""
        top = y0
        if multi:
            lg = legend([name_of(j) for j in range(k)], pal, th, x0, top, w, key if pat_of else None, 15 if pat_of else None)
            s += lg["svg"]
            top += lg["height"]
        most = 0
        for j in range(k):
            for i in range(b["count"]):
                most = jmax(most, height(j, i))
        sc = nice_scale(0, most or 1, 4)
        plain = Opts({"lang": o.lang})
        tl = [fmt(t, plain, True) + ("%" if pct else "") for t in sc.ticks]
        axis_w = jmax(*[tw(t, 10, True) for t in tl]) + 10
        px = x0 + axis_w
        pw = w - axis_w
        ph = h - (top - y0) - 20
        cw = pw / b["count"]

        def X(i):
            return px + i * cw

        def Y(v):
            return top + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph

        for i, t in enumerate(sc.ticks):
            y = Y(t)
            s += (
                '<line x1="' + R(px) + '" x2="' + R(px + pw) + '" y1="' + R(y) + '" y2="' + R(y) + '" stroke="' + th["grid"]
                + '"' + ("" if t == 0 else ' stroke-dasharray="2 4"') + "/>"
                + text(px - 8, y + 3.5, tl[i], small(th, 10, 'text-anchor="end"'))
            )
        # Edge labels, thinned out when they would crowd. The first and last hang inwards from the edges, so
        # neighbours need one and a half labels of room.
        el = [fmt(b["edge"](e), eo, True) for e in range(b["count"] + 1)]
        every = int(jmax(1, math.ceil((jmax(*[tw(lb, 10, True) for lb in el]) * 1.5 + 8) / cw)))
        for e in range(0, b["count"] + 1, every):
            anchor = "start" if e == 0 else "end" if e == b["count"] else "middle"
            s += text(X(e), top + ph + 15, el[e], small(th, 10, 'text-anchor="' + anchor + '"'))
        # Bars touch, with a hairline gap, because the ranges run on from each other. Several series overlap.
        for j in range(k):
            for i in range(b["count"]):
                v = height(j, i)
                if not v:
                    continue
                y = Y(v)
                s += (
                    '<rect x="' + R(X(i) + 0.5) + '" y="' + R(y) + '" width="' + R(jmax(1, cw - 1)) + '" height="'
                    + R(top + ph - y) + '" fill="' + (fills.get(j) or pal[j % len(pal)]) + '"'
                    + (' fill-opacity=".55"' if multi else "") + anim(o, "bzc-g", jmin(0.6, i * 0.03)) + "/>"
                )
        # Mean and median lines, one per series. Their labels stack at the top beside the outermost line, on the
        # side with more room, so no label crosses a line.
        lo = b["edge"](0)
        span = b["edge"](b["count"]) - lo
        lines = []
        for j, ser in enumerate(S):
            for m in marks:
                v = mean(ser) if m == "mean" else median(ser)
                lines.append({
                    "x": px + (v - lo) / span * pw, "c": pal[j % len(pal)] if multi else th["fg"],
                    "t": (name_of(j) + " " if multi else "") + m + " " + fmt(v, o),
                })
        if lines:
            xs = [ln["x"] for ln in lines]
            left = (jmin(*xs) + jmax(*xs)) / 2 > px + pw / 2
            lx = jmin(*xs) - 5 if left else jmax(*xs) + 5
            for r, ln in enumerate(lines):
                s += (
                    '<line x1="' + R(ln["x"]) + '" x2="' + R(ln["x"]) + '" y1="' + R(top) + '" y2="' + R(top + ph)
                    + '" stroke="' + ln["c"] + '" stroke-width="1.5" stroke-dasharray="4 3"/>'
                    + text(lx, top + 9 + r * 12, ln["t"], small(th, 10, 'text-anchor="' + ("end" if left else "start") + '"', ln["c"] if multi else th["fg"]))
                )
        for i in range(b["count"]):
            tip = rng(i)
            for j in range(k):
                tip += "\n" + (name_of(j) + ": " if multi else "") + R(b["counts"][j][i]) + " (" + R(share(j, i)) + "%)"
            s += hit(X(i), top, cw, ph, tip, i, [b["counts"][j][i] for j in range(k)])
        return s

    summary = (
        (str(k) + " series, " if multi else "") + R(n) + " values in " + R(b["count"]) + " ranges from "
        + fmt(b["edge"](0), eo) + " to " + fmt(b["edge"](b["count"]), eo) + ", most in " + rng(peak)
        if b else "no data"
    )
    return tile(o, th, h, draw, {"summary": summary})


def nice_width(raw):
    """The round width (1, 2, 2.5 or 5 times a power of ten) nearest to raw on a log scale, and the decimals it needs."""
    e = math.floor(math.log10(raw))
    p = float("1e" + str(e))
    f = raw / p
    m = 1 if f < 1.4142 else 2 if f < 2.2361 else 2.5 if f < 3.5355 else 5 if f < 7.0711 else 10
    return {"w": m * p, "dp": max(0, -e - 1 if m == 10 else -e) + (1 if m == 2.5 else 0)}


def binned(o):
    """Sorts every value into ranges, exactly as the JavaScript does. None when there is nothing to count."""
    S = series(o.values)
    flat = [x for s in S for x in s]
    if not flat:
        return None
    lo, hi = jmin(*flat), jmax(*flat)
    w = num(o.binWidth, 0)
    if w > 0 and (hi - lo) / w <= 200:
        st = to_string(o.binWidth)
        dot = st.find(".")
        dp = 0 if dot < 0 else min(6, len(st) - dot - 1)
    else:
        k = js_round(num(o.bins, 0)) if num(o.bins, 0) > 0 else math.ceil(math.log2(len(flat)) + 1)
        k = min(max(k, 1), 50)
        nice = nice_width((hi - lo) / k if hi > lo else (abs(lo) or 1))
        w, dp = nice["w"], nice["dp"]
    # Edges are whole multiples of the width, rounded to the width's decimals, as in JavaScript.
    state = {"s0": math.floor(lo / w)}

    def edge(i):
        return to_fixed_number((state["s0"] + i) * w, dp + 3)

    while edge(0) > lo:
        state["s0"] -= 1
    count = int(jmax(1, math.ceil((hi - edge(0)) / w)))
    while count > 1 and edge(count - 1) >= hi:
        count -= 1
    while edge(count) < hi:
        count += 1
    counts = []
    for ser in S:
        c = [0] * count
        for x in ser:
            i = int(jmin(count - 1, jmax(0, math.floor((x - edge(0)) / w))))
            while i > 0 and x < edge(i):
                i -= 1
            while i < count - 1 and x >= edge(i + 1):
                i += 1
            c[i] += 1
        counts.append(c)
    return {"S": S, "edge": edge, "count": count, "counts": counts, "dp": dp}


def total(b, i):
    return sum(c[i] for c in b["counts"])


def mean(v):
    t = 0
    for x in v:
        t += x
    return t / len(v)


def median(v):
    s = sorted(v)
    m = len(s) // 2
    return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2
