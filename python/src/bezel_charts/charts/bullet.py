"""Bullet chart, ported from src/charts/bullet.js."""

from __future__ import annotations

import math

from .._js import NAN, finite
from .._tile import dims, tile
from .._util import (
    MONO, SANS, R, anim, empty_state, fmt, has, hit, jmax, jmin, legend, lst, num, nums, palette, series, text, trunc, tw,
)


def _zones_of(Z, i):
    return sorted(Z[i] if len(Z) > 1 and i < len(Z) else Z[0] if len(Z) == 1 else [])


def _row_of(o, val, t, zs, zone_names):
    """One row's cells, formatted: actual, target, difference and the band the actual falls in."""
    j, nb = 0, len(zs) + 1
    while j < len(zs) and val >= zs[j]:
        j += 1
    d = val - t
    band = (zone_names[j] if j < len(zone_names) and zone_names[j] else str(j + 1) + " of " + str(nb)) if zs else ""
    return [fmt(val, o), fmt(t, o), ("+" if d > 0 else "") + fmt(d, o) if finite(d) else "–", band]


def bullet(o, th) -> str:
    v = nums(o.values)
    n = len(v)
    labels = lst(o.labels)
    names = lst(o.series)
    pal = palette(o, th)
    T = nums(o.targets)
    Z = series(o.zones)
    zone_names = lst(o.zoneLabels)
    many = len(lst(o.color)) > 1

    def target_of(i):
        if len(T) == 1:
            return T[0]
        return T[i] if i < len(T) else NAN

    def has_t(i):
        return finite(target_of(i))

    any_t = any(has_t(i) for i in range(n))

    def name_of(i):
        return labels[i] if i < len(labels) and labels[i] else "Measure " + str(i + 1)

    key_names = [names[0] if len(names) > 0 and names[0] else "Actual", names[1] if len(names) > 1 and names[1] else "Target"]

    def key(j, x, y):
        if j:
            return '<line x1="' + R(x + 5) + '" x2="' + R(x + 5) + '" y1="' + R(y) + '" y2="' + R(y + 12) + '" stroke="' + th["fg"] + '" stroke-width="2.5"/>'
        return '<rect x="' + R(x) + '" y="' + R(y + 3) + '" width="10" height="6" rx="1.5" fill="' + pal[0] + '"/>'

    d0 = dims(o)
    row_h = 32
    legend_h = legend(key_names, pal, th, 0, 0, d0["w"], key, 15)["height"] if any_t and n else 0
    h = legend_h + jmax(1, n) * row_h - 8
    met = len([x for i, x in enumerate(v) if has_t(i) and x >= target_of(i)])

    def tip_of(i):
        row = _row_of(o, v[i], target_of(i), _zones_of(Z, i), zone_names)
        return (
            name_of(i) + "\n" + key_names[0] + " " + row[0]
            + ("\n" + key_names[1] + " " + row[1] + "\nDifference " + row[2] if has_t(i) else "")
            + ("\nBand " + row[3] if row[3] else "")
        )

    def draw(x0, y0, w, h):
        if not n:
            return empty_state(th, x0, y0, w, h)
        s, top0 = "", y0
        if legend_h:
            s += legend(key_names, pal, th, x0, y0, w, key, 15)["svg"]
            top0 += legend_h
        lab_w = jmin(w * 0.4, jmax(*[tw(l, 12) for l in labels]) + 12) if labels else 0
        val_w = jmax(*[tw(fmt(x, o), 11, True) for x in v]) + 10
        bx = x0 + lab_w
        bw = jmax(1, w - lab_w - val_w)
        for i in range(n):
            val, t, zs = v[i], target_of(i), _zones_of(Z, i)
            ry = top0 + i * row_h
            cy = ry + 12
            ends = [0, val] + zs + ([t] if has_t(i) else [])
            lo = jmin(*ends)
            # A little room past the largest value, so a target there doesn't sit on the edge.
            hi = num(o.max, 1) if has(o.max) else jmax(*ends) * 1.08
            if hi <= lo:
                hi = lo + 1

            def X(x, lo=lo, hi=hi):
                return bx + (jmin(hi, jmax(lo, x)) - lo) / (hi - lo) * bw

            # The bands, darkest at the low end, so they read in greyscale and print well.
            edges = [lo] + [z for z in zs if lo < z < hi] + [hi]
            nb = len(edges) - 1
            for b in range(nb):
                op = 0.1 + 0.3 * (nb - 1 - b) / (nb - 1) if nb > 1 else 0.14
                s += (
                    '<rect x="' + R(X(edges[b])) + '" y="' + R(cy - 10) + '" width="' + R(X(edges[b + 1]) - X(edges[b])) + '" height="20" fill="' + th["muted"]
                    + '" fill-opacity="' + R(op) + '"/>'
                )
            a = X(jmin(0, val))
            ln = X(jmax(0, val)) - a
            if ln > 0:
                s += (
                    '<rect x="' + R(a) + '" y="' + R(cy - 4) + '" width="' + R(ln) + '" height="8" rx="1.5" fill="' + (pal[i % len(pal)] if many else pal[0]) + '"'
                    + anim(o, "bzc-gx", i * 0.06) + "/>"
                )
            if has_t(i):
                s += '<line x1="' + R(X(t)) + '" x2="' + R(X(t)) + '" y1="' + R(cy - 8) + '" y2="' + R(cy + 8) + '" stroke="' + th["fg"] + '" stroke-width="2.5"/>'
            if i < len(labels):
                s += text(x0, cy + 4, trunc(labels[i], math.floor(lab_w / 6.7)), 'fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="12"')
            s += text(x0 + w, cy + 4, fmt(val, o), 'text-anchor="end" fill="' + th["fg"] + '" font-family="' + MONO + '" font-size="11" font-weight="600"')
            s += hit(x0, ry, w, row_h - 8, tip_of(i))
        return s

    measures = " measure" if n == 1 else " measures"
    summary = "no data" if not n else str(met) + " of " + str(n) + measures + " at or above target" if any_t else str(n) + measures
    return tile(o, th, h, draw, {"summary": summary})
