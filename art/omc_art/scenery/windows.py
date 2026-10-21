"""Window grids. Some lit windows hide a tiny shape-suspect silhouette."""
from ..paint import fill, pen
from ..palette import CORAL, DUSK, INK, MUSTARD
from ..shapes import poly, rect, rrect


def silhouette(c, rng, x, y, ww, wh):
    kind = rng.choice(["tri", "circ", "sq"])
    mx, by = x + ww / 2, y + wh
    if kind == "tri":
        c.drawPath(poly([(mx, by - 13), (mx + 6, by), (mx - 6, by)]), fill(INK))
    elif kind == "circ":
        c.drawCircle(mx, by - 4, 6, fill(INK))
    else:
        c.drawRect(rect(mx - 5, by - 11, mx + 5, by), fill(INK))


def windows(c, rng, l, t, r, b, lit=0.22, coral=0.04, off=DUSK, outline=True, peekers=False, ww=16, wh=22):
    gx, gy = 14, 18
    cols = max(1, int((r - l + gx) // (ww + gx)))
    rows = max(0, int((b - t + gy) // (wh + gy)))
    x0 = l + ((r - l) - (cols * ww + (cols - 1) * gx)) / 2
    for row in range(rows):
        for colm in range(cols):
            x = x0 + colm * (ww + gx)
            y = t + row * (wh + gy)
            roll = rng.random()
            colour = MUSTARD if roll < lit else CORAL if roll < lit + coral else off
            if colour != off:
                c.drawPath(rrect(x - 5, y - 5, x + ww + 5, y + wh + 5, 6), fill(colour, 38))
            c.drawPath(rrect(x, y, x + ww, y + wh, 3), fill(colour))
            if colour == MUSTARD and peekers and rng.random() < 0.18:
                silhouette(c, rng, x, y, ww, wh)
            if outline:
                c.drawPath(rrect(x, y, x + ww, y + wh, 3), pen(INK, 3))
