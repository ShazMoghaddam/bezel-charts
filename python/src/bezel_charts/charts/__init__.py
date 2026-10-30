"""Chart renderers. Each one takes options and a theme and returns an SVG string."""

from .bars import bars
from .heatmap import heatmap
from .line import line
from .scatter import scatter
from .spark import spark

TYPES = {"spark": spark, "line": line, "bars": bars, "scatter": scatter, "heatmap": heatmap}

__all__ = ["TYPES"]
