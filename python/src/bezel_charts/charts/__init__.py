"""Chart renderers. Each one takes options and a theme and returns an SVG string."""

from .bars import bars
from .donut import donut
from .gauge import gauge
from .heatmap import heatmap
from .line import line
from .progress import progress
from .ring import ring
from .scatter import scatter
from .spark import spark

# Same order as TYPES in src/render.js.
TYPES = {
    "spark": spark, "line": line, "bars": bars, "scatter": scatter, "ring": ring, "donut": donut,
    "gauge": gauge, "progress": progress, "heatmap": heatmap,
}

__all__ = ["TYPES"]
