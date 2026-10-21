"""Phone showing the group chat, with the edited last message."""
from ..paint import fill, pen, solid
from ..palette import BRICK, CORAL, CORAL_DK, CREAM, DUSK, INK, LILAC, MUSTARD, MUSTARD_DK, TEAL
from ..shapes import oval, poly, rect, rrect

# (l, t, r, b), colour, text lines as (x0, y, x1)
BUBBLES = [
    ((136, 80, 232, 114), LILAC, [(150, 97, 214)]),
    ((166, 126, 264, 160), MUSTARD, [(180, 143, 248)]),
    ((136, 172, 246, 222), TEAL, [(150, 188, 230), (150, 206, 204)]),
    ((158, 236, 264, 282), CREAM, [(172, 252, 248), (172, 268, 222)]),
]


def edited_pencil(c):
    c.save()
    c.rotate(-40, 246, 268)
    c.drawPath(rrect(236, 263, 258, 273, 3), fill(CORAL))
    c.drawPath(poly([(258, 263), (266, 268), (258, 273)]), fill(INK))
    c.restore()


def draw(c):
    c.save()
    c.rotate(8, 200, 200)
    solid(c, rrect(108, 26, 292, 374, 34), CORAL, CORAL_DK, shadow=(12, 0))
    c.drawRect(rect(290, 110, 298, 150), fill(CORAL_DK))
    screen = rrect(124, 56, 276, 344, 20)
    c.drawPath(screen, fill(BRICK))
    c.drawPath(screen, pen(INK, 6))
    c.drawPath(rrect(176, 40, 224, 50, 5), fill(INK))
    for (l, t, r, b), colour, lines in BUBBLES:
        c.drawPath(rrect(l, t, r, b, 15), fill(colour))
        c.drawPath(rrect(l, t, r, b, 15), pen(INK, 5))
        for x0, y, x1 in lines:
            c.drawLine(x0, y, x1, y, pen(INK, 6, 120))
    edited_pencil(c)
    typing = rrect(136, 296, 198, 326, 14)
    c.drawPath(typing, fill(DUSK))
    c.drawPath(typing, pen(INK, 5))
    for x in (153, 167, 181):
        c.drawCircle(x, 311, 4.5, fill(CREAM))
    c.drawPath(rrect(176, 352, 224, 358, 3), fill(INK, 160))
    solid(c, oval(290, 36, 22), MUSTARD, MUSTARD_DK, shadow=(5, 5), outline=6)
    c.drawLine(290, 25, 290, 38, pen(INK, 6))
    c.drawCircle(290, 47, 3.6, fill(INK))
    c.restore()
