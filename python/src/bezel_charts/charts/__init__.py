"""Chart renderers. Each one takes options and a theme and returns an SVG string."""

from .bars import bars
from .donut import donut
from .heatmap import heatmap
from .line import line
from .ring import ring
from .scatter import scatter
from .spark import spark

TYPES = {"spark": spark, "line": line, "bars": bars, "scatter": scatter, "heatmap": heatmap, "ring": ring, "donut": donut}

__all__ = ["TYPES"]
