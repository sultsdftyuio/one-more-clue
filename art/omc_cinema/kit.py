"""Pieces every case's film shares: the house cast, captions, and the pre-render check."""
from __future__ import annotations

import math

import skia
from omc_art.palette import CREAM, MUSTARD
from omc_art.suspects import SUSPECTS

from .film import FPS, H, OUT, W, fill, font, glow, linear, smooth, span, text


def hue_rotate(deg: float) -> skia.ColorFilter:
    """The same recolouring as the game's CSS hue-rotate(), so the cast matches the case's colours."""
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    m = [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0, 0,
         0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283, 0, 0,
         0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072, 0, 0,
         0, 0, 0, 1, 0]
    return skia.ColorFilters.Matrix(m)


SILHOUETTE = skia.ColorFilters.Matrix([0, 0, 0, 0, 0.03, 0, 0, 0, 0, 0.035, 0, 0, 0, 0, 0.07, 0, 0, 0, 1, 0])


def suspect(c, art, tint, feet, scale, mood="idle", lit=1.0):
    """Draws a house suspect standing at `feet` (x, y). `lit` 0 is a silhouette, 1 full colour."""
    fx, fy = feet
    for which, alpha in ((SILHOUETTE, 1.0), (hue_rotate(tint), lit)):
        if which is not SILHOUETTE and lit <= 0:
            continue
        paint = skia.Paint(ColorFilter=which)
        paint.setAlphaf(alpha)
        c.saveLayer(None, paint)
        c.translate(fx - 200 * scale, fy - 520 * scale)
        c.scale(scale, scale)
        SUSPECTS[art](c, mood)
        c.restore()


def caption(c, t, words, start, end, speaker=None, until=None, y=None):
    """Burned-in subtitles, word by word, for rooms where the volume is down. Characters get a name tag.
    `until` clears it early, so it never sits on top of the next line. `y` moves it off something
    important; left out, it sits in the usual place near the bottom."""
    gone = min(end + 0.6, until if until is not None else 1e9)
    if t < start - 0.05 or t > gone:
        return
    f = font("body", 54)
    f.setEmbolden(True)
    parts = words.split(" ")
    shown = parts[: max(1, math.ceil(len(parts) * span(t, start, end)))]
    a = smooth(span(t, start - 0.05, start + 0.15)) * (1 - smooth(span(t, gone - 0.25, gone)))
    # A soft dark band behind the words, so they read over bright shots too.
    if y is None:
        c.drawRect(skia.Rect.MakeLTRB(0, H - 520, W, H), linear((0, H - 520), (0, H - 120), [(0, "#000000", 0), (1, "#000000", 0.5 * a)]))
    else:
        c.drawRect(skia.Rect.MakeLTRB(0, y - 190, W, y + 130), linear((0, y - 190), (0, y + 130), [(0, "#000000", 0), (0.5, "#000000", 0.5 * a), (1, "#000000", 0)]))
    # Long lines wrap onto two, split where the full line would balance, so words don't jump as they appear.
    rows = [parts]
    if f.measureText(words) > W - 140:
        cut = min(range(1, len(parts)), key=lambda k: abs(f.measureText(" ".join(parts[:k])) - f.measureText(" ".join(parts[k:]))))
        rows = [parts[:cut], parts[cut:]]
    shadow = fill("#000000", 0.55 * a)
    shadow.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 8))
    top = (H - 260 if y is None else y) - 66 * (len(rows) - 1)
    shown_count = len(shown)
    for i, row in enumerate(rows):
        visible = row[: max(0, shown_count - sum(len(r) for r in rows[:i]))]
        if not visible:
            continue
        y = top + 66 * i
        text(c, " ".join(visible), W / 2, y + 3, f, shadow, align="center")
        text(c, " ".join(visible), W / 2, y, f, fill(CREAM, a), align="center")
    if speaker:
        text(c, speaker, W / 2, top - 80, font("type", 34), fill(MUSTARD, a), align="center", tracking=4)


def darkness(c, hole, radius, amount=0.94):
    """Everything black except a soft round hole: what a torch shows in a dark room."""
    c.saveLayer(None, None)
    c.drawRect(skia.Rect.MakeWH(W, H), fill("#020308", amount))
    glow(c, hole, radius, "#FFFFFF", 1.0, blend=skia.BlendMode.kDstOut, falloff=((0, 1.0), (0.55, 0.85), (1, 0.0)))
    c.restore()


def risky_moments(lines, cuts, extra=()):
    """Where films go wrong: the last moment of each line (long captions) and both sides of each cut."""
    times = set(extra)
    for at, length in lines:
        times.add(round(at + length - 0.15, 2))
    for cut in cuts:
        times.update((round(cut - 0.1, 2), round(cut + 0.1, 2)))
    return sorted(times)


def contact_sheet(frame, times, name, cols=8):
    """Renders the given moments in parallel into one image, before committing to a full render."""
    from concurrent.futures import ProcessPoolExecutor

    from PIL import Image

    with ProcessPoolExecutor(6) as pool:
        frames = list(pool.map(frame, [round(t * FPS) for t in times]))
    tw, th = 240, 427
    sheet = Image.new("RGB", (cols * (tw + 8), ((len(frames) + cols - 1) // cols) * (th + 8)), "black")
    for i, shot in enumerate(frames):
        sheet.paste(Image.fromarray(shot).resize((tw, th), Image.LANCZOS), ((i % cols) * (tw + 8), (i // cols) * (th + 8)))
    OUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT / name)
    return OUT / name
