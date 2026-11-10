"""JavaScript semantics in Python.

The renderers are a line-by-line port of the JavaScript ones, so they need a
few behaviours JavaScript has and Python does not: how numbers turn into
strings, how Math.round and parseFloat behave, and how Intl.NumberFormat
formats numbers. Matching these exactly is what lets the Python package draw
byte-for-byte the same SVG as the browser.
"""

from __future__ import annotations

import math
import re
import warnings
from decimal import ROUND_HALF_UP, Decimal, localcontext

NAN = float("nan")
INF = float("inf")

_NUMERIC = re.compile(r"^[+-]?(?:Infinity|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$")
_LEADING_FLOAT = re.compile(r"^[+-]?(?:Infinity|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)")
_LEADING_INT = re.compile(r"^[+-]?\d+")


def is_num(v) -> bool:
    """True for real numbers, excluding bools (JavaScript has no int/bool overlap)."""
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def finite(x) -> bool:
    return is_num(x) and math.isfinite(x)


def truthy(v) -> bool:
    """JavaScript truthiness for the values the renderers handle."""
    if v is None or v is False:
        return False
    if is_num(v):
        return v != 0 and v == v
    if isinstance(v, str):
        return v != ""
    return True


def js_str(x) -> str:
    """String(number), following the ECMAScript Number::toString rules."""
    x = float(x)
    if x != x:
        return "NaN"
    if x == INF:
        return "Infinity"
    if x == -INF:
        return "-Infinity"
    if x == 0:
        return "0"
    sign = "-" if x < 0 else ""
    # repr gives the shortest digits that round-trip, which is what JavaScript uses too.
    t = Decimal(repr(abs(x))).normalize().as_tuple()
    digits = "".join(map(str, t.digits))
    k = len(digits)
    n = t.exponent + k
    if k <= n <= 21:
        out = digits + "0" * (n - k)
    elif 0 < n <= 21:
        out = digits[:n] + "." + digits[n:]
    elif -6 < n <= 0:
        out = "0." + "0" * (-n) + digits
    else:
        e = n - 1
        es = ("+" if e >= 0 else "-") + str(abs(e))
        out = (digits if k == 1 else digits[0] + "." + digits[1:]) + "e" + es
    return sign + out


def to_string(v) -> str:
    """String(value) for the kinds of values options can hold."""
    if v is None:
        return "null"
    if v is True:
        return "true"
    if v is False:
        return "false"
    if is_num(v):
        return js_str(v)
    if isinstance(v, (list, tuple)):
        return ",".join("" if x is None else to_string(x) for x in v)
    return str(v)


def to_number(v) -> float:
    """The unary plus operator, Number(value)."""
    if v is None:
        return 0.0
    if v is True:
        return 1.0
    if v is False:
        return 0.0
    if is_num(v):
        return float(v)
    if isinstance(v, str):
        s = v.strip()
        if s == "":
            return 0.0
        if _NUMERIC.match(s):
            return float(s.replace("Infinity", "inf"))
        low = s.lower()
        for prefix, base in (("0x", 16), ("0o", 8), ("0b", 2)):
            if low.startswith(prefix):
                try:
                    return float(int(s[2:], base))
                except ValueError:
                    return NAN
        return NAN
    try:
        return float(v)
    except (TypeError, ValueError):
        return NAN


def parse_float(v) -> float:
    """parseFloat(value): reads the leading number and ignores the rest."""
    if is_num(v):
        return float(v)
    m = _LEADING_FLOAT.match(to_string(v).strip())
    if not m:
        return NAN
    return float(m.group(0).replace("Infinity", "inf"))


def parse_int(v) -> float:
    """parseInt(value, 10)."""
    m = _LEADING_INT.match(to_string(v).strip())
    return float(int(m.group(0))) if m else NAN


def js_round(x: float) -> float:
    """Math.round: halves round towards positive infinity."""
    if not math.isfinite(x):
        return x
    f = math.floor(x)
    return float(f + 1 if x - f >= 0.5 else f)


def jmin(*a) -> float:
    """Math.min: NaN wins, no arguments gives Infinity."""
    if any(x != x for x in a):
        return NAN
    return min(a) if a else INF


def jmax(*a) -> float:
    """Math.max: NaN wins, no arguments gives -Infinity."""
    if any(x != x for x in a):
        return NAN
    return max(a) if a else -INF


def to_fixed_number(x: float, digits: int) -> float:
    """+x.toFixed(digits): halves round away from zero on the exact value."""
    if not math.isfinite(x) or abs(x) >= 1e21:
        return x
    with localcontext() as ctx:
        ctx.prec = 400
        q = Decimal(x).quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP)
    return float(q)


def utf16_len(s: str) -> int:
    """String length as JavaScript counts it, in UTF-16 code units."""
    return len(s.encode("utf-16-le")) // 2


def js_upper(s: str) -> str:
    return s.upper()


# Math.pow(10, k) in V8 is not always correctly rounded (Math.pow(10, -5) is 9.999999999999999e-6).
# These are the exponents where it differs from Python, read from Node so scales line up exactly.
_V8_POW10 = {
    -307: "0x1.1fa182c40c60ep-1020", -306: "0x1.6789e3750f790p-1017", -303: "0x1.5f1ca820511c4p-1007",
    -278: "0x1.6b0a8e8920000p-924", -268: "0x1.a6a2b85062ab4p-891", -246: "0x1.bf7b9d9cce00ep-818",
    -222: "0x1.72262f3133ed0p-738", -207: "0x1.48c22ca71a1bep-688", -166: "0x1.79657025b6234p-552",
    -163: "0x1.708d0f84d3de8p-542", -148: "0x1.4756ccb01abfcp-492", -145: "0x1.3faac3e3fa1f4p-482",
    -138: "0x1.7d12a4670c122p-459", -128: "0x1.bba08cf8c979cp-426", -122: "0x1.a71368f0f3046p-406",
    -111: "0x1.33d4032c2c7f4p-369", -106: "0x1.d5b561574765cp-353", -104: "0x1.6ef5b40c2fc78p-346",
    -101: "0x1.665bf1d3e6a8cp-336", -88: "0x1.97683df2f268ep-293", -76: "0x1.7288e1271f514p-253",
    -63: "0x1.a53fc9631d10cp-210", -57: "0x1.91bc08eac9a42p-190", -39: "0x1.5c72fb1552d84p-130",
    -32: "0x1.9f623d5a8a732p-107", -29: "0x1.95a5efea6b348p-97", -24: "0x1.357c299a88ea8p-80",
    -23: "0x1.82db34012b252p-77", -21: "0x1.2e3b40a0e9b50p-70", -20: "0x1.79ca10c924224p-67",
    -17: "0x1.70ef54646d496p-57", -5: "0x1.4f8b588e368f0p-17", -4: "0x1.a36e2eb1c432cp-14",
    23: "0x1.52d02c7e14af6p+76", 26: "0x1.4adf4b7320334p+86", 29: "0x1.431e0fae6d722p+96",
    34: "0x1.ed09bead87c04p+112", 36: "0x1.812f9cf7920e2p+119", 39: "0x1.78287f49c4a1ep+129",
    42: "0x1.6f578c4e0a060p+139", 49: "0x1.b5e7e08ca3a90p+162", 58: "0x1.97d4df19d6058p+192",
    61: "0x1.8e45e1df3b016p+202", 70: "0x1.72ebad6ddc73cp+232", 95: "0x1.7f85de8ad5c4ep+315",
    96: "0x1.df67562d8b362p+318", 111: "0x1.a9cbc59b83a3ep+368", 126: "0x1.7a2ecc414a040p+418",
    136: "0x1.b843422e3a84cp+451", 142: "0x1.a3de04895e46cp+471", 165: "0x1.15d847ad00088p+548",
    166: "0x1.5b4e5998400aap+551", 169: "0x1.532a837eae8a6p+561", 187: "0x1.262dfeebbb0fap+621",
    191: "0x1.671b25aec1d88p+634", 215: "0x1.290ba9a38c7d2p+714", 218: "0x1.221563a9b7322p+724",
    225: "0x1.59ce797fb8180p+747", 232: "0x1.9c3bc80c85c7ep+770", 242: "0x1.dfe729b9ff152p+803",
    244: "0x1.76ec98994f488p+810", 260: "0x1.a03fde214caf0p+863", 273: "0x1.d9388b3aa30a6p+906",
    274: "0x1.27c35704a5e68p+910", 275: "0x1.71b42cc5cf602p+913", 279: "0x1.c34c70a777a4cp+926",
    284: "0x1.585041b2c477ep+943", 290: "0x1.485ce9e7a065ep+963", 294: "0x1.90d56b873f4c6p+976",
}


def pow10(k: int) -> float:
    """Math.pow(10, k) exactly as V8 computes it."""
    v = _V8_POW10.get(k)
    return float.fromhex(v) if v is not None else math.pow(10, k)


# Number formatting, Intl.NumberFormat ------------------------------------------------

_COMPACT = {
    "en-GB": ("", "k", "m", "bn", "tn"),
    "en-US": ("", "K", "M", "B", "T"),
}
_ALIASES = {"en": "en-US", "en-us": "en-US", "en-gb": "en-GB", "en-uk": "en-GB"}
_warned: set = set()


def _locale(lang) -> str:
    key = to_string(lang)
    if key in _COMPACT:
        return key
    alias = _ALIASES.get(key.lower())
    if alias:
        return alias
    if key not in _warned:
        _warned.add(key)
        warnings.warn(
            f'bezel_charts: number formats for lang "{key}" are not built in yet, '
            "so numbers use en-GB formatting. Dates and numbers in the browser version still follow the locale.",
            stacklevel=4,
        )
    return "en-GB"


def _group(int_part: str, min_grouping: int = 1) -> str:
    if len(int_part) < 3 + min_grouping:
        return int_part
    out = ""
    while len(int_part) > 3:
        out = "," + int_part[-3:] + out
        int_part = int_part[:-3]
    return int_part + out


def _decimal_string(d: Decimal, max_fd: int, min_fd: int, min_grouping: int = 1) -> str:
    with localcontext() as ctx:
        ctx.prec = 400
        q = d.quantize(Decimal(1).scaleb(-max_fd), rounding=ROUND_HALF_UP)
    s = format(q, "f")
    if "." in s:
        ip, fp = s.split(".")
    else:
        ip, fp = s, ""
    while len(fp) > min_fd and fp.endswith("0"):
        fp = fp[:-1]
    return _group(ip, min_grouping) + ("." + fp if fp else "")


def intl_format(a: float, lang, max_fd: int, min_fd: int, compact: bool) -> str:
    """Intl.NumberFormat(lang, opts).format(a) for a non-negative, finite a.

    ICU rounds the shortest decimal form of the double (so 1.005 becomes 1.01),
    which is why this works from repr() rather than the exact binary value.
    """
    loc = _locale(lang)
    d = Decimal(repr(float(a)))
    if not compact:
        return _decimal_string(d, max_fd, min_fd)
    units = _COMPACT[loc]
    if d == 0:
        return "0"
    mag = d.adjusted()
    bucket = min(max(mag, 0) // 3, 4)
    with localcontext() as ctx:
        ctx.prec = 400
        scaled = d.scaleb(-3 * bucket).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
        if scaled >= 1000 and bucket < 4:
            bucket += 1
            scaled = d.scaleb(-3 * bucket).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    # Compact numbers only get a thousands separator from five digits up (1000tn, 10,000tn).
    return _decimal_string(scaled, 1, 0, min_grouping=2) + units[bucket]


def to_fixed(x: float, digits: int) -> str:
    """x.toFixed(digits) as a string: halves round away from zero on the exact binary value."""
    if not math.isfinite(x) or abs(x) >= 1e21:
        return js_str(x)
    if x == 0:
        x = 0.0  # -0 prints without a sign in JavaScript
    with localcontext() as ctx:
        ctx.prec = 400
        q = Decimal(x).quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP)
    return format(q, "f")


# Dates, Intl.DateTimeFormat --------------------------------------------------------------

_MONTHS = {
    "en-GB": ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"),
    "en-US": ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"),
}
_WEEKDAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")


def month_short(d, lang) -> str:
    return _MONTHS[_locale(lang)][d.month - 1]


def weekday_short(d, lang) -> str:
    _locale(lang)
    return _WEEKDAYS[d.weekday()]


def full_date(d, lang) -> str:
    """{weekday: short, day: numeric, month: short, year: numeric}, e.g. Mon, 7 Sept 2026."""
    loc = _locale(lang)
    month = _MONTHS[loc][d.month - 1]
    if loc == "en-US":
        return f"{_WEEKDAYS[d.weekday()]}, {month} {d.day}, {d.year}"
    return f"{_WEEKDAYS[d.weekday()]}, {d.day} {month} {d.year}"
