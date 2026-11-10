"""Waterfall chart, ported from src/charts/waterfall.js."""

from __future__ import annotations

import math

from .._js import js_str, parse_int, to_number
from .._tile import dims, tile
from .._util import R, anim, empty_state, fmt, goal_line, has, hit, jmax, jmin, legend, lst, nice_scale, num, nums, small, text, tw

_KINDS = ["up", "down", "total"]
_NAMES = {"up": "Rise", "down": "Fall", "total": "Total"}


def walk(v, labels, totals):
    """Each bar's name, kind, change and the levels it runs between."""
    # A label wins, so a total on "2026" finds the year. Otherwise a whole number is a position, counting from 0.
    at = []
    for m in lst(totals):
        i = labels.index(m) if m in labels else -1
        p = parse_int(m)
        at.append(int(p) if i < 0 and js_str(p) == m else i)
    run, out = 0, []
    for i, x in enumerate(v):
        name = labels[i] if i < len(labels) and labels[i] else "Step " + str(i + 1)
        frm = run
        run += x
        if i in at:
            out.append({"name": name, "kind": "total", "change": x, "from": 0, "to": run})
        else:
            out.append({"name": name, "kind": "down" if x < 0 else "up", "change": x, "from": frm, "to": run})
    return out


def _signed(x, o, short=False):
    return ("+" if x > 0 else "") + fmt(x, o, short)


def waterfall(o, th) -> str:
    v = nums(o.values)
    n = len(v)
    labels = lst(o.labels)
    names = lst(o.series)
    c = lst(o.color)
    steps = walk(v, labels, o.totals)
    cols = {
        "up": c[0] if len(c) > 0 and c[0] else th["up"],
        "down": c[1] if len(c) > 1 and c[1] else th["down"],
        "total": c[2] if len(c) > 2 and c[2] else th["palette"][0],
    }
    kinds = [k for k in _KINDS if any(st["kind"] == k for st in steps)]
    key_names = []
    for k in kinds:
        j = _KINDS.index(k)
        key_names.append(names[j] if j < len(names) and names[j] else _NAMES[k])
    key_pal = [cols[k] for k in kinds]

    def key(j, x, y):
        return '<rect x="' + R(x) + '" y="' + R(y + 1) + '" width="10" height="10" rx="2" fill="' + key_pal[j] + '"/>'

    legend_h = legend(key_names, key_pal, th, 0, 0, dims(o)["w"], key, 15)["height"] if n else 0
    h = num(o.height, 200) + legend_h
    end = steps[n - 1]["to"] if n else 0

    def tip_of(st):
        if st["kind"] == "total":
            return st["name"] + "\nTotal " + fmt(st["to"], o)
        return st["name"] + "\nChange " + _signed(st["change"], o) + "\nRunning total " + fmt(st["to"], o)

    def draw(x0, y0, w, h):
        if not n:
            return empty_state(th, x0, y0, w, h)
        s = legend(key_names, key_pal, th, x0, y0, w, key, 15)["svg"]
        top0 = y0 + legend_h
        levels = [0]
        for st in steps:
            levels += [st["from"], st["to"]]
        lo, hi = jmin(*levels), jmax(*levels)
        if has(o.goal):
            lo = jmin(lo, to_number(o.goal))
            hi = jmax(hi, to_number(o.goal))
        sc = nice_scale(lo, hi, 4)
        tl = [fmt(t, o, True) for t in sc.ticks]
        axis_w = jmax(*[tw(t, 10, True) for t in tl]) + 10
        px = x0 + axis_w
        pw = w - axis_w
        slot = pw / n
        bwid = jmin(slot * 0.62, 56)
        # Signed labels on every bar, so rises and falls read without colour. They only show when they all fit.
        tags = [fmt(st["to"], o, True) if st["kind"] == "total" else _signed(st["change"], o, True) for st in steps]
        show_tags = jmax(*[tw(t, 10, True) for t in tags]) <= slot - 2
        lab_max = jmax(*[tw(l, 10, True) for l in labels]) if labels else 0
        every = jmax(1, math.ceil(n * (lab_max + 8) / pw)) if labels else 1
        neg_tag = 14 if show_tags and sc.lo < 0 else 0
        top_pad = 16 if show_tags else 4
        py = top0 + top_pad
        ph = h - (top0 - y0) - top_pad - (20 if labels else 2) - neg_tag

        def Y(x):
            return py + ph - (x - sc.lo) / (sc.hi - sc.lo) * ph

        for i, t in enumerate(sc.ticks):
            s += (
                '<line x1="' + R(px) + '" x2="' + R(px + pw) + '" y1="' + R(Y(t)) + '" y2="' + R(Y(t)) + '" stroke="' + th["grid"] + '"'
                + ("" if t == 0 else ' stroke-dasharray="2 4"') + "/>"
                + text(px - 8, Y(t) + 3.5, tl[i], small(th, 10, 'text-anchor="end"'))
            )
        for i, st in enumerate(steps):
            x = px + i * slot + (slot - bwid) / 2
            yA = Y(jmax(st["from"], st["to"]))
            yB = Y(jmin(st["from"], st["to"]))
            bh = jmax(1, yB - yA)
            s += (
                '<rect x="' + R(x) + '" y="' + R(yA) + '" width="' + R(bwid) + '" height="' + R(bh) + '" rx="' + R(jmin(3, bwid / 2, bh / 2))
                + '" fill="' + cols[st["kind"]] + '"' + anim(o, "bzc-a", jmin(0.6, i * 0.05)) + "/>"
            )
            # A thin step from this bar's level across to the next bar.
            if i < n - 1:
                s += '<line x1="' + R(x + bwid) + '" x2="' + R(x + slot) + '" y1="' + R(Y(st["to"])) + '" y2="' + R(Y(st["to"])) + '" stroke="' + th["muted"] + '" stroke-dasharray="2 2"/>'
            if show_tags:
                below = jmax(st["from"], st["to"]) <= 0 and jmin(st["from"], st["to"]) < 0
                s += text(x + bwid / 2, yB + 12 if below else yA - 5, tags[i], small(th, 10, 'text-anchor="middle" font-weight="600"', th["fg"]))
            if i < len(labels) and i % every == 0:
                s += text(x + bwid / 2, py + ph + neg_tag + 15, labels[i], small(th, 10, 'text-anchor="middle"'))
        if has(o.goal):
            s += goal_line(o, th, px, px + pw, Y(to_number(o.goal)))
        for i, st in enumerate(steps):
            s += hit(px + i * slot, top0, slot, h - (top0 - y0), tip_of(st))
        return s

    summary = "ends at " + fmt(end, o) + " after " + str(n) + (" step" if n == 1 else " steps") if n else "no data"
    return tile(o, th, h, draw, {"summary": summary})
