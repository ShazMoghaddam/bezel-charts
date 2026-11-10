"""Chart renderers. Each one takes options and a theme and returns an SVG string."""

from .area import area
from .bars import bars
from .boxplot import boxplot
from .combo import combo
from .donut import donut
from .gauge import gauge
from .heatmap import heatmap
from .histogram import histogram
from .line import line
from .progress import progress
from .ring import ring
from .scatter import scatter
from .spark import spark

# Same order as NAMES in src/render.js.
TYPES = {
    "spark": spark, "line": line, "area": area, "bars": bars, "combo": combo, "histogram": histogram, "boxplot": boxplot, "scatter": scatter, "ring": ring, "donut": donut,
    "gauge": gauge, "progress": progress, "heatmap": heatmap,
}

__all__ = ["TYPES"]
