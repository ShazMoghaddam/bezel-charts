"""Bars, vertical or horizontal, single, grouped or stacked. Ported from src/charts/bars.js."""

from __future__ import annotations

import math

from .._tile import dims, tile
from .._util import (
    MONO, SANS, N, R, anim, bool_, empty_state, fmt, goal_line, has, hit, jmax, jmin, legend, lst, num, palette,
    series, small, stat_of, text, to_number, trunc, truthy, tw,
)

# How far angled labels lean, and the longest label they show before shortening it.
ANGLE = 40
ANGLE_MAX_CHARS = 24


def bars(o, th) -> str:
    S = series(o.values)
    names = lst(o.series)
    labels = lst(o.labels)
    pal = palette(o, th)
    k = len(S)
    n = int(jmax(0, *[len(s) for s in S]))
    grouped = k > 1
    horiz = bool_(o.horizontal)
    stacked = grouped and bool_(o.stacked)
    many = not grouped and len([c for c in lst(o.color) if c]) > 1
    v0 = S[0] if S else []
    flat = [x for s in S for x in s]

    # A stack's height is its parts added up, positive parts upwards and negative parts downwards.
    def sum_of(i, sign):
        t = 0
        for s in S:
            if i < len(s) and s[i] * sign > 0:
                t = t + s[i]
        return t

    ups = [sum_of(i, 1) for i in range(n)] if stacked else []
    downs = [sum_of(i, -1) for i in range(n)] if stacked else []
    totals = [ups[i] + downs[i] for i in range(n)] if stacked else []
    scale = ups + downs if stacked else flat
    top = jmax(*scale) if scale else 0

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
        ) + ("\nTotal: " + fmt(totals[i], o) if stacked else "")

    # Horizontal rows need their height up front, and so does a legend that may wrap.
    d0 = dims(o)
    legend_h = legend([name_of(j) for j in range(k)], pal, th, 0, 0, d0["w"])["height"] if grouped or names else 0
    rows = 1 if stacked else k
    thin = grouped and not stacked
    sub_h = 10 if thin else 14
    sub_gap = 3
    row_h = rows * sub_h + (rows - 1) * sub_gap + (14 if thin else 16) if horiz else 0
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
        lo = jmin(0, jmin(*scale))
        hi = jmax(0, top)
        if has(o.goal):
            lo = jmin(lo, to_number(o.goal))
            hi = jmax(hi, to_number(o.goal))
        if hi == lo:
            hi = lo + 1

        # A horizontal stack: a track, then each positive part laid end to end with a hairline gap.
        def stack_row(i, bx, by, bw, span):
            out = (
                '<rect x="' + R(bx) + '" y="' + R(by) + '" width="' + R(bw) + '" height="' + N(sub_h) + '" rx="'
                + N(sub_h / 2) + '" fill="' + th["grid"] + '" fill-opacity=".6"/>'
            )
            at = 0
            for j, ser in enumerate(S):
                val = ser[i] if i < len(ser) else 0
                length = jmax(0, val) / span * bw
                if length <= 0:
                    continue
                gap_l = 1.5 if at > 0 else 0
                out += (
                    '<rect x="' + R(bx + at + gap_l) + '" y="' + R(by) + '" width="' + R(jmax(2, length - gap_l))
                    + '" height="' + N(sub_h) + '" rx="' + R(jmin(3, length / 2)) + '" fill="' + colour_of(j, i)
                    + '"' + anim(o, "bzc-gx", i * 0.06 + j * 0.03) + "/>"
                )
                at += length
            return out

        if horiz:
            lab_w = jmin(w * 0.4, jmax(*[tw(lb, 12) for lb in labels]) + 10) if labels else 0
            vals = [[fmt(x, o) for x in totals]] if stacked else [[fmt(x, o) for x in ser] for ser in S]
            val_w = jmax(*[tw(t, 10 if thin else 11, True) for row in vals for t in row]) + 10
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
                if stacked:
                    s += stack_row(i, bx, ry + 5, bw, span)
                    s += text(
                        x0 + w, ry + 5 + sub_h / 2 + 3.8, vals[0][i],
                        'text-anchor="end" fill="' + th["fg"] + '" font-family="' + MONO
                        + '" font-size="11" font-weight="600"',
                    )
                for j, ser in enumerate(S):
                    if stacked or i >= len(ser):
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

        # Labels that won't fit side by side either take turns (the default) or lean over so every one shows.
        lab_max = jmax(*[tw(lb, 10, True) for lb in labels]) if labels else 0
        every = int(jmax(1, math.ceil(n * (lab_max + 8) / w))) if labels else 1
        angled = bool_(o.angleLabels) and every > 1
        rad = ANGLE * math.pi / 180

        def lab_text(lb):
            return trunc(lb, ANGLE_MAX_CHARS) if angled else lb

        if angled:
            # Room on the left for the first labels, which lean past the start of the chart.
            slot0 = w / n
            lead = 0
            for c, lb in enumerate(labels):
                lead = jmax(lead, math.cos(rad) * tw(lab_text(lb), 10, True) + 4 - (c + 0.5) * slot0)
            lead = jmin(lead, w * 0.25)
            x0 = x0 + lead
            w = w - lead
            every = 1
        neg_lab = 14 if bool_(o.showValues) and lo < 0 else 0
        lab_drop = (
            math.ceil(math.sin(rad) * jmin(lab_max, tw("x" * ANGLE_MAX_CHARS, 10, True))) + 18 if angled else 20
        )
        bottom = (lab_drop if labels else 2) + neg_lab
        top_pad = 16 if bool_(o.showValues) else 4
        ph = h - (top0 - y0) - bottom - top_pad
        py = top0 + top_pad

        def Y(x):
            return py + ph - (x - lo) / (hi - lo) * ph

        slot = w / n
        group_w = jmin(slot * (0.78 if thin else 0.62), k * 30 if thin else 56)
        gap = jmin(3, group_w / k * 0.15) if thin else 0
        bwid = group_w if stacked else (group_w - gap * (k - 1)) / k
        Y0 = Y(0)

        # A vertical stack: positive parts upwards from zero and negative parts downwards, with a hairline gap.
        def stack_column(c, x):
            out = ""
            up = 0
            down = 0
            for j, ser in enumerate(S):
                val = ser[c] if c < len(ser) else 0
                if not val:
                    continue
                frm = up if val > 0 else down
                to = frm + val
                if val > 0:
                    up = to
                else:
                    down = to
                ya = Y(jmax(frm, to))
                yb = Y(jmin(frm, to))
                bh = yb - ya
                # The gap goes on the side nearest zero, so the outermost part keeps its full height.
                gap_z = jmin(1.5, bh / 2) if frm != 0 else 0
                if val > 0:
                    yb = yb - gap_z
                else:
                    ya = ya + gap_z
                bh = yb - ya
                if bh > 0.5:
                    out += (
                        '<rect x="' + R(x) + '" y="' + R(ya) + '" width="' + R(bwid) + '" height="' + R(bh)
                        + '" rx="' + R(jmin(3, bwid / 2, bh / 2)) + '" fill="' + colour_of(j, c) + '"'
                        + anim(o, "bzc-gn" if val < 0 else "bzc-g", c * 0.05 + j * 0.03) + "/>"
                    )
            if bool_(o.showValues):
                tot = totals[c]
                out += text(
                    x + bwid / 2, Y(downs[c]) + 12 if tot < 0 else Y(ups[c]) - 5, fmt(tot, o, True),
                    'text-anchor="middle" fill="' + th["fg"] + '" font-family="' + MONO
                    + '" font-size="10" font-weight="600"',
                )
            return out

        s += (
            '<line x1="' + N(x0) + '" x2="' + N(x0 + w) + '" y1="' + R(Y0) + '" y2="' + R(Y0) + '" stroke="'
            + th["grid"] + '"/>'
        )
        for c in range(n):
            gx0 = x0 + c * slot + (slot - group_w) / 2
            if stacked:
                s += stack_column(c, gx0)
            for j, ser in enumerate(S):
                if stacked or c >= len(ser):
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
                lx = gx0 + group_w / 2
                ly = py + ph + neg_lab + (12 if angled else 15)
                if angled:
                    s += text(
                        lx, ly, lab_text(labels[c]),
                        small(th, 10, 'text-anchor="end" transform="rotate(-' + N(ANGLE) + " " + R(lx) + " " + R(ly) + ')"'),
                    )
                else:
                    s += text(lx, ly, labels[c], small(th, 10, 'text-anchor="middle"'))
            s += hit(x0 + c * slot, top0, slot, h - (top0 - y0), tip_of(c))
        if has(o.goal):
            s += goal_line(o, th, x0, x0 + w, Y(to_number(o.goal)))
        return s

    if not n:
        summary = "no data"
    elif stacked:
        summary = str(k) + " series stacked across " + str(n) + " groups"
    elif grouped:
        summary = str(k) + " series across " + str(n) + " groups"
    else:
        best_label = labels[best] if 0 <= best < len(labels) and labels[best] else ""
        summary = "highest " + best_label + " " + fmt(v0[best] if 0 <= best < len(v0) else None, o)
    return tile(o, th, h, draw, {"stat": stat_of(v0, o, ""), "summary": summary})
