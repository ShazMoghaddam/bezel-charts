"""Treemaps: parts of a whole as tiles sized by value. Ported from src/charts/treemap.js."""

from __future__ import annotations

import re

from .._js import js_round, to_string
from .._tile import dims, tile
from .._util import MONO, SANS, R, anim, empty_state, esc, fmt, has, legend, lst, num, nums, ok, palette, ref, stat_of, text, total, tw


def _share(n, tot):
    """A share as a percentage: whole numbers from 10%, one decimal place below."""
    p = n / tot * 100 if tot else 0
    return js_round(p) if p >= 10 else js_round(p * 10) / 10


def _layout(v, labels, groups):
    """The items that can be drawn (real values above zero), in blocks by group, biggest first."""
    names, blocks, items, hidden = [], [], [], 0
    for i, n in enumerate(v):
        if not ok(n) or n <= 0:
            hidden += 1
            continue
        group = (to_string(groups[i]) if i < len(groups) and groups[i] else "") or "Other" if groups else ""
        g = names.index(group) if group in names else -1
        if groups and g < 0:
            g = len(names)
            names.append(group)
        it = {"i": i, "v": n, "name": labels[i] if i < len(labels) and labels[i] else "#" + str(i + 1), "group": group}
        items.append(it)
        key = max(0, g)
        b = next((x for x in blocks if x["g"] == key), None)
        if b is None:
            b = {"g": key, "items": [], "total": 0}
            blocks.append(b)
        b["items"].append(it)
        b["total"] += n
    for b in blocks:
        b["items"].sort(key=lambda it: -it["v"])
    blocks.sort(key=lambda b: -b["total"])
    top = sorted(items, key=lambda it: -it["v"])[0] if items else None
    return {"names": names, "blocks": blocks, "items": items, "total": total([it["v"] for it in items]), "hidden": hidden, "top": top}


def squarify(vals, x, y, w, h) -> list:
    """Squarified treemap layout, step for step as in JavaScript. Returns [x, y, w, h] for each value."""
    tot = total(vals)
    if not tot > 0 or not w > 0 or not h > 0:
        return [[x, y, 0, 0] for _ in vals]
    scale = w * h / tot
    areas = [a * scale for a in vals]
    out, i = [], 0

    def worst(first, last, s, side):
        return max(side * side * first / (s * s), s * s / (side * side * last))

    while i < len(areas):
        side = min(w, h)
        s = areas[i]
        j = i + 1
        now = worst(areas[i], areas[i], s, side)
        while j < len(areas):
            nxt = worst(areas[i], areas[j], s + areas[j], side)
            if nxt > now:
                break
            s += areas[j]
            now = nxt
            j += 1
        if w >= h:
            cw, yy = s / h, y
            for a in range(i, j):
                out.append([x, yy, cw, areas[a] / cw])
                yy += areas[a] / cw
            x += cw
            w -= cw
        else:
            rh, xx = s / w, x
            for b in range(i, j):
                out.append([xx, y, areas[b] / rh, rh])
                xx += areas[b] / rh
            y += rh
            h -= rh
        i = j
    return out


_HEX = re.compile(r"^#([0-9a-f]{3}|[0-9a-f]{6})$", re.I)


def _rgb(c):
    m = _HEX.match(to_string(c).strip())
    if not m:
        return None
    hx = m.group(1)
    if len(hx) == 3:
        hx = "".join(ch * 2 for ch in hx)
    return [int(hx[k:k + 2], 16) / 255 for k in (0, 2, 4)]


def _lin(x):
    return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4


def _ink_on(c, op, th):
    """White or near-black text, whichever stands out more against the tile as it shows."""
    a, b = _rgb(c), _rgb(th["tile"])
    if not a or not b:
        return th["fg"]
    mix = [x * op + b[k] * (1 - op) for k, x in enumerate(a)]
    L = 0.2126 * _lin(mix[0]) + 0.7152 * _lin(mix[1]) + 0.0722 * _lin(mix[2])
    return "#ffffff" if 1.05 / (L + 0.05) >= (L + 0.05) / 0.058 else "#14131a"


def _label_in(name, value, share, x, y, w, h, ink) -> str:
    """A tile's name and its value and share, top left, when they fit."""
    if w < 36 or h < 20:
        return ""
    # Names are semi-bold, about a tenth wider than the plain text tw() measures, so they're measured at 13.2px.
    room = w - 12
    nm = to_string(name)
    while len(nm) > 1 and tw(nm, 13.2) > room:
        nm = nm[:-2] + "…"
    if tw(nm, 13.2) > room:
        return ""
    s = text(x + 6, y + 15, nm, 'fill="' + ink + '" font-family="' + SANS + '" font-size="12" font-weight="600"')
    if h >= 36:
        pct = to_string(share) + "%"
        both = value + " · " + pct
        line = both if tw(both, 11, True) <= room else pct if tw(pct, 11, True) <= room else ""
        if line:
            s += text(x + 6, y + 30, line, 'fill="' + ink + '" fill-opacity=".85" font-family="' + MONO + '" font-size="11"')
    return s


def treemap(o, th) -> str:
    v = nums(o.values)
    labels, groups, pal = lst(o.labels), lst(o.groups), palette(o, th)
    lay = _layout(v, labels, groups)
    h = num(o.height, 260)
    st = stat_of(v, o, "")
    grouped = len(lay["names"]) > 0
    d0 = dims(o)
    legend_h = legend(lay["names"], pal, th, 0, 0, d0["w"])["height"] if grouped else 0

    def draw(x0, y0, w, h):
        if not lay["items"]:
            return empty_state(th, x0, y0, w, h)
        s, top = "", y0
        if legend_h:
            s += legend(lay["names"], pal, th, x0, y0, w)["svg"]
            top += legend_h
        ph = h - (top - y0)
        k = 0
        for g, gr in enumerate(squarify([b["total"] for b in lay["blocks"]], x0, top, w, ph)):
            b = lay["blocks"][g]
            inner = 2 if grouped else 0
            rects = squarify([it["v"] for it in b["items"]], gr[0] + inner, gr[1] + inner, gr[2] - inner * 2, gr[3] - inner * 2)
            for j, r in enumerate(rects):
                it = b["items"][j]
                base = pal[b["g"] % len(pal)] if grouped else pal[it["i"] % len(pal)]
                op = 1 - min(j, 4) * 0.08 if grouped else 1
                ink = _ink_on(base, op, th)
                x, y = r[0] + 1, r[1] + 1
                w0, h0 = max(0, r[2] - 2), max(0, r[3] - 2)
                share = _share(it["v"], lay["total"])
                tip = (it["group"] + " · " if it["group"] else "") + it["name"] + "\n" + fmt(it["v"], o) + " (" + to_string(share) + "%)"
                s += (
                    '<rect x="' + R(x) + '" y="' + R(y) + '" width="' + R(w0) + '" height="' + R(h0) + '" rx="' + R(min(4, w0 / 2, h0 / 2))
                    + '" fill="' + base + '"' + (' fill-opacity="' + R(op) + '"' if op < 1 else "")
                    + anim(o, "bzc-a", min(0.6, k * 0.03)) + ' data-tip="' + esc(tip) + '"' + ref(it["i"], it["v"]) + "/>"
                )
                k += 1
                s += _label_in(it["name"], fmt(it["v"], o, True), share, x, y, w0, h0, ink)
        return s

    n_items, n_groups = len(lay["items"]), len(lay["names"])
    summary = (
        "total " + fmt(lay["total"], o) + " across " + str(n_items) + (" item" if n_items == 1 else " items")
        + ((" in " + str(n_groups) + (" group" if n_groups == 1 else " groups")) if grouped else "")
        + ", largest " + lay["top"]["name"] + " (" + to_string(_share(lay["top"]["v"], lay["total"])) + "%)"
        + (", " + str(lay["hidden"]) + " not shown" if lay["hidden"] else "")
        if n_items else "no data"
    )
    return tile(o, th, h + legend_h, draw, {"stat": st, "summary": summary})
