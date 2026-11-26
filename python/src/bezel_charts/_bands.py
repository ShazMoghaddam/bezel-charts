"""Bands for line charts: shaded ranges with an optional middle line, for fan charts. Ported from src/core/bands.js."""

from __future__ import annotations

import math
from collections.abc import Mapping

from ._series import series_line
from ._util import DASHES, R, anim, fmt, has, lst, nums, ok, path_of, runs_of, series, to_string

#: Middle lines are dashed, a different dash per band, so bands differ by more than colour.
MID_DASHES = ["dashed", "dotted", "dashdot"]


def bands_of(o, pal, k) -> list:
    """The bands, from a list of {name, low, high, mid, color} dicts or from the band_low, band_high, band_mid,
    band_series and band_color options, with bands separated by "|". k is how many lines there are, so band colours
    follow on from theirs."""
    if isinstance(o.bands, (list, tuple)):
        raw = [
            {"low": nums(b.get("low")), "high": nums(b.get("high")), "mid": nums(b.get("mid")), "name": b.get("name"), "color": b.get("color")}
            for b in o.bands if isinstance(b, Mapping)
        ]
    else:
        L, H, M = series(o.bandLow), series(o.bandHigh), series(o.bandMid)
        names, cols = lst(o.bandSeries), lst(o.bandColor)
        raw = [
            {
                "low": L[j] if j < len(L) else [], "high": H[j] if j < len(H) else [], "mid": M[j] if j < len(M) else [],
                "name": names[j] if j < len(names) else None, "color": cols[j] if j < len(cols) else None,
            }
            for j in range(max(len(L), len(H), len(M)))
        ]
    out = []
    for j, b in enumerate(raw):
        out.append({
            "low": b["low"], "high": b["high"], "mid": b["mid"],
            "name": to_string(b["name"]) if has(b["name"]) else "Band " + str(j + 1),
            "color": to_string(b["color"]) if has(b["color"]) else pal[(k + j) % len(pal)],
            "dash": MID_DASHES[j % len(MID_DASHES)], "n": max(len(b["low"]), len(b["high"]), len(b["mid"])),
        })
    return out


def _at(v, i):
    return v[i] if i < len(v) else math.nan


def band_at(B, i) -> bool:
    """Whether any band has a value at point i."""
    return any(ok(_at(b["low"], i)) or ok(_at(b["high"], i)) or ok(_at(b["mid"], i)) for b in B)


def band_values(B) -> list:
    """Every number in the bands, for the value axis."""
    return [x for b in B for x in b["low"] + b["high"] + b["mid"]]


def band_key(b, x, y) -> str:
    """A legend swatch for a band: its shading, with its middle line's dash across it when it has one."""
    return (
        '<rect x="' + R(x) + '" y="' + R(y + 1) + '" width="18" height="10" rx="2" fill="' + b["color"] + '" fill-opacity=".28"/>'
        + (
            '<line x1="' + R(x + 1) + '" x2="' + R(x + 17) + '" y1="' + R(y + 6) + '" y2="' + R(y + 6) + '" stroke="' + b["color"]
            + '" stroke-width="2" stroke-dasharray="' + DASHES[b["dash"]] + '"/>'
            if any(ok(v) for v in b["mid"]) else ""
        )
    )


def draw_bands(o, B, X, Y, straight, bg, k0) -> str:
    """The shaded ranges, then the middle lines on top, as in JavaScript."""
    s = ""
    for j, b in enumerate(B):
        hi = [[X(i), Y(_at(b["high"], i))] for i in range(b["n"])]
        lo = [[X(i), Y(_at(b["low"], i))] for i in range(b["n"])]
        runs = runs_of([[i, 1 if math.isfinite(p[1]) and math.isfinite(lo[i][1]) else math.nan] for i, p in enumerate(hi)])
        fill = edge = ""
        for r in runs:
            a, z = r[0][0], r[-1][0] + 1
            top, base = hi[a:z], lo[a:z]
            fill += path_of(top, straight) + "L" + path_of(list(reversed(base)), straight)[1:] + "Z"
            edge += path_of(top, straight) + path_of(base, straight)
        if fill:
            s += (
                '<path d="' + fill + '" fill="' + b["color"] + '" fill-opacity=".2"' + anim(o, "bzc-a", j * 0.1) + "/>"
                + '<path d="' + edge + '" fill="none" stroke="' + b["color"] + '" stroke-opacity=".5" stroke-width="1"'
                + anim(o, "bzc-a", j * 0.1) + "/>"
            )
    for j, b in enumerate(B):
        mid = runs_of([[X(i), Y(v)] for i, v in enumerate(b["mid"])])
        if not mid:
            continue
        last = mid[-1][-1]
        s += (
            series_line(o, "".join(path_of(r, straight) for r in mid), b["color"], k0 + j, DASHES[b["dash"]])
            + '<circle cx="' + R(last[0]) + '" cy="' + R(last[1]) + '" r="3.5" fill="' + b["color"] + '" stroke="' + bg + '" stroke-width="2"/>'
        )
    return s


def band_tip(b, i, o) -> str:
    """A band's line in a tooltip at point i, such as "Good: 120 to 180, mid 150", or "" where it has nothing there."""
    lo, hi, mid = _at(b["low"], i), _at(b["high"], i), _at(b["mid"], i)
    rng = ok(lo) and ok(hi)
    if not rng and not ok(mid):
        return ""
    if rng and lo == hi and (not ok(mid) or mid == lo):
        return "\n" + b["name"] + ": " + fmt(lo, o)
    return "\n" + b["name"] + ": " + (fmt(lo, o) + " to " + fmt(hi, o) if rng else "") + (
        (", mid " if rng else "mid ") + fmt(mid, o) if ok(mid) else ""
    )
