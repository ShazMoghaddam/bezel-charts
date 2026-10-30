"""Activity-style rings, one per value. Ported from src/charts/ring.js."""

from __future__ import annotations

import math

from .._tile import tile
from .._util import (
    MONO, SANS, N, R, clamp, empty_state, esc, fmt, has, jmin, lst, num, nums, palette, small, stat_of, text,
    trunc, truthy,
)


def ring(o, th) -> str:
    v = nums(o.values)
    labels = lst(o.labels)
    pal = palette(o, th)
    mx = num(o.max, 100)
    mx = mx if truthy(mx) else 100
    h = num(o.height, 140)
    auto = not has(o.prefix) and not has(o.suffix) and mx == 100

    def show(n):
        return fmt(n, o) + ("%" if auto else "")

    def label_of(i):
        return labels[i] if i < len(labels) and labels[i] else "#" + str(i + 1)

    st = stat_of(v, o, "")

    def draw(x0, y0, w, h):
        if not v:
            return empty_state(th, x0, y0, w, h)
        s = ""
        single = len(v) == 1
        size = jmin(h, w if single else w * 0.55)
        cx = x0 + w / 2 if single else x0 + size / 2
        cy = y0 + h / 2
        sw = size * 0.12 if single else clamp(size * 0.42 / (len(v) * 1.35), 5, 16)
        gap = sw * 0.38
        for i, n in enumerate(v):
            r = size / 2 - sw / 2 - i * (sw + gap)
            if r <= sw / 2:
                continue
            pct = clamp(n / mx * 100, 0, 100)
            c = pal[i % len(pal)]
            s += (
                '<circle cx="' + R(cx) + '" cy="' + R(cy) + '" r="' + R(r) + '" fill="none" stroke="' + c
                + '" stroke-opacity=".16" stroke-width="' + R(sw) + '"/>'
            )
            if pct > 0:
                s += (
                    '<circle cx="' + R(cx) + '" cy="' + R(cy) + '" r="' + R(r) + '" fill="none" stroke="' + c
                    + '" stroke-width="' + R(sw) + '" stroke-linecap="round" pathLength="100" transform="rotate(-90 '
                    + R(cx) + " " + R(cy) + ')" style="stroke-dasharray:' + R(pct) + " 100"
                    + (";animation-delay:" + N(i * 0.12) + "s" if o.animate else "") + '"'
                    + (' class="bzc-s"' if o.animate else "") + "/>"
                )
            s += (
                '<circle cx="' + R(cx) + '" cy="' + R(cy) + '" r="' + R(r + sw / 2)
                + '" fill="#000" fill-opacity="0" class="bzc-hit" data-tip="'
                + esc(label_of(i) + ": " + show(n) + ("" if auto else " of " + fmt(mx, o))) + '"/>'
            )
        if single:
            s += text(
                cx, cy + size * 0.08, show(v[0]),
                'text-anchor="middle" fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="' + R(size * 0.22)
                + '" font-weight="800"',
            )
            if labels and labels[0]:
                s += text(cx, cy + size * 0.08 + 16, labels[0], small(th, 10, 'text-anchor="middle"'))
        else:
            lx = x0 + size + 22
            row_h = jmin(26, h / len(v))
            ly = cy - row_h * len(v) / 2
            for i, n in enumerate(v):
                y = ly + i * row_h + row_h / 2
                s += (
                    '<circle cx="' + R(lx + 4) + '" cy="' + R(y) + '" r="4" fill="' + pal[i % len(pal)] + '"/>'
                    + text(
                        lx + 14, y + 4, trunc(label_of(i), math.floor((x0 + w - lx - 60) / 6.7)),
                        'fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="12"',
                    )
                    + text(
                        x0 + w, y + 4, show(n),
                        'text-anchor="end" fill="' + th["fg"] + '" font-family="' + MONO + '" font-size="11" font-weight="600"',
                    )
                )
        return s

    summary = ", ".join(
        (labels[i] + " " if i < len(labels) and labels[i] else "") + show(n) for i, n in enumerate(v)
    )
    return tile(o, th, h, draw, {"stat": st, "summary": summary})
