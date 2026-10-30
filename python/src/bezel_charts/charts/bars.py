"""Bars, vertical or horizontal, single or grouped. Ported from src/charts/bars.js."""

from __future__ import annotations

import math

from .._tile import dims, tile
from .._util import (
    MONO, SANS, N, R, anim, bool_, empty_state, fmt, goal_line, has, hit, jmax, jmin, legend, lst, num, palette,
    series, small, stat_of, text, to_number, trunc, truthy, tw,
)


def bars(o, th) -> str:
    S = series(o.values)
    names = lst(o.series)
    labels = lst(o.labels)
    pal = palette(o, th)
    k = len(S)
    n = int(jmax(0, *[len(s) for s in S]))
    grouped = k > 1
    horiz = bool_(o.horizontal)
    many = not grouped and len([c for c in lst(o.color) if c]) > 1
    v0 = S[0] if S else []
    flat = [x for s in S for x in s]
    top = jmax(*flat) if flat else 0

    def name_of(j):
        return names[j] if j < len(names) and names[j] else "Series " + str(j + 1)

    def colour_of(j, i):
        return pal[j % len(pal)] if grouped else pal[i % len(pal)] if many else pal[0]

    def opac(val):
        return 1 if grouped or many or o.highlight == "none" or val == top else 0.5

    def label_of(i):
        return labels[i] if i < len(labels) and labels[i] else "#" + str(i + 1)

    def tip_of(i):
        if not grouped:
            return label_of(i) + ": " + fmt(v0[i], o)
        return label_of(i) + "".join(
            "\n" + name_of(j) + ": " + fmt(s[i], o) if i < len(s) else "" for j, s in enumerate(S)
        )

    # Horizontal rows need their height up front, and so does a legend that may wrap.
    d0 = dims(o)
    legend_h = legend([name_of(j) for j in range(k)], pal, th, 0, 0, d0["w"])["height"] if grouped or names else 0
    sub_h = 10 if grouped else 14
    sub_gap = 3
    row_h = k * sub_h + (k - 1) * sub_gap + (14 if grouped else 16) if horiz else 0
    h = legend_h + jmax(1, n) * row_h - 6 if horiz else num(o.height, 140) + legend_h
    best_val = jmax(*(v0 if v0 else [0]))
    best = v0.index(best_val) if best_val in v0 else -1

    def draw(x0, y0, w, h):
        if not n:
            return empty_state(th, x0, y0, w, h)
        s = ""
        top0 = y0
        if legend_h:
            s += legend([name_of(j) for j in range(k)], pal, th, x0, y0, w)["svg"]
            top0 += legend_h
        lo = jmin(0, jmin(*flat))
        hi = jmax(0, top)
        if has(o.goal):
            lo = jmin(lo, to_number(o.goal))
            hi = jmax(hi, to_number(o.goal))
        if hi == lo:
            hi = lo + 1

        if horiz:
            lab_w = jmin(w * 0.4, jmax(*[tw(lb, 12) for lb in labels]) + 10) if labels else 0
            vals = [[fmt(x, o) for x in ser] for ser in S]
            val_w = jmax(*[tw(t, 10 if grouped else 11, True) for row in vals for t in row]) + 10
            bx = x0 + lab_w
            bw = w - lab_w - val_w
            span = jmax(hi, 0)
            span = span if truthy(span) else 1
            for i in range(n):
                ry = top0 + i * row_h
                if i < len(labels):
                    s += text(
                        x0, ry + (row_h - 6) / 2 + 4, trunc(labels[i], math.floor(lab_w / 6.7)),
                        'fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="12"',
                    )
                for j, ser in enumerate(S):
                    if i >= len(ser):
                        continue
                    val = ser[i]
                    by = ry + (2 if grouped else 5) + j * (sub_h + sub_gap)
                    length = jmax(0, val) / span * bw
                    if not grouped:
                        s += (
                            '<rect x="' + R(bx) + '" y="' + R(by) + '" width="' + R(bw) + '" height="' + N(sub_h)
                            + '" rx="' + N(sub_h / 2) + '" fill="' + th["grid"] + '" fill-opacity=".6"/>'
                        )
                    if length > 0:
                        s += (
                            '<rect x="' + R(bx) + '" y="' + R(by) + '" width="' + R(jmax(sub_h, length)) + '" height="'
                            + N(sub_h) + '" rx="' + N(sub_h / 2) + '" fill="' + colour_of(j, i) + '" fill-opacity="'
                            + N(opac(val)) + '"' + anim(o, "bzc-gx", i * 0.06 + j * 0.03) + "/>"
                        )
                    s += text(
                        x0 + w, by + sub_h / 2 + 3.8, vals[j][i],
                        'text-anchor="end" fill="' + th["fg"] + '" font-family="' + MONO + '" font-size="'
                        + N(10 if grouped else 11) + '" font-weight="600"',
                    )
                s += hit(x0, ry, w, row_h - 6, tip_of(i))
            if has(o.goal) and to_number(o.goal) > 0:
                gx = bx + to_number(o.goal) / span * bw
                s += (
                    '<line x1="' + R(gx) + '" x2="' + R(gx) + '" y1="' + R(top0 - 2) + '" y2="' + R(y0 + h + 2)
                    + '" stroke="' + th["fg"] + '" stroke-opacity=".55" stroke-dasharray="3 3"/>'
                )
            return s

        neg_lab = 14 if bool_(o.showValues) and lo < 0 else 0
        bottom = (20 if labels else 2) + neg_lab
        top_pad = 16 if bool_(o.showValues) else 4
        ph = h - (top0 - y0) - bottom - top_pad
        py = top0 + top_pad

        def Y(x):
            return py + ph - (x - lo) / (hi - lo) * ph

        slot = w / n
        group_w = jmin(slot * (0.78 if grouped else 0.62), k * 30 if grouped else 56)
        gap = jmin(3, group_w / k * 0.15) if grouped else 0
        bwid = (group_w - gap * (k - 1)) / k
        Y0 = Y(0)
        every = (
            int(jmax(1, math.ceil(n * (jmax(*[tw(lb, 10, True) for lb in labels]) + 8) / w))) if labels else 1
        )
        s += (
            '<line x1="' + N(x0) + '" x2="' + N(x0 + w) + '" y1="' + R(Y0) + '" y2="' + R(Y0) + '" stroke="'
            + th["grid"] + '"/>'
        )
        for c in range(n):
            gx0 = x0 + c * slot + (slot - group_w) / 2
            for j, ser in enumerate(S):
                if c >= len(ser):
                    continue
                val = ser[c]
                x = gx0 + j * (bwid + gap)
                y = jmin(Y(val), Y0)
                bh = abs(Y(val) - Y0)
                if bh > 0.5:
                    s += (
                        '<rect x="' + R(x) + '" y="' + R(y) + '" width="' + R(bwid) + '" height="' + R(bh) + '" rx="'
                        + R(jmin(6, bwid / 2, bh / 2)) + '" fill="' + colour_of(j, c) + '" fill-opacity="'
                        + N(opac(val)) + '"' + anim(o, "bzc-gn" if val < 0 else "bzc-g", c * 0.05 + j * 0.03) + "/>"
                    )
                if bool_(o.showValues):
                    s += text(
                        x + bwid / 2, Y(val) + 12 if val < 0 else Y(val) - 5, fmt(val, o, True),
                        'text-anchor="middle" fill="' + th["fg"] + '" font-family="' + MONO + '" font-size="'
                        + N(9 if grouped else 10) + '" font-weight="600"',
                    )
            if c < len(labels) and c % every == 0:
                s += text(gx0 + group_w / 2, py + ph + neg_lab + 15, labels[c], small(th, 10, 'text-anchor="middle"'))
            s += hit(x0 + c * slot, top0, slot, h - (top0 - y0), tip_of(c))
        if has(o.goal):
            s += goal_line(o, th, x0, x0 + w, Y(to_number(o.goal)))
        return s

    if not n:
        summary = "no data"
    elif grouped:
        summary = str(k) + " series across " + str(n) + " groups"
    else:
        best_label = labels[best] if 0 <= best < len(labels) and labels[best] else ""
        summary = "highest " + best_label + " " + fmt(v0[best] if 0 <= best < len(v0) else None, o)
    return tile(o, th, h, draw, {"stat": stat_of(v0, o, ""), "summary": summary})
