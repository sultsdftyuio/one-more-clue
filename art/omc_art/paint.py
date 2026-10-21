"""Paints and the flat cartoon fill used by every shape."""
import skia

from .palette import INK, OUTLINE, WHITE
from .shapes import minus, moved


def col(hex_: str, a: int = 255) -> int:
    h = hex_.lstrip("#")
    return skia.Color(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def fill(hex_: str, a: int = 255) -> skia.Paint:
    return skia.Paint(Color=col(hex_, a), AntiAlias=True)


def pen(hex_: str, width: float, a: int = 255) -> skia.Paint:
    return skia.Paint(
        Color=col(hex_, a),
        AntiAlias=True,
        Style=skia.Paint.kStroke_Style,
        StrokeWidth=width,
        StrokeCap=skia.Paint.kRound_Cap,
        StrokeJoin=skia.Paint.kRound_Join,
    )


def solid(c, path, base, dark=None, shadow=(14, 12), shine=None, outline=OUTLINE):
    """Flat cartoon fill: base colour, a hard shadow crescent, a shine stroke, ink outline."""
    c.drawPath(path, fill(base))
    if dark or shine:
        c.save()
        c.clipPath(path, doAntiAlias=True)
        if dark:
            c.drawPath(minus(path, moved(path, -shadow[0], -shadow[1])), fill(dark))
        if shine:
            c.drawPath(shine, pen(WHITE, 9, 140))
        c.restore()
    if outline:
        c.drawPath(path, pen(INK, outline))


def curve(c, p0, ctrl, p1, width=7, color=INK, a=255):
    p = skia.Path()
    p.moveTo(*p0)
    p.quadTo(*ctrl, *p1)
    c.drawPath(p, pen(color, width, a))
