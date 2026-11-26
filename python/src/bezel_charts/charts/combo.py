"""Bars and lines on two axes, ported from src/charts/combo.js."""

from __future__ import annotations

import math

from .._js import pow10, to_fixed_number
from .._series import point_marks, series_line
from .._notes import note_layout, note_marks
from .._tile import tile
from .._util import (
    at, DASHES, PATTERNS, SHAPES, Opts, R, anim, bool_, empty_state, fmt, fmtv, gap_note, has, ok, real, runs_of, hit, jmax, jmin, legend, lst, marker, parse_notes,
    new_id, nice_scale, num, palette, path_of, pattern, series, small, style_of, text, to_string, truthy, tw,
)


def combo(o, th) -> str:
    B = series(o.values)
    L = series(o.line)
    pal = palette(o, th)
    k, m = len(B), len(L)
    labels = lst(o.labels)
    bnames = lst(o.series)
    lnames = lst(o.lineSeries)
    stacked = k > 1 and bool_(o.stacked)
    n = int(jmax(0, *[len(s) for s in B + L]))
    lo = line_opts(o)
    h = num(o.height, 200)

    def bar_name(j):
        return bnames[j] if j < len(bnames) and bnames[j] else ("Bars" if k == 1 else "Bars " + str(j + 1))

    def line_name(j):
        return lnames[j] if j < len(lnames) and lnames[j] else ("Line" if m == 1 else "Line " + str(j + 1))

    def bar_col(j):
        return pal[j % len(pal)]

    def line_col(j):
        return pal[(k + j) % len(pal)]

    def val(s, i):
        return s[i] if i < len(s) else 0

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
        defs += pattern(pid, pat_of(q), bar_col(q), bg)
        fills[q] = "url(#" + pid + ")"

    # The legend shows a bar swatch for each bar series and a short line for each line.
    def key(e, x, y):
        if e < k:
            return '<rect x="' + R(x) + '" y="' + R(y + 1) + '" width="10" height="10" rx="2" fill="' + (fills.get(e) or bar_col(e)) + '"/>'
        j = e - k
        c = line_col(j)
        dk = DASHES[dash_of(j)] if dash_of else ""
        mk = mark_of(j) if mark_of else "none"
        return (
            '<line x1="' + R(x) + '" x2="' + R(x + 18) + '" y1="' + R(y + 6) + '" y2="' + R(y + 6) + '" stroke="' + c
            + '" stroke-width="2.5" stroke-linecap="round"' + (' stroke-dasharray="' + dk + '"' if dk else "") + "/>"
            + (marker(mk, x + 9, y + 6, 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"') if mk != "none" else "")
        )

    # Each column's bar extent: side by side, or piled up with positive parts above zero and negative parts below.
    tops, bottoms = [], []
    for i in range(n):
        up = down = 0
        for s in B:
            v = val(s, i)
            if not ok(v):
                continue
            if stacked:
                if v >= 0:
                    up += v
                else:
                    down += v
            else:
                up = jmax(up, v)
                down = jmin(down, v)
        tops.append(up)
        bottoms.append(down)

    def draw(x0, y0, w, h):
        if not n or not k or not real([x for s2 in B + L for x in s2]):
            return empty_state(th, x0, y0, w, h)
        s = "<defs>" + defs + "</defs>" if defs else ""
        top = y0
        lg = legend([bar_name(j) for j in range(k)] + [line_name(j) for j in range(m)], pal, th, x0, top, w, key, 24)
        s += lg["svg"]
        top += lg["height"]
        if has(o.yLabel) or has(o.lineLabel):
            top += 16
        # Left axis: bars, always including zero. Right axis: lines, with the same number of steps.
        sc = nice_scale(jmin(*bottoms), jmax(*tops), 4)
        steps = len(sc.ticks) - 1
        flat = real([x for s2 in L for x in s2])
        sc2 = None
        if m and flat:
            lmin, lmax = jmin(*flat), jmax(*flat)
            if bool_(o.lineZero):
                lmin, lmax = jmin(0, lmin), jmax(0, lmax)
            sc2 = matched(lmin, lmax, steps)
        tl = [fmt(t, o, True) for t in sc.ticks]
        tr = [fmt(t, lo, True) for t in sc2["ticks"]] if sc2 else []
        lw = jmax(*[tw(t, 10, True) for t in tl]) + 10
        rw = jmax(*[tw(t, 10, True) for t in tr]) + 10 if sc2 else 0
        px = x0 + lw
        pw = w - lw - rw
        ph = h - (top - y0) - (20 if labels else 4)
        band = pw / n
        # Notes take a strip under the legend, above the axis titles, so no label sits on a bar.
        nl = note_layout(
            parse_notes(o, labels), n, lambda i: {"c": px + band * (i + 0.5), "l": px + band * i, "r": px + band * (i + 1)}, px, pw
        )
        note_top = top - (16 if has(o.yLabel) or has(o.lineLabel) else 0)
        if nl["rows"]:
            top += nl["height"] + 4
            ph -= nl["height"] + 4

        def X(i):
            return px + band * (i + 0.5)

        def Y(v):
            return top + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph

        def Y2(v):
            return top + ph - (v - sc2["lo"]) / (sc2["hi"] - sc2["lo"]) * ph

        if nl["rows"]:
            s += note_marks(th, nl, note_top, top + ph)
        for i, t in enumerate(sc.ticks):
            y = Y(t)
            s += (
                '<line x1="' + R(px) + '" x2="' + R(px + pw) + '" y1="' + R(y) + '" y2="' + R(y) + '" stroke="' + th["grid"]
                + '"' + ("" if t == 0 else ' stroke-dasharray="2 4"') + "/>"
                + text(px - 8, y + 3.5, tl[i], small(th, 10, 'text-anchor="end"'))
                + (text(px + pw + 8, y + 3.5, tr[i], small(th, 10, 'text-anchor="start"')) if sc2 else "")
            )
        # A rule down each side in its data's colour, and titles above, so it's clear which axis belongs to what.
        left_c = bar_col(0) if k == 1 else th["muted"]
        right_c = line_col(0) if m == 1 else th["muted"]
        s += '<line x1="' + R(px) + '" x2="' + R(px) + '" y1="' + R(top) + '" y2="' + R(top + ph) + '" stroke="' + left_c + '" stroke-width="2"/>'
        if sc2:
            s += '<line x1="' + R(px + pw) + '" x2="' + R(px + pw) + '" y1="' + R(top) + '" y2="' + R(top + ph) + '" stroke="' + right_c + '" stroke-width="2"/>'
        if has(o.yLabel):
            s += text(x0, top - 8, o.yLabel, small(th, 10, "", left_c if k == 1 else th["fg"]))
        if has(o.lineLabel) and sc2:
            s += text(x0 + w, top - 8, o.lineLabel, small(th, 10, 'text-anchor="end"', right_c if m == 1 else th["fg"]))
        if labels:
            every = int(jmax(1, math.ceil((jmax(*[tw(lb, 10, True) for lb in labels]) + 10) / band)))
            for i in range(0, n, every):
                if i < len(labels):
                    s += text(X(i), top + ph + 15, labels[i], small(th, 10, 'text-anchor="middle"'))
        # Bars: side by side within each column, or one pile per column.
        gw = band * 0.72
        bw = gw if stacked else gw / k
        for i in range(n):
            up = down = 0
            for j, ser in enumerate(B):
                if i >= len(ser):
                    continue
                v = ser[i]
                x = X(i) - gw / 2 if stacked else X(i) - gw / 2 + j * bw
                # A missing bar gets a short dash on the zero line, so its empty slot doesn't read as 0.
                if not ok(v):
                    if not stacked:
                        s += (
                            '<line x1="' + R(x + bw * 0.3) + '" x2="' + R(x + bw * 0.7) + '" y1="' + R(Y(0) - 3) + '" y2="'
                            + R(Y(0) - 3) + '" stroke="' + th["muted"] + '" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 3"/>'
                        )
                    continue
                if stacked:
                    if v >= 0:
                        a = up
                        up += v
                        b = up
                    else:
                        a = down
                        down += v
                        b = down
                else:
                    a, b = 0, v
                ya, yb = Y(a), Y(b)
                s += (
                    '<rect x="' + R(x + 0.5) + '" y="' + R(jmin(ya, yb)) + '" width="' + R(jmax(1, bw - 1)) + '" height="'
                    + R(abs(yb - ya)) + '" rx="2" fill="' + (fills.get(j) or bar_col(j)) + '"'
                    + anim(o, "bzc-gn" if v < 0 else "bzc-g", jmin(0.6, i * 0.04)) + "/>"
                )
        # Lines over the bars, on the right axis.
        for j, ser in enumerate(L):
            if not sc2:
                continue
            c = line_col(j)
            runs = runs_of([[X(i), Y2(v)] for i, v in enumerate(ser)])
            mk = mark_of(j) if mark_of else "none"
            if not runs:
                continue
            P = [p for r in runs for p in r]
            s += series_line(o, "".join(path_of(r, bool_(o.straight)) for r in runs), c, j, DASHES[dash_of(j)] if dash_of else "")
            if mk != "none":
                s += point_marks(o, mk, ser, X, Y2, c, bg, j)
            else:
                # A value on its own between gaps has no line to sit on, so it gets a dot.
                for q, r in enumerate(runs):
                    if len(r) == 1 and q < len(runs) - 1:
                        s += '<circle cx="' + R(r[0][0]) + '" cy="' + R(r[0][1]) + '" r="2.5" fill="' + c + '"/>'
                s += '<circle cx="' + R(P[-1][0]) + '" cy="' + R(P[-1][1]) + '" r="4" fill="' + c + '" stroke="' + bg + '" stroke-width="2"/>'
        for i in range(n):
            tip = labels[i] if i < len(labels) and labels[i] else "#" + str(i + 1)
            t = 0
            for j, ser in enumerate(B):
                if i < len(ser):
                    tip += "\n" + bar_name(j) + ": " + fmtv(ser[i], o)
                    t += ser[i]
            if stacked:
                tip += "\nTotal: " + fmtv(t, o)
            for j, ser in enumerate(L):
                if i < len(ser):
                    tip += "\n" + line_name(j) + ": " + fmtv(ser[i], lo)
            s += hit(X(i) - band / 2, top, band, ph, tip, i, at(B + L, i))
        return s

    summary = (
        str(k) + " bar series" + (" stacked" if stacked else "") + " and " + str(m) + (" line" if m == 1 else " lines")
        + " over " + str(n) + " points" + gap_note([x for s2 in B + L for x in s2])
    )
    return tile(o, th, h, draw, {"summary": summary})


def line_opts(o):
    """Number formatting for the line's axis and values, from line-prefix, line-suffix and line-decimals."""
    return Opts({"prefix": o.linePrefix, "suffix": o.lineSuffix, "decimals": o.lineDecimals, "compact": o.compact, "lang": o.lang})


def matched(mn, mx, n):
    """A round scale over mn to mx with exactly n steps, so its gridlines match another axis."""
    if mn == mx:
        if mn == 0:
            mx = 1
        else:
            p = abs(mn) * 0.1
            mn -= p
            mx += p
    mag = pow10(math.floor(math.log10((mx - mn) / n)))
    steps = [1, 2, 5, 10]
    i = 0
    while True:
        step = steps[i] * mag
        lo = math.floor(mn / step) * step
        if lo + n * step >= mx - step * 1e-9:
            break
        i += 1
        if i == 4:
            i = 1
            mag *= 10
    ticks = [to_fixed_number(lo + t * step, 10) for t in range(n + 1)]
    return {"lo": ticks[0], "hi": ticks[n], "ticks": ticks}
