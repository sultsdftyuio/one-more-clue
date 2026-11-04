"""Renders the landing page's sounds with the films' sound kit.

The rain, the 9:17 power cut, the lights coming back and the stamp used to be
synthesised live in the browser from bare oscillators, and sounded like it.
These come from the same instruments as the case films
(../one-more-clue-videos/omc_cinema/sound.py), mastered here and written to
public/landing/sound/ as small MP3s.

    python scripts/landing-sounds.py

The rain is a seamless loop with half a second of the loop's own sound on each
side, so MP3 encoder padding never lands inside it: the page loops from
RAIN_PAD to RAIN_PAD + RAIN_LOOP (see src/components/home/sound.ts).
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / "one-more-clue-videos"))
from omc_cinema import sound as s  # noqa: E402

OUT = ROOT / "public" / "landing" / "sound"
RAIN_LOOP = 12.0
RAIN_PAD = 0.5


def stereo(x):
    x = np.asarray(x, dtype=np.float64)
    return np.stack([x, x], axis=1) if x.ndim == 1 else x


def level(x, peak_db=None, rms_db=None):
    """Sets a sound's level by its peak or RMS, then soft-limits it under -1 dBFS."""
    x = stereo(x)
    if rms_db is not None:
        x = x * (10 ** (rms_db / 20) / (np.sqrt(np.mean(x ** 2)) + 1e-9))
    if peak_db is not None:
        x = x * (10 ** (peak_db / 20) / (np.max(np.abs(x)) + 1e-9))
    ceil = 10 ** (-1 / 20)
    return np.tanh(x / ceil) * ceil


def in_room(x, room=1.4, send=0.35, seed=3):
    """Puts a one-shot in the same small, damp room as the films, with its tail."""
    x = stereo(x)
    tail = room + 0.2
    mix = s.Mix(len(x) / s.SR + tail, seed=seed)
    mix.add(x, 0, reverb=send)
    ir = mix._room(room)
    from scipy.signal import fftconvolve

    wet = np.stack([fftconvolve(mix.wet[:, k], ir[:, k])[: mix.n] for k in range(2)], axis=1)
    out = mix.dry + s.highpass(wet, 180)
    fade = np.ones(len(out))
    n = s.seconds(0.25)
    fade[-n:] = np.linspace(1, 0, n)
    return out * fade[:, None]


def rain_loop(rng):
    """Rain on glass that loops without a seam: the tail is crossfaded into the head."""
    cross = 2.0
    r = s.rain(RAIN_LOOP + cross, rng, intensity=0.8)
    # Rain on a window, heard from inside: the hiss rolled off, a little more body.
    r = s.lowpass(r, 5200) + s.lowpass(s.rain(RAIN_LOOP + cross, rng, 0.5), 700) * 0.6
    n, c = s.seconds(RAIN_LOOP), s.seconds(cross)
    loop = r[:n].copy()
    w = np.linspace(0, np.pi / 2, c)[:, None]
    # Equal-power crossfade suits two uncorrelated washes of noise.
    loop[:c] = r[n:n + c] * np.cos(w) + r[:c] * np.sin(w)
    loop = level(loop, rms_db=-24)
    p = s.seconds(RAIN_PAD)
    return np.concatenate([loop[-p:], loop, loop[:p]])


def power_down(rng):
    """The whole block cutting out: the street's hum dropping away under a heavy relay clunk."""
    n = s.seconds(0.35)
    t = np.arange(n) / s.SR
    hum_before = stereo(s.room_hum(0.35, rng) * np.clip(t / 0.3, 0, 1) * 0.08)
    cut = stereo(s.power_down(rng))
    clunk = stereo(s.breaker(rng)) * 0.5
    cut[: len(clunk)] += clunk
    return level(in_room(np.concatenate([hum_before, cut]), send=0.4), peak_db=-4)


def power_up(rng):
    """The lights back on: the breaker thrown, then the street's neon stuttering and settling."""
    thump = stereo(s.breaker(rng))
    buzz = stereo(s.lowpass(s.neon_buzz(), 2400)) * 0.9
    out = np.zeros((s.seconds(1.9), 2))
    out[: len(thump)] += thump
    i = s.seconds(0.12)
    out[i:i + len(buzz)] += buzz[: len(out) - i]
    return level(in_room(out, send=0.3), peak_db=-1.5)


def stamp(rng):
    """A rubber stamp brought down on a case file on a desk: a dull thud and a paper slap."""
    n = s.seconds(0.32)
    t = np.arange(n) / s.SR
    thud = np.sin(2 * np.pi * (78 + 40 * np.exp(-t * 60)) * t) * np.exp(-t * 26) * 1.2
    desk = np.sin(2 * np.pi * 210 * t) * np.exp(-t * 48) * 0.35
    slap = s.bandpass(rng.standard_normal(n), 350, 4200) * np.exp(-t * 70) * 0.8
    return level(in_room(thud + desk + slap, room=0.6, send=0.18), peak_db=-3)


def write(name, x, bitrate="128k"):
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / f"{name}.wav"
        wavfile.write(wav, s.SR, x.astype(np.float32))
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-ac", "2", "-ar", "48000",
             "-c:a", "libmp3lame", "-b:a", bitrate, str(OUT / f"{name}.mp3")],
            check=True,
        )
    print(f"{name}.mp3  {len(x) / s.SR:.2f}s  {(OUT / f'{name}.mp3').stat().st_size // 1024} KB")


if __name__ == "__main__":
    rng = np.random.default_rng(917)
    write("rain", rain_loop(rng), bitrate="96k")
    write("power-down", power_down(rng))
    write("power-up", power_up(rng))
    write("stamp", stamp(rng))
