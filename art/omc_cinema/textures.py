"""Surfaces for film sets: wood, linen, paper, stone, steel and tile, made with numpy.

Flat colour reads as a diagram; a little grain reads as a place. Each texture is
generated once per render worker, then used as a Skia shader. Colour textures
(wood, marble, steel, tile) are drawn directly with `surface()`. Neutral ones
(linen, paper) are laid over a colour with `weave()`.
"""
from __future__ import annotations

import numpy as np
import skia
from scipy.ndimage import gaussian_filter

SIZE = 512
_cache: dict[str, skia.Image] = {}


def _fbm(seed: int, base: float = 48, octaves: int = 4) -> np.ndarray:
    """Soft, cloud-like noise that tiles, scaled to roughly -2 to 2."""
    rng = np.random.default_rng(seed)
    out = np.zeros((SIZE, SIZE), dtype=np.float32)
    amp = 1.0
    for o in range(octaves):
        n = gaussian_filter(rng.standard_normal((SIZE, SIZE)).astype(np.float32), base / 2**o, mode="wrap")
        out += n / (n.std() + 1e-6) * amp
        amp *= 0.5
    return out / (out.std() + 1e-6)


def _mix(a, b, k):
    return np.stack([a[i] + (b[i] - a[i]) * k for i in range(3)], axis=-1)


def _rgb(hex_: str):
    h = hex_.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def _wood(dark="#20110A", light="#5A3620", seed=3):
    y, x = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)
    warp = _fbm(seed, 60, 3)
    planks = 4
    width = SIZE / planks
    out = np.zeros((SIZE, SIZE), dtype=np.float32)
    rng = np.random.default_rng(seed + 1)
    for p in range(planks):
        mask = (x >= p * width) & (x < (p + 1) * width)
        rings = np.sin((x * 0.045 + warp * 1.3 + y * 0.004) * (1.2 + rng.uniform(-0.2, 0.2)) + rng.uniform(0, 6))
        out[mask] = (0.5 + 0.13 * rings[mask] + rng.uniform(-0.08, 0.08))
    fine = gaussian_filter(np.random.default_rng(seed + 2).standard_normal((SIZE, SIZE)).astype(np.float32), (9, 0.7), mode="wrap")
    out = np.clip(out + fine / (fine.std() + 1e-6) * 0.045, 0, 1)
    img = _mix(_rgb(dark), _rgb(light), out)
    for p in range(planks):  # the gaps between boards
        i = int(p * width)
        img[:, i:i + 2] *= 0.35
    return img


def _weave():
    rng = np.random.default_rng(5)
    warp = gaussian_filter(rng.standard_normal((SIZE, SIZE)).astype(np.float32), (9, 0.7), mode="wrap")
    weft = gaussian_filter(rng.standard_normal((SIZE, SIZE)).astype(np.float32), (0.7, 9), mode="wrap")
    v = warp / (warp.std() + 1e-6) + weft / (weft.std() + 1e-6)
    v = 0.9 + np.clip(v, -2.5, 2.5) * 0.035 + _fbm(6, 40, 2) * 0.02
    return np.repeat(np.clip(v, 0, 1)[..., None], 3, axis=2) * 255


def _paper():
    rng = np.random.default_rng(7)
    fibres = gaussian_filter(rng.standard_normal((SIZE, SIZE)).astype(np.float32), (0.8, 2.4), mode="wrap")
    v = 0.93 + np.clip(fibres / (fibres.std() + 1e-6), -2.5, 2.5) * 0.015 + _fbm(8, 70, 3) * 0.025
    return np.repeat(np.clip(v, 0, 1)[..., None], 3, axis=2) * 255


def _marble(base="#2E2A2C", vein="#8F8780", seed=11):
    y, x = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)
    n = _fbm(seed, 56, 4)
    veins = 1 - np.abs(np.sin((x + y) * 0.012 + n * 2.6))
    return _mix(_rgb(base), _rgb(vein), np.clip(veins, 0, 1) ** 9 * 0.8 + (n * 0.5 + 0.5).clip(0, 1) * 0.1)


def _steel(dark="#4E4F58", light="#A7A9B4", seed=13):
    rng = np.random.default_rng(seed)
    n = gaussian_filter(rng.standard_normal((SIZE, SIZE)).astype(np.float32), (0.6, 70), mode="wrap")
    n = (n / (n.std() + 1e-6)) * 0.22 + 0.45 + _fbm(seed + 1, 90, 2) * 0.1
    return _mix(_rgb(dark), _rgb(light), np.clip(n, 0, 1))


def _tile(base="#D9D2C2", grout="#6A6258", seed=17):
    img = np.full((SIZE, SIZE, 3), _rgb(base), dtype=np.float32)
    img *= (0.92 + _fbm(seed, 34, 3) * 0.05)[..., None]
    rng = np.random.default_rng(seed)
    for r in range(4):
        for k in range(4):
            x0, y0 = k * SIZE // 4, r * SIZE // 4
            img[y0:y0 + SIZE // 4, x0:x0 + SIZE // 4] *= rng.uniform(0.9, 1.04)
    for i in range(4):
        p = i * SIZE // 4
        img[:, p:p + 4] = _rgb(grout)
        img[p:p + 4, :] = _rgb(grout)
    return img


MAKERS = {"wood": _wood, "linen": _weave, "paper": _paper, "marble": _marble, "steel": _steel, "tile": _tile}


def _image(name: str) -> skia.Image:
    if name not in _cache:
        rgb = np.clip(MAKERS[name](), 0, 255).astype(np.uint8)
        rgba = np.dstack([rgb, np.full((SIZE, SIZE), 255, dtype=np.uint8)])
        _cache[name] = skia.Image.fromarray(rgba, colorType=skia.kRGBA_8888_ColorType)
    return _cache[name]


def surface(name: str, scale: float = 1.0, angle: float = 0.0, alpha: float = 1.0, blend=None) -> skia.Paint:
    """A paint that fills any shape with a repeating texture."""
    m = skia.Matrix()
    m.setScale(scale, scale)
    if angle:
        m.postRotate(angle)
    shader = _image(name).makeShader(skia.TileMode.kRepeat, skia.TileMode.kRepeat, skia.SamplingOptions(skia.FilterMode.kLinear), m)
    paint = skia.Paint(Shader=shader, AntiAlias=True)
    paint.setAlphaf(alpha)
    if blend is not None:
        paint.setBlendMode(blend)
    return paint


def weave(c: skia.Canvas, path: skia.Path, name: str = "linen", scale: float = 1.0, angle: float = 0.0):
    """Lays a neutral texture (linen, paper) over whatever colour is already in `path`."""
    c.drawPath(path, surface(name, scale, angle, blend=skia.BlendMode.kMultiply))
