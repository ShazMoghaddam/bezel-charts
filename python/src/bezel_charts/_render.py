"""Pure rendering: options in, SVG string out. Ported from src/render.js."""

from __future__ import annotations

import re

from ._tile import THEMES
from ._util import Opts, bool_
from .charts import TYPES


def _camel(key: str) -> str:
    """show-values and show_values both become showValues, matching the HTML attribute names."""
    return re.sub(r"[-_]([a-z])", lambda m: m.group(1).upper(), key)


def render(type: str, options: dict | None = None) -> str:
    """Renders a chart to an SVG string, hover targets included, exactly like render() in JavaScript."""
    if type not in TYPES:
        raise ValueError(f'Bezel Charts: unknown chart type "{type}". Choose one of: {", ".join(TYPES)}.')
    o = Opts()
    for k, v in (options or {}).items():
        o[_camel(k)] = v
    o.animate = bool_(o.animate)
    o.frame = "none" if o.frame == "none" else "bezel"
    mode = o.theme if o.theme in ("light", "dark") else (o.autoTheme or "dark")
    if mode not in THEMES:
        raise ValueError(f'bezel_charts: theme must be "light" or "dark", not "{mode}".')
    return TYPES[type](o, THEMES[mode])


def to_static(svg: str) -> str:
    """Strips hover targets and tooltip data so the SVG is a clean static image."""
    svg = re.sub(r'<rect class="bzc-hit"[^>]*/>', "", svg)
    svg = re.sub(r'<circle[^>]* class="bzc-hit"[^>]*/>', "", svg)
    return re.sub(r' data-tip="[^"]*"', "", svg)


def to_svg(type: str, options: dict | None = None) -> str:
    """Renders a static SVG ready for a README, Notion page or slide."""
    return to_static(render(type, {**(options or {}), "animate": False}))
