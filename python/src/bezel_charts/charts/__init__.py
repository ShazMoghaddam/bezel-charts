"""Chart renderers. Each one takes options and a theme and returns an SVG string."""

from .bars import bars
from .line import line
from .spark import spark

TYPES = {"spark": spark, "line": line, "bars": bars}

__all__ = ["TYPES"]
