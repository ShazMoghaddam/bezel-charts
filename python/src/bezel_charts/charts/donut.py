"""Donut chart, folding anything past the top five into "Other". Ported from src/charts/donut.js."""

from __future__ import annotations

import math

from .._js import js_round
from .._tile import tile
from .._util import (
    MONO, SANS, N, R, anim, empty_state, esc, fmt, has, hit, jmax, jmin, lst, num, nums, palette, small, stat_of,
    text, to_string, total, trunc,
)


def donut(o, th) -> str:
    raw = [jmax(0, n) for n in nums(o.values)]
    lab = lst(o.labels)
    pal = palette(o, th)

    def lab_of(i):
        return lab[i] if i < len(lab) and lab[i] else "#" + str(i + 1)

    v, labels = list(raw), list(lab)
    if len(v) > 6:
        idx = sorted(range(len(raw)), key=lambda i: -raw[i])  # stable, like Array.prototype.sort in V8
        keep = sorted(idx[:5])
        v = [raw[i] for i in keep]
        labels = [lab_of(i) for i in keep]
        v.append(total([raw[i] for i in idx[5:]]))
        labels.append("Other")
    tot = total(v)
    h = num(o.height, 150)
    st = stat_of(v, o, "")

    def name(i):
        return labels[i] if i < len(labels) and labels[i] else "#" + str(i + 1)

    def draw(x0, y0, w, h):
        if not tot:
            return empty_state(th, x0, y0, w, h)
        s = ""
        size = jmin(h, w * 0.5)
        cx = x0 + size / 2
        cy = y0 + h / 2
        sw = size * 0.16
        r = (size - sw) / 2
        start = 0
        gap = 0.9 if len([n for n in v if n]) > 1 else 0
        for i, n in enumerate(v):
            length = n / tot * 100
            if length <= 0:
                continue
            seg = jmax(0.01, length - gap)
            s += (
                '<circle cx="' + R(cx) + '" cy="' + R(cy) + '" r="' + R(r) + '" fill="none" stroke="' + pal[i % len(pal)]
                + '" stroke-width="' + R(sw) + '" pathLength="100" stroke-dasharray="' + R(seg) + " " + R(100 - seg)
                + '" stroke-dashoffset="' + R(-start) + '" transform="rotate(-90 ' + R(cx) + " " + R(cy) + ')"'
                + anim(o, "bzc-a", i * 0.08) + "/>"
            )
            start += length
        s += text(
            cx, cy + 2, fmt(tot, o, True),
            'text-anchor="middle" fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="' + R(size * 0.17)
            + '" font-weight="800"',
        )
        centre = to_string(o.centerLabel) if has(o.centerLabel) else "Total"
        s += text(cx, cy + 2 + 14, centre.upper(), small(th, 9, 'text-anchor="middle" letter-spacing="1"'))
        lx = x0 + size + 22
        row_h = jmin(24, h / len(v))
        ly = cy - row_h * len(v) / 2
        for i, n in enumerate(v):
            y = ly + i * row_h + row_h / 2
            pct = js_round(n / tot * 100)
            tip = name(i) + ": " + fmt(n, o) + " (" + N(pct) + "%)"
            s += (
                '<circle cx="' + R(lx + 4) + '" cy="' + R(y) + '" r="4" fill="' + pal[i % len(pal)] + '"/>'
                + text(
                    lx + 14, y + 4, trunc(name(i), math.floor((x0 + w - lx - 50) / 6.7)),
                    'fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="12"',
                )
                + text(
                    x0 + w, y + 4, N(pct) + "%",
                    'text-anchor="end" fill="' + th["muted"] + '" font-family="' + MONO + '" font-size="11" font-weight="600"',
                )
                + hit(lx, y - row_h / 2, x0 + w - lx, row_h, tip)
            )
        start = 0
        for i, n in enumerate(v):
            length = n / tot * 100
            if length <= 0:
                continue
            s += (
                '<circle cx="' + R(cx) + '" cy="' + R(cy) + '" r="' + R(r) + '" fill="none" stroke="#000" stroke-opacity="0"'
                + ' stroke-width="' + R(sw) + '" pathLength="100" stroke-dasharray="' + R(length) + " " + R(100 - length)
                + '" stroke-dashoffset="' + R(-start) + '" transform="rotate(-90 ' + R(cx) + " " + R(cy)
                + ')" class="bzc-hit" data-tip="' + esc(name(i) + ": " + fmt(n, o) + " (" + N(js_round(length)) + "%)")
                + '"/>'
            )
            start += length
        return s

    return tile(o, th, h, draw, {"stat": st, "summary": "total " + fmt(tot, o) + " across " + str(len(v)) + " parts"})
