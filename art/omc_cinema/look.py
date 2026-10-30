"""The film look, applied to every frame in numpy.

In order: bloom (lights glow into the air), halation (a red-orange fringe
around bright edges, like light bouncing off the back of real film), a
colour grade (teal shadows, warm highlights, a soft film curve), lens
softness and colour fringing towards the edges, a vignette, and grain that
changes every frame.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter


@dataclass
class Look:
    bloom: float = 0.55
    bloom_threshold: float = 0.62
    halation: float = 0.35
    shadow_tint: tuple = (0.02, 0.07, 0.11)
    highlight_tint: tuple = (1.04, 0.98, 0.9)
    contrast: float = 1.12
    saturation: float = 0.92
    fringe: float = 2.2
    vignette: float = 0.55
    grain: float = 0.045
    flicker: float = 0.012


def _small_blur(img: np.ndarray, factor: int, sigma: float) -> np.ndarray:
    """Blurs at a fraction of the size (fast), then scales back up, in full float precision."""
    h, w = img.shape[:2]
    small = img[: h - h % factor, : w - w % factor].reshape(h // factor, factor, w // factor, factor, 3).mean(axis=(1, 3))
    small = gaussian_filter(small, sigma=(sigma, sigma, 0))
    up = [np.asarray(Image.fromarray(np.ascontiguousarray(small[..., i], dtype=np.float32), mode="F").resize((w, h), Image.BILINEAR))
          for i in range(3)]
    return np.stack(up, axis=2)


_grain_cache: dict = {}


def _grain(shape, frame: int) -> np.ndarray:
    rng = np.random.default_rng(frame * 7919 + 13)
    h, w = shape[:2]
    g = rng.standard_normal((h // 2, w // 2)).astype(np.float32)
    g = gaussian_filter(g, 0.6)
    g = np.asarray(Image.fromarray(((g * 40) + 128).clip(0, 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), dtype=np.float32)
    return (g - 128) / 40


def _vignette(shape, strength):
    key = ("v", shape, strength)
    if key not in _grain_cache:
        h, w = shape[:2]
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        nx, ny = (x - w / 2) / (w / 2), (y - h / 2) / (h / 2)
        r = np.sqrt(nx * nx * 1.0 + ny * ny * 0.75)
        _grain_cache[key] = (1 - strength * np.clip(r - 0.35, 0, None) ** 1.6)[..., None]
    return _grain_cache[key]


def _edge_mask(shape):
    key = ("e", shape)
    if key not in _grain_cache:
        h, w = shape[:2]
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        r = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2)
        _grain_cache[key] = np.clip(r - 0.25, 0, 1)[..., None]
    return _grain_cache[key]


def _fringe(img: np.ndarray, px: float) -> np.ndarray:
    """Lateral chromatic aberration: red pushed out, blue pulled in, growing to the edges."""
    if px <= 0:
        return img
    shift = int(round(px))
    out = img.copy()
    out[..., 0] = np.roll(img[..., 0], shift, axis=1)
    out[..., 2] = np.roll(img[..., 2], -shift, axis=1)
    m = _edge_mask(img.shape)
    return img * (1 - m) + out * m


def finish(img: np.ndarray, frame: int, look: Look = Look(), exposure: float = 1.0) -> np.ndarray:
    """Turns a clean render into a film frame. `img` is float RGB 0..1."""
    img = img * exposure * (1 + look.flicker * np.sin(frame * 2.9) * np.sin(frame * 0.7))
    k = img.shape[1] / 1080  # blurs and fringes are set for a 1080-wide frame

    lum = img @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    bright = img * np.clip((lum - look.bloom_threshold) / (1 - look.bloom_threshold), 0, 1)[..., None]
    if look.bloom:
        glow = _small_blur(bright, 4, 6 * k) * 0.6 + _small_blur(bright, 8, 10 * k) * 0.9
        img = img + glow * look.bloom * np.array([1.0, 0.96, 0.9], dtype=np.float32)
    if look.halation:
        halo = _small_blur(bright, 4, 3 * k)
        img = img + halo.mean(axis=2, keepdims=True) * look.halation * np.array([1.0, 0.32, 0.12], dtype=np.float32)

    # Grade: lift the shadows towards teal, warm the highlights, then a gentle S curve.
    lum = (img @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))[..., None]
    shadows = np.clip(1 - lum * 2.2, 0, 1)
    img = img + np.array(look.shadow_tint, dtype=np.float32) * shadows
    img = img * (1 + (np.array(look.highlight_tint, dtype=np.float32) - 1) * np.clip(lum * 1.4, 0, 1))
    img = lum + (img - lum) * look.saturation
    img = np.clip(img, 0, None)
    img = img / (1 + img * 0.18)  # soft shoulder: highlights roll off instead of clipping
    img = 0.5 + (img - 0.5) * look.contrast

    img = _fringe(img, look.fringe * k)
    img = img * _vignette(img.shape, look.vignette)
    if look.grain:
        g = _grain(img.shape, frame)[..., None]
        # Film grain shows most in the mid-tones.
        mid = 1 - np.abs(np.clip(img.mean(axis=2, keepdims=True), 0, 1) - 0.45) * 1.4
        img = img + g * look.grain * (0.6 + 0.4 * k) * np.clip(mid, 0.25, 1)
    return np.clip(img, 0, 1)
