"""Tiled floor textures and the storybook outline from the dollhouse film, used by the building painters.

Copied from omc_cinema/dollhouse_film.py in the one-more-clue-videos repo. That file wasn't committed there:
this comes from the working copy last saved on 2026-11-17 (sha256 d8d42de381dc...). Kept: the texture tiler
(`tex`, `_tiles`), the outline (`line`, `shape`, `shade`) and the cut-edge colour. Left out: the film itself
(its house, rooms, furniture, camera and sound) and its own wallpapers. halden.py and world.py add the
textures the building uses to MAKERS.
"""
from __future__ import annotations

import numpy as np
import skia

from .film import fill, stroke
from .textures import _fbm

OUTL = "#3B2B25"     # storybook outline: dark brown, not black
EDGE = "#F2E6D2"     # the doll's house's cut edges


# ---------------------------------------------------------------------------
# Textures, drawn once per render worker (512 px, tiled in cm by `tex`)

N = 512
_tex: dict[str, skia.Image] = {}


def _rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)


def _noise(seed, amp):
    return (1 + _fbm(seed, 60, 3) * amp)[..., None]


def _tiles(a, b, grout, n, seed):
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    s = N / n
    checker = ((np.floor(x / s) + np.floor(y / s)) % 2)[..., None]
    img = _rgb(a) * (1 - checker) + _rgb(b) * checker
    g = ((x % s) < 3) | ((y % s) < 3)
    img[g] = _rgb(grout)
    return img * _noise(seed, 0.02)


MAKERS = {}   # the film's own wallpapers are left out; halden.py and world.py add the building's


def tex(name, tile_cm, dx=0.0, dy=0.0):
    if name not in _tex:
        rgb = np.clip(MAKERS[name](), 0, 255).astype(np.uint8)
        rgba = np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)])
        _tex[name] = skia.Image.fromarray(np.ascontiguousarray(rgba), colorType=skia.kRGBA_8888_ColorType).withDefaultMipmaps()
    m = skia.Matrix()
    m.setScale(tile_cm / N, tile_cm / N)
    m.postTranslate(dx, dy)
    sampling = skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)
    return skia.Paint(Shader=_tex[name].makeShader(skia.TileMode.kRepeat, skia.TileMode.kRepeat, sampling, m), AntiAlias=True)


def shade(hex_, k):
    v = _rgb(hex_) * k
    return "#%02X%02X%02X" % tuple(int(min(255, c)) for c in v)


def line(w, hex_=OUTL, a=1.0):
    p = stroke(hex_, w, a)
    p.setStrokeCap(skia.Paint.kRound_Cap)
    p.setStrokeJoin(skia.Paint.kRound_Join)
    return p


def shape(c, path, col, lw=0.5, a=1.0):
    c.drawPath(path, fill(col, a))
    if lw:
        c.drawPath(path, line(lw))
