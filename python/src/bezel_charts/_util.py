"""Shared helpers, ported from src/core/util.js.

Each function mirrors its JavaScript namesake, including the order of
floating point operations, so the SVG output matches exactly.
"""

from __future__ import annotations

import math
import random
import re

from ._js import (
    INF,
    NAN,
    finite,
    intl_format,
    is_num,
    jmax,
    jmin,
    js_round,
    js_str,
    parse_float,
    parse_int,
    pow10,
    to_fixed_number,
    to_number,
    to_string,
    truthy,
    utf16_len,
)

SANS = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"


class Opts:
    """Options with JavaScript-style access: a missing key reads as None (undefined).

    Not a dict subclass, so option names such as "values" never collide with dict methods.
    """

    __slots__ = ("_d",)

    def __init__(self, d=None):
        object.__setattr__(self, "_d", dict(d or {}))

    def __getattr__(self, key):
        return self._d.get(key)

    def __setattr__(self, key, value):
        self._d[key] = value

    def __getitem__(self, key):
        return self._d.get(key)

    def __setitem__(self, key, value):
        self._d[key] = value


_uid = 0
_B36 = "0123456789abcdefghijklmnopqrstuvwxyz"


def _base36(n: int) -> str:
    s = ""
    while True:
        n, r = divmod(n, 36)
        s = _B36[r] + s
        if not n:
            return s


def new_id(p: str) -> str:
    """A unique id, so several charts can share one page without clashing gradients."""
    global _uid
    _uid += 1
    return "bzc" + p + _base36(_uid) + "".join(random.choice(_B36) for _ in range(4))


_ESC = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}


def esc(s) -> str:
    return re.sub(r"[&<>\"']", lambda m: _ESC[m.group(0)], "" if s is None else to_string(s))


def r2(n: float) -> float:
    return js_round(n * 100) / 100


def R(n: float) -> str:
    """String(r2(n)), the most common way a coordinate reaches the SVG."""
    return js_str(r2(n))


N = js_str


def clamp(n, a, b):
    return jmax(a, jmin(b, n))


def num(v, d):
    n = parse_float(v) if v is not None else NAN
    return n if math.isfinite(n) else d


def has(v) -> bool:
    return not (v is None or (isinstance(v, str) and v == ""))


def _as_list(v):
    if hasattr(v, "tolist") and not isinstance(v, str):
        v = v.tolist()
    return v if isinstance(v, (list, tuple)) else None


def _finite_or_zero(x) -> float:
    n = to_number(x)
    return n if math.isfinite(n) else 0.0


def nums(v) -> list:
    arr = _as_list(v)
    if arr is not None:
        return [_finite_or_zero(x) for x in arr]
    if not has(v):
        return []
    return [_finite_or_zero(x) for x in re.split(r"[\s,;]+", to_string(v)) if x]


def lst(v) -> list:
    arr = _as_list(v)
    if arr is not None:
        return [to_string(x) for x in arr]
    if not has(v):
        return []
    return [s.strip() for s in to_string(v).split(",")]


def series(v) -> list:
    arr = _as_list(v)
    if arr is not None:
        if arr and _as_list(arr[0]) is not None:
            return [nums(s) for s in arr]
        return [nums(arr)]
    if not has(v):
        return []
    return [s for s in (nums(part) for part in to_string(v).split("|")) if s]


def total(v) -> float:
    s = 0
    for x in v:
        s = s + x
    return s


def tw(s, size, mono=False) -> float:
    return utf16_len(to_string(s)) * size * (0.6 if mono else 0.56)


def trunc(s, mx) -> str:
    s = to_string(s)
    if utf16_len(s) <= mx:
        return s
    units = s.encode("utf-16-le")
    keep = int(jmax(1, mx - 1))
    return units[: keep * 2].decode("utf-16-le", errors="ignore") + "…"


def bool_(v) -> bool:
    return v is True or (isinstance(v, str) and v in ("", "true", "1"))


def fmt(n, o, short=False) -> str:
    if not finite(n):
        return "–"
    a = abs(n)
    if has(o.decimals):
        p = parse_int(o.decimals)
        d = int(clamp(p if truthy(p) else 0, 0, 6))
        min_fd = d
    else:
        d = 0 if math.fmod(n, 1) == 0 else 2 if a < 10 else 1 if a < 100 else 0
        min_fd = 0
    compact = (bool_(o.compact) or short) and a >= 10000
    s = intl_format(a, o.lang if truthy(o.lang) else "en-GB", 1 if compact else d, 0 if compact else min_fd, compact)
    prefix = to_string(o.prefix) if truthy(o.prefix) else ""
    suffix = to_string(o.suffix) if truthy(o.suffix) else ""
    return ("−" if n < 0 else "") + prefix + s + suffix


class Scale:
    __slots__ = ("lo", "hi", "ticks")

    def __init__(self, lo, hi, ticks):
        self.lo, self.hi, self.ticks = lo, hi, ticks


def nice_scale(mn, mx, count=4) -> Scale:
    if mn == mx:
        if mn == 0:
            mx = 1
        else:
            p = abs(mn) * 0.1
            mn -= p
            mx += p
    step0 = (mx - mn) / (count or 4)
    mag = pow10(math.floor(math.log10(step0)))
    err = step0 / mag
    step = (1 if err <= 1 else 2 if err <= 2 else 5 if err <= 5 else 10) * mag
    lo = math.floor(mn / step) * step
    hi = math.ceil(mx / step) * step
    ticks = []
    t = lo
    while t <= hi + step / 2:
        ticks.append(to_fixed_number(t, 10))
        t += step
    return Scale(float(lo), float(hi), ticks)


def path_of(pts, straight) -> str:
    if not pts:
        return ""
    d = "M" + R(pts[0][0]) + "," + R(pts[0][1])
    for i in range(1, len(pts)):
        a, b = pts[i - 1], pts[i]
        if straight:
            d += "L" + R(b[0]) + "," + R(b[1])
        else:
            cx = (a[0] + b[0]) / 2
            d += "C" + R(cx) + "," + R(a[1]) + " " + R(cx) + "," + R(b[1]) + " " + R(b[0]) + "," + R(b[1])
    return d


def text(x, y, s, attrs=None) -> str:
    return '<text x="' + R(x) + '" y="' + R(y) + '" ' + (attrs or "") + ">" + esc(s) + "</text>"


def small(th, size=None, extra=None, fill=None) -> str:
    return (
        'fill="' + (fill or th["muted"]) + '" font-family="' + MONO + '" font-size="' + N(size or 10) + '"'
        + (" " + extra if extra else "")
    )


def hit(x, y, w, h, tip) -> str:
    return (
        '<rect class="bzc-hit" x="' + R(x) + '" y="' + R(y) + '" width="' + R(jmax(1, w)) + '" height="'
        + R(jmax(1, h)) + '" fill="#000" fill-opacity="0" data-tip="' + esc(tip) + '"/>'
    )


def anim(o, cls, delay=None) -> str:
    if not o.animate:
        return ""
    return ' class="' + cls + '"' + (' style="animation-delay:' + R(delay) + 's"' if truthy(delay) else "")


def palette(o, th) -> list:
    c = [x for x in lst(o.color) if x]
    return c if c else th["palette"]


def empty_state(th, x, y, w, h) -> str:
    return text(
        x + w / 2, y + h / 2 + 4, "No data yet",
        'text-anchor="middle" fill="' + th["muted"] + '" font-family="' + SANS + '" font-size="13"',
    )


def parse_notes(o, labels) -> list:
    if not has(o.notes):
        return []
    out = []
    for part in to_string(o.notes).split(";"):
        k = part.find(":")
        if k < 0:
            continue
        key, t = part[:k].strip(), part[k + 1:].strip()
        i = parse_int(key)
        if js_str(i) != key:
            i = labels.index(key) if key in labels else -1
        if i >= 0 and t:
            out.append({"i": int(i), "text": t})
    return out


def goal_line(o, th, x1, x2, y) -> str:
    label = (to_string(o.goalLabel) if has(o.goalLabel) else "Goal") + " " + fmt(num(o.goal, 0), o)
    return (
        '<line x1="' + R(x1) + '" x2="' + R(x2) + '" y1="' + R(y) + '" y2="' + R(y) + '" stroke="' + th["fg"]
        + '" stroke-opacity=".55" stroke-width="1.25" stroke-dasharray="4 4"/>'
        + text(x2, y - 5, label, small(th, 10, 'text-anchor="end"'))
    )


def stat_of(v, o, fallback=None):
    k = to_string(o.stat if has(o.stat) else (fallback or "")).lower()
    if not k or k == "none" or not v:
        return None
    s = total(v)
    table = {
        "last": v[-1], "total": s, "sum": s, "average": s / len(v), "avg": s / len(v),
        "max": jmax(*v), "min": jmin(*v),
    }
    if k not in table:
        return None
    delta = None
    if k == "last" and len(v) > 1 and o.delta != "none":
        delta = v[-1] - v[0]
    return {"val": table[k], "delta": delta}


def legend(names, pal, th, x0, y0, w):
    """A wrapping row of coloured dots and series names. Returns the SVG and the height it used."""
    x, y, s = x0, y0, ""
    for k, nm in enumerate(names):
        wd = 13 + tw(nm, 12) + 16
        if x > x0 and x + wd - 16 > x0 + w:
            x = x0
            y += 20
        s += (
            '<circle cx="' + R(x + 4) + '" cy="' + R(y + 6) + '" r="4" fill="' + pal[k % len(pal)] + '"/>'
            + text(x + 13, y + 10, nm, 'fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="12"')
        )
        x += wd
    return {"svg": s, "height": y - y0 + 24}


__all__ = [
    "INF", "NAN", "MONO", "SANS", "N", "Opts", "R", "anim", "bool_", "clamp", "empty_state", "esc", "finite",
    "fmt", "goal_line", "has", "hit", "is_num", "jmax", "jmin", "legend", "lst", "new_id", "nice_scale", "num",
    "nums", "palette", "parse_notes", "path_of", "r2", "series", "small", "stat_of", "text", "to_number",
    "to_string", "total", "trunc", "truthy", "tw",
]
