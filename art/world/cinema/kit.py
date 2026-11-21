"""Two shape helpers from the films' shared kit: a rectangle path and a soft drop shadow.

Copied from omc_cinema/kit.py in the one-more-clue-videos repo (last changed there in 2597bf2, 2026-11-16).
Left out: the cast, captions and the pre-render checks.
"""
from __future__ import annotations

import skia

from .film import fill


def soft_shadow(c, path, dx, dy, blur, alpha=0.5):
    """A blurred copy of a shape behind it, so things sit on surfaces instead of floating."""
    paint = fill("#000000", alpha)
    paint.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    c.save()
    c.translate(dx, dy)
    c.drawPath(path, paint)
    c.restore()


def box(x0, y0, x1, y1):
    p = skia.Path()
    p.addRect(skia.Rect.MakeLTRB(x0, y0, x1, y1))
    return p
