"""The four shape suspects. Each module exposes draw(canvas, mood)."""
from . import circle, rectangle, square, triangle

SUSPECTS = {
    "triangle": triangle.draw,
    "square": square.draw,
    "circle": circle.draw,
    "rectangle": rectangle.draw,
}
MOODS = ("idle", "shocked")
