"""Coral fingerprint: concentric ridges with random breaks."""
import random

import skia

from ..paint import pen
from ..palette import CORAL
from ..shapes import oval, rect


def draw(c):
    rng = random.Random(4)
    cx, cy = 200, 214
    c.save()
    c.clipPath(oval(cx, cy - 4, 126, 160), doAntiAlias=True)
    for i in range(11):
        rx = 12 + i * 12.5
        ry = rx * 1.3
        ccy = cy + i * 1.8
        n = rng.choice([1, 2, 2, 3])
        cuts = sorted(rng.uniform(0, 360) for _ in range(n))
        p = skia.Path()
        for k in range(n):
            gap = rng.uniform(16, 34)
            a0 = cuts[k] + gap / 2
            a1 = cuts[(k + 1) % n] - gap / 2 + (360 if k == n - 1 else 0)
            if a1 - a0 > 8:
                p.addArc(rect(cx - rx, ccy - ry, cx + rx, ccy + ry), a0, a1 - a0)
        c.drawPath(p, pen(CORAL, 8))
    c.restore()
