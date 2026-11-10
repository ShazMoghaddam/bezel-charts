"""Real dates along the bottom of line and area charts, ported from src/core/time.js."""

from __future__ import annotations

import datetime as dt
import math
import re

from ._js import _locale, month_short
from ._util import lst, to_string

HOUR = 3_600_000
DAY = 86_400_000
_EPOCH = dt.datetime(1970, 1, 1)
_ISO = re.compile(r"^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$")


def utc(y, mo, d, h=0, mi=0, s=0) -> int:
    """Date.UTC(y, mo, d, h, mi, s) in milliseconds, rolling over out-of-range parts as JavaScript does."""
    y += mo // 12
    mo %= 12
    t = dt.datetime(y, mo + 1, 1) + dt.timedelta(days=d - 1, hours=h, minutes=mi, seconds=s)
    return int((t - _EPOCH).total_seconds()) * 1000


def _date(t) -> dt.datetime:
    return _EPOCH + dt.timedelta(milliseconds=t)


def parse_dates(o, n):
    """The dates option as UTC milliseconds, one per point, or None unless every point has a valid date."""
    d = lst(o.dates)
    if not n or len(d) < n:
        return None
    out = []
    for i in range(n):
        m = _ISO.match(to_string(d[i]).strip())
        if not m:
            return None
        out.append(utc(int(m[1]), int(m[2]) - 1, int(m[3]), int(m[4] or 0), int(m[5] or 0), int(m[6] or 0)))
    return out


def _clock(t) -> str:
    d = _date(t)
    return f"{d.hour:02d}:{d.minute:02d}"


def _day_month(d, lang) -> str:
    mon = month_short(d, lang)
    return f"{mon} {d.day}" if _locale(lang) == "en-US" else f"{d.day} {mon}"


def date_text(t, lang, with_time) -> str:
    """A date for tooltips: "5 Jan 2026" (or "Jan 5, 2026" in en-US), with the time when the dates have times."""
    d = _date(t)
    mon = month_short(d, lang)
    out = f"{mon} {d.day}, {d.year}" if _locale(lang) == "en-US" else f"{d.day} {mon} {d.year}"
    return out + (" " + _clock(t) if with_time else "")


def has_times(T) -> bool:
    return any(t % DAY != 0 for t in T)


def point_name(labels, T, i, lang, timed) -> str:
    """A point's name: its label, else its date, else its number."""
    if i < len(labels) and labels[i]:
        return labels[i]
    return date_text(T[i], lang, timed) if T else "#" + str(i + 1)


_STEPS = [("h", 1), ("h", 3), ("h", 6), ("h", 12), ("d", 1), ("d", 2), ("w", 1), ("w", 2), ("m", 1), ("m", 2), ("m", 3),
          ("m", 6), ("y", 1), ("y", 2), ("y", 5), ("y", 10), ("y", 20), ("y", 50), ("y", 100)]
_ROUGH = {"h": HOUR, "d": DAY, "w": 7 * DAY, "m": 30.44 * DAY, "y": 365.25 * DAY}


def _ticks_for(t0, t1, unit, k):
    out = []
    if unit in ("h", "d", "w"):
        size = HOUR * k if unit == "h" else DAY * (7 * k if unit == "w" else k)
        frm = 4 * DAY if unit == "w" else 0  # 5 January 1970 was the first Monday after the epoch.
        t = math.ceil((t0 - frm) / size) * size + frm
        while t <= t1:
            out.append(t)
            t += size
        return out
    d = _date(t0)
    y, mo = d.year, (d.month - 1 if unit == "m" else 0)
    while True:
        t = utc(y, mo, 1)
        if t > t1:
            return out
        if t >= t0 and (mo % k == 0 if unit == "m" else y % k == 0):
            out.append(t)
        if unit == "m":
            mo += 1
            if mo == 12:
                mo = 0
                y += 1
        else:
            y += 1


def date_ticks(t0, t1, room, lang):
    """Ticks and labels for the dates t0 to t1: the smallest step that leaves about 64 px per label."""
    most = max(2, math.floor(room / 64))
    span = t1 - t0
    for unit, k in _STEPS:
        if span / (_ROUGH[unit] * k) > most + 2:
            continue
        ticks = _ticks_for(t0, t1, unit, k)
        if len(ticks) > most:
            continue
        out = []
        for j, t in enumerate(ticks):
            d = _date(t)
            if unit == "h":
                label = _day_month(d, lang) if t % DAY == 0 else _clock(t)
            elif unit in ("d", "w"):
                label = _day_month(d, lang)
            elif unit == "m":
                label = f"{month_short(d, lang)} {d.year}" if d.month == 1 or j == 0 else month_short(d, lang)
            else:
                label = str(d.year)
            out.append({"t": t, "text": label})
        return out
    return []
