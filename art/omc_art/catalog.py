"""Every asset the generator produces, with its canvas size, scale and web size."""
from dataclasses import dataclass
from functools import partial
from typing import Callable, Optional

from .brand import app_icon, confetti, logo_mark
from .post import suspect_post
from .posters import POSTERS, TRIPTYCH
from .posters.common import poster_post
from .props import PROPS
from .scenery.city import city_back, city_back_dark, city_front, city_front_dark
from .scenery.sky import cloud, moon, sky
from .suspects import MOODS, SUSPECTS


@dataclass(frozen=True)
class Asset:
    name: str
    size: tuple[int, int]  # design units
    scale: float  # master pixels per design unit
    draw: Callable
    web_width: int  # max width of the WebP copy
    post: Optional[Callable] = None


SMALL_PROPS = {"pushpin", "sparkle"}

ASSETS = [
    Asset(f"suspect-{name}-{mood}", (400, 560), 2.5, partial(draw, mood=mood), 640, suspect_post)
    for name, draw in SUSPECTS.items()
    for mood in MOODS
]
ASSETS += [
    Asset("sky", (1600, 900), 1.5, sky, 2400),
    Asset("city-back", (1600, 560), 1.5, city_back, 2400),
    Asset("city-front", (1600, 460), 1.5, city_front, 2400),
    Asset("city-back-dark", (1600, 560), 1.5, city_back_dark, 2400),
    Asset("city-front-dark", (1600, 460), 1.5, city_front_dark, 2400),
    Asset("moon", (400, 400), 2.0, moon, 640),
    Asset("cloud-a", (600, 240), 2.0, partial(cloud, variant="a"), 900),
    Asset("cloud-b", (380, 200), 2.0, partial(cloud, variant="b"), 600),
]
ASSETS += [
    Asset(f"prop-{name}", (400, 400), 2.5, draw, 400 if name in SMALL_PROPS else 560)
    for name, draw in PROPS.items()
]
ASSETS += [
    Asset("logo-mark", (400, 400), 2.56, logo_mark, 512),
    Asset("app-icon", (400, 400), 2.56, app_icon, 512),
    Asset("pattern-confetti", (600, 600), 2.0, confetti, 1200),
]
ASSETS += [
    Asset(f"poster-{case}", (600, 900), 2.0, draw, 800, poster_post)
    for case, draw in POSTERS.items()
]
ASSETS.append(Asset("poster-season-1", (1800, 700), 1.5, TRIPTYCH, 2000, poster_post))
