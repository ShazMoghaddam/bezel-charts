"""Chart renderers. Each one takes options and a theme and returns an SVG string."""

from .line import line
from .spark import spark

TYPES = {"spark": spark, "line": line}

__all__ = ["TYPES"]
