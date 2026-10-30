"""Progress bar, single or stacked with a legend. Ported from src/charts/progress.js."""

from __future__ import annotations

from .._js import js_round
from .._tile import dims, tile
from .._util import (
    MONO, SANS, N, R, anim, clamp, empty_state, esc, fmt, has, hit, jmax, jmin, lst, new_id, num, nums, palette,
    stat_of, text, to_number, to_string, total, truthy, tw,
)


def progress(o, th) -> str:
    v = [jmax(0, n) for n in nums(o.values)]
    labels = lst(o.labels)
    pal = palette(o, th)
    single = len(v) == 1
    tot = total(v)
    mx = num(o.max, 100) if has(o.max) else 100 if single else tot
    if not mx > 0:
        mx = 1
    auto = not has(o.prefix) and not has(o.suffix) and mx == 100 and single

    def show(n):
        return fmt(n, o) + ("%" if auto else "")

    def label_of(i):
        return labels[i] if i < len(labels) and labels[i] else None

    w0 = dims(o)["w"]
    rows = 0
    layout = []
    if not single and v:
        x = 0
        rows = 1
        for i, n in enumerate(v):
            lb = label_of(i) or "#" + str(i + 1)
            wd = 14 + tw(lb, 12) + 6 + tw(fmt(n, o), 11, True) + 18
            if x > 0 and x + wd > w0:
                x = 0
                rows += 1
            layout.append({"x": x, "row": rows - 1, "l": lb})
            x += wd
    h = 22 + 14 + (12 + rows * 20 if rows else 0)
    st = stat_of(v, o, "")
    head_text = (show(v[0]) + ("" if auto else " of " + fmt(mx, o))) if single else fmt(tot, o) + " of " + fmt(mx, o)

    def draw(x0, y0, w, h):
        if not v:
            return empty_state(th, x0, y0, w, h)
        s = ""
        by = y0 + 22
        cid = new_id("c")
        if single and label_of(0):
            s += text(x0, y0 + 11, labels[0], 'fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="12"')
        s += text(
            x0 + w, y0 + 11, head_text,
            'text-anchor="end" fill="' + th["fg"] + '" font-family="' + MONO + '" font-size="11" font-weight="600"',
        )
        s += (
            '<rect x="' + N(x0) + '" y="' + N(by) + '" width="' + N(w) + '" height="14" rx="7" fill="' + th["grid"]
            + '" fill-opacity=".7"/>'
        )
        s += (
            '<clipPath id="' + cid + '"><rect x="' + N(x0) + '" y="' + N(by) + '" width="' + N(w)
            + '" height="14" rx="7"/></clipPath><g clip-path="url(#' + cid + ')"><g' + anim(o, "bzc-gx") + ">"
        )
        bg = to_string(o.background) if truthy(o.background) else th["tile"]
        acc = 0
        for i, n in enumerate(v):
            length = jmin(n, jmax(0, mx - acc)) / mx * w
            if length > 0:
                s += (
                    '<rect x="' + R(x0 + acc / mx * w) + '" y="' + N(by) + '" width="' + R(length)
                    + '" height="14" fill="' + pal[i % len(pal)] + '"/>'
                )
            if i > 0 and length > 0:
                s += (
                    '<rect x="' + R(x0 + acc / mx * w - 1) + '" y="' + N(by) + '" width="2" height="14" fill="' + bg + '"/>'
                )
            acc += n
        s += "</g></g>"
        if has(o.goal):
            gx = x0 + clamp(to_number(o.goal) / mx, 0, 1) * w
            s += (
                '<line x1="' + R(gx) + '" x2="' + R(gx) + '" y1="' + N(by - 4) + '" y2="' + N(by + 18) + '" stroke="'
                + th["fg"] + '" stroke-width="2" stroke-linecap="round"/>'
            )
        acc = 0
        for i, n in enumerate(v):
            length = jmin(n, jmax(0, mx - acc)) / mx * w
            if length > 0:
                name = label_of(i) or ("Progress" if single else "#" + str(i + 1))
                tip = name + ": " + show(n) + ("" if single else " (" + N(js_round(n / mx * 100)) + "%)")
                s += hit(x0 + acc / mx * w, by - 4, length, 22, tip)
            acc += n
        for i, it in enumerate(layout):
            lx = x0 + it["x"]
            ly = by + 14 + 12 + it["row"] * 20 + 8
            s += (
                '<circle cx="' + R(lx + 4) + '" cy="' + R(ly) + '" r="4" fill="' + pal[i % len(pal)] + '"/>'
                + '<text x="' + R(lx + 14) + '" y="' + R(ly + 4) + '" fill="' + th["fg"] + '" font-family="' + SANS
                + '" font-size="12">' + esc(it["l"]) + '<tspan dx="6" fill="' + th["muted"] + '" font-family="' + MONO
                + '" font-size="11">' + esc(fmt(v[i], o)) + "</tspan></text>"
            )
        return s

    return tile(o, th, h, draw, {"stat": st, "summary": head_text})
