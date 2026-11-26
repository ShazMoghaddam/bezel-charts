"""Donut chart, folding anything past the top five into "Other". Ported from src/charts/donut.js."""

from __future__ import annotations

import math

from .._js import js_round
from .._tile import tile
from .._util import (
    ref, MONO, SANS, N, R, anim, empty_state, esc, fmt, has, ok, hit, jmax, jmin, lst, num, nums, palette, small, stat_of,
    text, to_string, total, trunc, utf16_len,
)


def _centre(o, th, cx, cy, size, sw, tot) -> str:
    """The total and the centre label, kept inside the hole, exactly as in JavaScript."""
    ri = size / 2 - sw
    big = fmt(tot, o, True)
    fs = size * 0.17

    def chord(dy):
        return 2 * math.sqrt(jmax(0, ri * ri - dy * dy)) - 8

    def wide(t, f):
        return utf16_len(t) * (f * 0.6 + 1)

    def fit(t, room):
        return math.floor((room / utf16_len(t) - 1) / 0.6 * 2) / 2

    lab = (to_string(o.centerLabel) if has(o.centerLabel) else "Total").upper()
    lines = [lab]
    ls = 9
    ty = cy + 2
    ly = [cy + 16]
    if wide(lab, 9) > chord(16):
        ls = jmax(7, fit(lab, chord(16)))
        words = [wd for wd in lab.split(" ") if wd]
        if ls == 7 and len(words) > 1 and wide(lab, 7) > chord(16):
            # Two lines, split where the larger one needs the least shrinking, and the whole centre moves up.
            best = -1
            for k in range(1, len(words)):
                a = " ".join(words[:k])
                b = " ".join(words[k:])
                f = jmin(9, fit(a, chord(10)), fit(b, chord(19)))
                if f > best:
                    best = f
                    lines = [a, b]
            if best < 7:
                # Still too long at 7px: fill the first line with whole words, and only the second is shortened.
                k = len(words) - 1
                while k > 1 and wide(" ".join(words[:k]), 7) > chord(10):
                    k -= 1
                lines = [" ".join(words[:k]), " ".join(words[k:])]
            ls = jmax(7, best)
            ty = cy - 3
            ly = [cy + 10, cy + 19]
        lines = [
            trunc(t, jmax(1, math.floor(chord(ly[i] - cy) / (ls * 0.6 + 1)))) if wide(t, ls) > chord(ly[i] - cy) else t
            for i, t in enumerate(lines)
        ]
    room = chord(fs * 0.7 + cy - ty)
    if utf16_len(big) * fs * 0.62 > room:
        fs = jmax(8, room / (utf16_len(big) * 0.62))
    return text(
        cx, ty, big,
        'text-anchor="middle" fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="' + R(fs) + '" font-weight="800"',
    ) + "".join(text(cx, ly[i], t, small(th, ls, 'text-anchor="middle" letter-spacing="1"')) for i, t in enumerate(lines))


def donut(o, th) -> str:
    # A missing part has no size to show, so it's left out of the ring and the legend.
    every = nums(o.values)
    keep0 = [i for i, n in enumerate(every) if ok(n)]
    lab0 = lst(o.labels)
    missing = len(every) - len(keep0)
    raw = [jmax(0, every[i]) for i in keep0]
    lab = [lab0[i] if i < len(lab0) and lab0[i] else "#" + str(i + 1) for i in keep0] if missing else lab0
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
        s += _centre(o, th, cx, cy, size, sw, tot)
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
                + hit(lx, y - row_h / 2, x0 + w - lx, row_h, tip, i, n)
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
                + ')" class="bzc-hit" data-skip="" data-tip="' + esc(name(i) + ": " + fmt(n, o) + " (" + N(js_round(length)) + "%)")
                + '"' + ref(i, n) + "/>"
            )
            start += length
        return s

    return tile(o, th, h, draw, {
        "stat": st, "summary": "total " + fmt(tot, o) + " across " + str(len(v)) + " parts" + (", " + str(missing) + " missing" if missing else ""),
    })
