"""Frames, camera, typography and encoding.

A shot is a function of time that draws onto a Skia canvas. The camera moves
through a 2.5D set: every layer has a depth, so near layers slide and grow
faster than far ones (parallax), and layers away from the focus plane are
blurred (depth of field). Frames go through the film look (look.py) and are
piped straight into ffmpeg.
"""
from __future__ import annotations

import math
import os
import subprocess
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import skia

# Sets are designed at W x H; SCALE is what actually gets rendered.
W, H = 1080, 1920
FPS = 30
DRAFT, GAME, MASTER = 1 / 3, 2 / 3, 1.0
SCALE = float(os.environ.get("OMC_SCALE", GAME))
ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "fonts"
OUT = ROOT / "out" / "film"


# ---------------------------------------------------------------------------
# Time

def frame_size(scale: float = SCALE) -> tuple[int, int]:
    return round(W * scale), round(H * scale)


def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def span(t, start, end):
    """0 before `start`, 1 after `end`, linear in between."""
    return clamp((t - start) / (end - start)) if end > start else float(t >= start)


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_in_out(x):
    """A camera-operator ease: slow off the mark, slow into the mark."""
    x = clamp(x)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def ease_out(x, power=3):
    return 1 - (1 - clamp(x)) ** power


def lerp(a, b, x):
    return a + (b - a) * x


def noise1(t, seed=0.0):
    """Cheap smooth noise for handheld drift and flicker (sum of incommensurate sines)."""
    return (math.sin(t * 1.31 + seed) * 0.5 + math.sin(t * 2.17 + seed * 1.7) * 0.3 + math.sin(t * 3.73 + seed * 2.3) * 0.2)


# ---------------------------------------------------------------------------
# Paint

def rgb(hex_: str, a: float = 1.0) -> int:
    h = hex_.lstrip("#")
    return skia.Color(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), round(255 * clamp(a)))


def fill(hex_: str, a: float = 1.0, blend=None) -> skia.Paint:
    p = skia.Paint(Color=rgb(hex_, a), AntiAlias=True)
    if blend is not None:
        p.setBlendMode(blend)
    return p


def stroke(hex_: str, width: float, a: float = 1.0) -> skia.Paint:
    return skia.Paint(Color=rgb(hex_, a), AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=width,
                      StrokeCap=skia.Paint.kRound_Cap, StrokeJoin=skia.Paint.kRound_Join)


def linear(p0, p1, stops, blend=None) -> skia.Paint:
    """`stops` is [(position, hex, alpha), ...]."""
    shader = skia.GradientShader.MakeLinear([skia.Point(*p0), skia.Point(*p1)],
                                            [rgb(c, a) for _, c, a in stops], [s for s, _, _ in stops])
    p = skia.Paint(Shader=shader, AntiAlias=True)
    if blend is not None:
        p.setBlendMode(blend)
    return p


def radial(center, radius, stops, blend=None) -> skia.Paint:
    shader = skia.GradientShader.MakeRadial(skia.Point(*center), radius,
                                            [rgb(c, a) for _, c, a in stops], [s for s, _, _ in stops])
    p = skia.Paint(Shader=shader, AntiAlias=True)
    if blend is not None:
        p.setBlendMode(blend)
    return p


def rrect(x0, y0, x1, y1, r) -> skia.Path:
    p = skia.Path()
    p.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(x0, y0, x1, y1), r, r))
    return p


def poly(points, close=True) -> skia.Path:
    p = skia.Path()
    p.moveTo(*points[0])
    for pt in points[1:]:
        p.lineTo(*pt)
    if close:
        p.close()
    return p


_glows: dict[str, skia.Image] = {}


def glow(c, center, radius, hex_, alpha, blend=skia.BlendMode.kPlus, falloff=((0, 1.0), (0.45, 0.3), (1, 0.0))):
    """A soft round light. Drawn from a small pre-rendered sprite: big gradients are slow to draw directly."""
    key = f"{hex_}{falloff}"
    if key not in _glows:
        size = 256
        surf = skia.Surface(size, size)
        sc = surf.getCanvas()
        sc.clear(skia.ColorTRANSPARENT)
        shader = skia.GradientShader.MakeRadial(skia.Point(size / 2, size / 2), size / 2,
                                                [rgb(hex_, a) for _, a in falloff], [p for p, _ in falloff])
        sc.drawRect(skia.Rect.MakeWH(size, size), skia.Paint(Shader=shader))
        _glows[key] = surf.makeImageSnapshot()
    paint = skia.Paint(AntiAlias=True)
    paint.setAlphaf(clamp(alpha))
    paint.setBlendMode(blend)
    x, y = center
    c.drawImageRect(_glows[key], skia.Rect.MakeLTRB(x - radius, y - radius, x + radius, y + radius),
                    skia.SamplingOptions(skia.FilterMode.kLinear), paint)


_faces: dict[str, skia.Typeface] = {}


def face(name: str) -> skia.Typeface:
    files = {"display": "LilitaOne-Regular.ttf", "type": "SpecialElite-Regular.ttf", "body": "Nunito[wght].ttf", "neon": "Monoton-Regular.ttf", "serif": "PlayfairDisplay-Italic[wght].ttf"}
    if name not in _faces:
        _faces[name] = skia.Typeface.MakeFromFile(str(FONTS / files[name]))
    return _faces[name]


def font(name: str, size: float) -> skia.Font:
    f = skia.Font(face(name), size)
    f.setSubpixel(True)
    f.setEdging(skia.Font.Edging.kSubpixelAntiAlias)
    return f


def text(c, s, x, y, f: skia.Font, paint: skia.Paint, align="left", tracking=0.0):
    """Draws a line of text; `tracking` adds space between letters (in px)."""
    if tracking:
        total = sum(f.measureText(ch) for ch in s) + tracking * (len(s) - 1)
        cx = x - (total if align == "right" else total / 2 if align == "center" else 0)
        for ch in s:
            c.drawString(ch, cx, y, f, paint)
            cx += f.measureText(ch) + tracking
        return total
    w = f.measureText(s)
    dx = w if align == "right" else w / 2 if align == "center" else 0
    c.drawString(s, x - dx, y, f, paint)
    return w


# ---------------------------------------------------------------------------
# Camera and depth

@dataclass
class Camera:
    """Where the lens points (x, y in set coordinates), how far it has pushed in, and what's sharp."""
    x: float = W / 2
    y: float = H / 2
    zoom: float = 1.0
    roll: float = 0.0
    focus: float = 1.0
    aperture: float = 14.0  # blur (px) per unit of depth away from focus


def _camera(c: skia.Canvas, cam: Camera, depth: float):
    # Dolly: nearer layers move and grow faster than far ones.
    scale = cam.zoom ** depth
    c.translate(W / 2, H / 2)
    c.rotate(cam.roll * depth)
    c.scale(scale, scale)
    c.translate(-W / 2 - (cam.x - W / 2) * depth, -H / 2 - (cam.y - H / 2) * depth)


@contextmanager
def layer(c: skia.Canvas, cam: Camera, depth: float, extra_blur: float = 0.0, opacity: float = 1.0):
    """Draws everything inside at a depth: 1 is the focus plane of the set, <1 further away, >1 nearer.
    Draw on the canvas it yields (`with layer(...) as lc:`), which may be a smaller one.

    Blurred layers are drawn at half or a quarter of the size and scaled up:
    the blur hides the difference, and it's many times faster. Layers within a
    hair of the focus plane stay sharp.
    """
    blur = abs(depth - cam.focus) * cam.aperture + extra_blur
    if blur >= 2:
        q = 4 if blur > 10 else 2
        sw, sh = frame_size()
        small = skia.Surface(sw // q, sh // q)
        sc = small.getCanvas()
        sc.clear(skia.ColorTRANSPARENT)
        sc.scale(SCALE / q, SCALE / q)
        _camera(sc, cam, depth)
        try:
            yield sc
        finally:
            # Blur on the small surface (cheap), then stretch it over the frame.
            blurred = skia.Surface(sw // q, sh // q)
            bc = blurred.getCanvas()
            bc.clear(skia.ColorTRANSPARENT)
            sigma = blur * SCALE / q
            bc.drawImage(small.makeImageSnapshot(), 0, 0, skia.SamplingOptions(), skia.Paint(ImageFilter=skia.ImageFilters.Blur(sigma, sigma)))
            paint = skia.Paint()
            if opacity < 1:
                paint.setAlphaf(opacity)
            # Through the canvas's own transform, so a whole-frame effect like the TV switch-off moves this layer too.
            c.drawImageRect(blurred.makeImageSnapshot(), skia.Rect.MakeWH(W, H), skia.SamplingOptions(skia.FilterMode.kLinear), paint)
        return
    # Its own layer even when sharp, so lights drawn with additive blending add to this layer, not the whole frame.
    c.saveLayerAlpha(None, round(255 * opacity)) if opacity < 1 else c.saveLayer(None, None)
    c.save()
    _camera(c, cam, depth)
    try:
        yield c
    finally:
        c.restore()
        c.restore()


# ---------------------------------------------------------------------------
# Rendering and encoding

def render_frame(draw, t: float) -> np.ndarray:
    """Draws one frame and returns it as float32 RGB in 0..1."""
    surface = skia.Surface(*frame_size())
    c = surface.getCanvas()
    c.clear(skia.ColorBLACK)
    c.scale(SCALE, SCALE)
    draw(c, t)
    rgba = surface.makeImageSnapshot().toarray(colorType=skia.kRGBA_8888_ColorType)
    return rgba[..., :3].astype(np.float32) / 255.0


def render_video(name: str, frame_ref: str, duration: float, audio: np.ndarray, sr: int, scale: float = GAME, workers: int | None = None) -> Path:
    """Renders every frame in parallel and encodes the film.

    `frame_ref` is "module:function", where the function takes a frame number
    and returns that finished frame as uint8 RGB; worker processes import it
    themselves. `scale` picks the size: DRAFT to check timing and framing in a
    couple of minutes, GAME (720 x 1280) for the copy players see, MASTER
    (1080 x 1920) for trailers.
    """
    import time
    from concurrent.futures import ProcessPoolExecutor

    from scipy.io import wavfile

    # Workers read these when they start. One maths thread each keeps them from fighting over cores.
    os.environ["OMC_SCALE"] = str(scale)
    for var in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
        os.environ[var] = "1"
    OUT.mkdir(parents=True, exist_ok=True)
    wav = OUT / f"{name}.wav"
    wavfile.write(wav, sr, audio)
    suffix, crf, preset = {DRAFT: ("-draft", 27, "veryfast"), GAME: ("", 25, "slow"), MASTER: ("-master", 17, "slow")}[scale]
    out = OUT / f"{name}{suffix}.mp4"
    enc = Encoder(out, wav, frame_size(scale), crf, preset)
    frames = round(duration * FPS)
    started = time.time()
    batch = 48
    # Each worker holds several full-size float frames; eight at once is fast and stays well inside memory.
    with ProcessPoolExecutor(max_workers=workers or min(8, max(1, (os.cpu_count() or 2) - 1))) as pool:
        for first in range(0, frames, batch):
            ids = list(range(first, min(frames, first + batch)))
            for data in pool.map(_frame_worker, [(frame_ref, i) for i in ids]):
                enc.proc.stdin.write(data)
            print(f"  {ids[-1] + 1}/{frames} frames  ({time.time() - started:.0f}s)", flush=True)
    enc.close()
    print(f"done in {time.time() - started:.0f}s -> {out.name}")
    return out


def _frame_worker(job):
    import importlib

    ref, i = job
    module, fn = ref.split(":")
    frame = getattr(importlib.import_module(module), fn)(i)
    return np.ascontiguousarray(frame, dtype=np.uint8).tobytes()


class Encoder:
    """Pipes frames into ffmpeg; muxes the soundtrack in at the end."""

    def __init__(self, path: Path, audio: Path | None, size: tuple[int, int] | None = None, crf: int = 17, preset: str = "slow"):
        path.parent.mkdir(parents=True, exist_ok=True)
        w, h = size or frame_size()
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
               "-r", str(FPS), "-i", "-"]
        if audio:
            cmd += ["-i", str(audio), "-c:a", "aac", "-b:a", "160k", "-shortest"]
        cmd += ["-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", str(path)]
        self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    def write(self, frame: np.ndarray):
        self.proc.stdin.write((np.clip(frame, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())

    def close(self):
        self.proc.stdin.close()
        if self.proc.wait() != 0:
            raise RuntimeError("ffmpeg failed")
