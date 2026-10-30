"""Half-circle gauge with optional zones and a goal marker. Ported from src/charts/gauge.js."""

from __future__ import annotations

import math

from .._js import NAN, finite
from .._tile import tile
from .._util import (
    SANS, R, anim, clamp, empty_state, fmt, has, hit, jmin, lst, num, nums, palette, small, text, to_number,
    to_string, truthy,
)


def gauge(o, th) -> str:
    v = nums(o.values)
    val = v[0] if v else num(o.value, NAN)
    labels = lst(o.labels)
    mn, mx, h = num(o.min, 0), num(o.max, 100), num(o.height, 130)
    if mx == mn:
        mx = mn + 1
    zones = nums(o.zones)
    pal = palette(o, th)
    zc = pal if len([c for c in lst(o.color) if c]) > 1 else [th["up"], th["palette"][3], th["down"]]
    colour = pal[0]
    if zones and finite(val):
        z = 0
        while z < len(zones) and val >= zones[z]:
            z += 1
        colour = zc[min(z, len(zc) - 1)]
    auto = not has(o.prefix) and not has(o.suffix) and mn == 0 and mx == 100

    def show(n):
        return fmt(n, o) + ("%" if auto else "")

    label0 = labels[0] if labels and labels[0] else ""

    def draw(x0, y0, w, h):
        if not finite(val):
            return empty_state(th, x0, y0, w, h)
        Rr = jmin(w / 2, h - 22)
        sw = Rr * 0.16
        r = Rr - sw / 2
        cx = x0 + w / 2
        cy = y0 + Rr
        t = clamp((val - mn) / (mx - mn), 0, 1)

        def pt(f, rr):
            a = math.pi * (1 - f)
            return [cx + rr * math.cos(a), cy - rr * math.sin(a)]

        arc = "M" + R(cx - r) + "," + R(cy) + "A" + R(r) + "," + R(r) + " 0 0 1 " + R(cx + r) + "," + R(cy)
        s = (
            '<path d="' + arc + '" fill="none" stroke="' + colour + '" stroke-opacity=".16" stroke-width="' + R(sw)
            + '" stroke-linecap="round"/>'
        )
        for zv in zones:
            f = clamp((zv - mn) / (mx - mn), 0, 1)
            a, b = pt(f, r - sw / 2 - 3), pt(f, r - sw / 2 - 8)
            s += (
                '<line x1="' + R(a[0]) + '" y1="' + R(a[1]) + '" x2="' + R(b[0]) + '" y2="' + R(b[1]) + '" stroke="'
                + th["muted"] + '" stroke-width="1.5"/>'
            )
        if t > 0:
            s += (
                '<path d="' + arc + '" fill="none" stroke="' + colour + '" stroke-width="' + R(sw)
                + '" stroke-linecap="round" pathLength="100" style="stroke-dasharray:' + R(t * 100) + ' 100"'
                + anim(o, "bzc-s") + "/>"
            )
        e = pt(t, r)
        s += (
            '<circle cx="' + R(e[0]) + '" cy="' + R(e[1]) + '" r="' + R(sw * 0.26) + '" fill="'
            + (to_string(o.background) if truthy(o.background) else th["tile"]) + '"' + anim(o, "bzc-a", 0.9) + "/>"
        )
        if has(o.goal):
            gf = clamp((to_number(o.goal) - mn) / (mx - mn), 0, 1)
            g1, g2 = pt(gf, r + sw / 2 + 4), pt(gf, r - sw / 2 - 4)
            s += (
                '<line x1="' + R(g1[0]) + '" y1="' + R(g1[1]) + '" x2="' + R(g2[0]) + '" y2="' + R(g2[1]) + '" stroke="'
                + th["fg"] + '" stroke-width="2" stroke-linecap="round"/>'
            )
        s += text(
            cx, cy - Rr * 0.12, show(val),
            'text-anchor="middle" fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="' + R(Rr * 0.34)
            + '" font-weight="800"',
        )
        if label0:
            s += text(cx, cy - Rr * 0.12 + 16, label0, small(th, 10, 'text-anchor="middle"'))
        s += text(cx - r, cy + 18, fmt(mn, o, True), small(th, 10, 'text-anchor="middle"')) + text(
            cx + r, cy + 18, fmt(mx, o, True), small(th, 10, 'text-anchor="middle"')
        )
        tip = (
            (label0 + ": " if label0 else "") + show(val) + " (range " + fmt(mn, o) + " to " + fmt(mx, o) + ")"
            + ("\nGoal: " + fmt(to_number(o.goal), o) if has(o.goal) else "")
        )
        s += hit(cx - Rr, cy - Rr, Rr * 2, Rr, tip)
        return s

    summary = show(val) + " on a scale of " + fmt(mn, o) + " to " + fmt(mx, o) if finite(val) else "no data"
    return tile(o, th, h, draw, {"summary": summary})
