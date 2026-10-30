"""The soundtrack, synthesised in numpy: no samples to license.

A Mix is a stereo timeline at 48 kHz. Sounds are placed at a time with a
gain and a pan; some go through a shared reverb so they sit in the same
room. `master()` glues everything with gentle compression and a limiter and
brings it to a consistent loudness for phone speakers.
"""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000


def _sos(kind, freq, order=2):
    return butter(order, freq, btype=kind, fs=SR, output="sos")


def lowpass(x, f, order=2):
    return sosfilt(_sos("lowpass", f, order), x, axis=0)


def highpass(x, f, order=2):
    return sosfilt(_sos("highpass", f, order), x, axis=0)


def bandpass(x, lo, hi, order=2):
    return sosfilt(_sos("bandpass", (lo, hi), order), x, axis=0)


def env(n, attack, release, curve=4.0):
    """Attack-release envelope over n samples (times in seconds)."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    r = np.exp(-np.clip(t - attack, 0, None) * curve / max(release, 1e-4))
    return a * r


def seconds(s):
    return int(round(s * SR))


class Mix:
    def __init__(self, duration: float, seed: int = 1):
        self.n = seconds(duration)
        self.dry = np.zeros((self.n, 2), dtype=np.float64)
        self.wet = np.zeros((self.n, 2), dtype=np.float64)
        self.rng = np.random.default_rng(seed)

    def add(self, sound, at: float, gain=1.0, pan=0.0, reverb=0.0):
        """Places a mono or stereo sound; `pan` -1 left to 1 right; `reverb` is the send level."""
        s = np.asarray(sound, dtype=np.float64)
        if s.ndim == 1:
            left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            s = np.stack([s * left * 1.414, s * right * 1.414], axis=1)
        i = seconds(at)
        if i >= self.n:
            return
        j = min(self.n, i + len(s))
        part = s[: j - i] * gain
        self.dry[i:j] += part
        if reverb:
            self.wet[i:j] += part * reverb

    def master(self, room=2.2, target_rms_db=-17.0, ceiling_db=-1.0):
        ir = self._room(room)
        wet = np.stack([fftconvolve(self.wet[:, k], ir[:, k])[: self.n] for k in range(2)], axis=1)
        out = self.dry + highpass(wet, 180)
        out = highpass(out, 25)
        # Glue: a slow, gentle compressor on the whole mix.
        level = np.sqrt(lowpass(np.mean(out ** 2, axis=1), 6) .clip(1e-9, None))
        thresh = 10 ** (-24 / 20)
        gain = np.where(level > thresh, (thresh / level) ** (1 - 1 / 2.5), 1.0)
        out = out * gain[:, None]
        rms = np.sqrt(np.mean(out ** 2)) + 1e-9
        out = out * (10 ** (target_rms_db / 20) / rms)
        ceil = 10 ** (ceiling_db / 20)
        out = np.tanh(out / ceil) * ceil  # soft limiter
        return out.astype(np.float32)

    def _room(self, length):
        n = seconds(length)
        t = np.arange(n) / SR
        decay = np.exp(-t * 6.9 / length)
        ir = self.rng.standard_normal((n, 2)) * decay[:, None]
        ir = lowpass(ir, 5200)
        ir[: seconds(0.012)] = 0  # pre-delay
        return ir / np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True)) * 0.6


# ---------------------------------------------------------------------------
# Instruments

def rain(duration, rng, intensity=1.0):
    """Steady rain on glass: washes of filtered noise plus individual drops."""
    n = seconds(duration)
    wash = rng.standard_normal((n, 2))
    wash = bandpass(wash, 500, 7000) * 0.18 + lowpass(rng.standard_normal((n, 2)), 400) * 0.25
    drops = np.zeros((n, 2))
    for _ in range(int(duration * 70 * intensity)):
        i = rng.integers(0, max(1, n - 2000))
        size = rng.uniform(0.2, 1.0)
        d = rng.standard_normal(600) * env(600, 0.0005, 0.006) * size
        drops[i:i + 600, rng.integers(0, 2)] += bandpass(d, 1500, 6000)
    return (wash + drops * 0.8) * intensity


def drone(duration, root=55.0, rng=None, bright=380):
    """A dark bed: detuned saws an octave apart, slowly breathing."""
    n = seconds(duration)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for mult, det, amp in ((1, 0.0, 1.0), (1, 0.31, 0.8), (2, -0.22, 0.45), (1.5, 0.17, 0.25)):
        f = root * mult + det
        phase = (t * f) % 1.0
        out += (2 * phase - 1) * amp
    out = lowpass(out, bright, 3)
    breathe = 0.75 + 0.25 * np.sin(t * 2 * np.pi * 0.11)
    fade = np.clip(t / 0.8, 0, 1)
    return out * breathe * fade * 0.25


def key_click(rng, backspace=False):
    """One laptop key: a plasticky tick and a soft thock."""
    n = seconds(0.06)
    tick = bandpass(rng.standard_normal(n), 2500 if not backspace else 1800, 7000) * env(n, 0.0003, 0.012)
    t = np.arange(n) / SR
    thock = np.sin(2 * np.pi * (170 if not backspace else 130) * t) * env(n, 0.0005, 0.02)
    return tick * 0.7 + thock * 0.35


def clock_tick(rng, tock=False):
    n = seconds(0.08)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (2400 if not tock else 1900) * t) * env(n, 0.0002, 0.01)
    click = bandpass(rng.standard_normal(n), 3000, 9000) * env(n, 0.0001, 0.004)
    return body * 0.5 + click * 0.6


def riser(duration, rng):
    """A swelling noise sweep into a hit."""
    n = seconds(duration)
    t = np.arange(n) / SR
    x = rng.standard_normal((n, 2))
    # Sweep the filter by crossfading a dark and a bright version.
    dark, bright = lowpass(x, 600), bandpass(x, 2000, 9000)
    k = (t / duration) ** 2
    return (dark * (1 - k[:, None]) + bright * k[:, None]) * (k ** 1.5)[:, None] * 0.5


def impact(rng, root=41.2):
    """A trailer hit: sub drop, a distorted low brass stab and a burst of air."""
    n = seconds(2.6)
    t = np.arange(n) / SR
    sub_f = root * 1.6 * np.exp(-t * 3) + root * 0.75
    sub = np.sin(2 * np.pi * np.cumsum(sub_f) / SR) * env(n, 0.002, 1.6, 3)
    stab = np.zeros(n)
    for mult, det in ((1, 0), (1, 0.6), (2, -0.4), (3, 0.3), (4.01, 0)):
        stab += 2 * ((t * (root * 2 * mult + det)) % 1.0) - 1
    stab = lowpass(np.tanh(stab * 1.6), 900, 2) * env(n, 0.004, 0.9, 3.5)
    air = bandpass(rng.standard_normal(n), 300, 6000) * env(n, 0.001, 0.25, 5)
    return sub * 0.9 + stab * 0.35 + air * 0.25


def stinger_tone(duration, freq=880.0):
    """A high glassy tone that hangs under suspense."""
    n = seconds(duration)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * freq * t) * 0.6 + np.sin(2 * np.pi * freq * 1.5 * t + 0.4) * 0.25
    trem = 0.7 + 0.3 * np.sin(2 * np.pi * 5.3 * t)
    return tone * trem * env(n, duration * 0.4, duration, 2)


def voice_chain(voice: np.ndarray, sr_in: int) -> np.ndarray:
    """Narrator polish: resample to 48 kHz, clear the mud, warm the chest, even out the level."""
    if sr_in != SR:
        idx = np.arange(0, len(voice), sr_in / SR)
        voice = np.interp(idx, np.arange(len(voice)), voice)
    v = highpass(voice, 85, 2)
    chest = lowpass(v, 220)
    v = v + chest * 0.5
    level = np.sqrt(lowpass(v ** 2, 15).clip(1e-9, None))
    thresh = 10 ** (-26 / 20)
    v = v * np.where(level > thresh, (thresh / level) ** (1 - 1 / 3.0), 1.0)
    return v / (np.max(np.abs(v)) + 1e-9) * 0.9


# ---------------------------------------------------------------------------
# Foley and score for the films

def piano(freq, duration=2.5, velocity=1.0):
    """A soft noir piano note: a few detuned partials with a felt-hammer attack and a long decay."""
    n = seconds(duration)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k, amp in ((1, 1.0), (2, 0.42), (3, 0.18), (4, 0.09), (5, 0.04)):
        f = freq * k * (1 + 0.0006 * k * k)
        out += np.sin(2 * np.pi * f * t + k) * amp * np.exp(-t * (1.1 + k * 0.7))
    hammer = lowpass(np.random.default_rng(int(freq)).standard_normal(n), 2500) * env(n, 0.001, 0.03)
    return (out * env(n, 0.004, duration, 2.2) + hammer * 0.05) * 0.4 * velocity


def note(name):
    """'A3' -> Hz."""
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "Eb": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "Bb": 1, "B": 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + (octave - 4) * 12) / 12)


def tv_off(rng):
    """An old screen collapsing: a falling whine and a crackle of static."""
    n = seconds(0.45)
    t = np.arange(n) / SR
    whine = np.sin(2 * np.pi * np.cumsum(9000 * np.exp(-t * 9) + 200) / SR) * env(n, 0.002, 0.35, 3)
    crackle = bandpass(rng.standard_normal(n), 1500, 8000) * env(n, 0.001, 0.2, 4)
    return whine * 0.25 + crackle * 0.35


def torch_click(rng):
    n = seconds(0.12)
    click = bandpass(rng.standard_normal(n), 1800, 6000) * env(n, 0.0005, 0.015)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 320 * t) * env(n, 0.001, 0.03)
    return click * 0.8 + body * 0.3


def squelch(rng, length=0.18):
    n = seconds(length)
    return bandpass(rng.standard_normal(n), 900, 4000) * env(n, 0.002, length, 1.5) * 0.5


def radio(voice, rng):
    """A voice over a walkie-talkie: narrow band, a little overdriven, riding on hiss."""
    v = bandpass(voice, 380, 3000, 3)
    v = np.tanh(v * 3.0) * 0.6
    hiss = bandpass(rng.standard_normal(len(v)), 2000, 6000) * 0.04
    return v + hiss


def phone_buzz(rng, length=0.45):
    """A phone vibrating on a table: a rough 160 Hz motor, pulsing."""
    n = seconds(length)
    t = np.arange(n) / SR
    motor = np.sign(np.sin(2 * np.pi * 160 * t)) * 0.5 + np.sin(2 * np.pi * 320 * t) * 0.3
    rattle = bandpass(rng.standard_normal(n), 200, 1200) * 0.3
    gate = (np.sin(2 * np.pi * 9 * t) > -0.2).astype(float)
    return lowpass((motor + rattle) * gate, 900) * env(n, 0.01, length, 1.2) * 0.5


def chime():
    n = seconds(1.2)
    t = np.arange(n) / SR
    a = np.sin(2 * np.pi * 1318.5 * t) * env(n, 0.002, 0.9, 3)
    b = np.sin(2 * np.pi * 1760 * t) * env(n, 0.002, 1.0, 3)
    return a * 0.25 + np.concatenate([np.zeros(seconds(0.11)), b[: n - seconds(0.11)]]) * 0.25


def camera_flash(rng):
    """An old flashgun: a rising charge whine, then the pop."""
    charge_n = seconds(0.22)
    t = np.arange(charge_n) / SR
    charge = np.sin(2 * np.pi * np.cumsum(2000 + 9000 * (t / 0.22) ** 2) / SR) * (t / 0.22) * 0.08
    pop_n = seconds(0.5)
    pop = bandpass(rng.standard_normal(pop_n), 600, 9000) * env(pop_n, 0.0005, 0.08, 5) * 0.9
    tt = np.arange(pop_n) / SR
    thump = np.sin(2 * np.pi * 90 * tt) * env(pop_n, 0.001, 0.12, 4) * 0.6
    return np.concatenate([charge, pop + thump])


def heartbeat(rng, strength=1.0):
    n = seconds(0.6)
    t = np.arange(n) / SR
    def thud(at, amp):
        s = np.zeros(n)
        i = seconds(at)
        k = np.sin(2 * np.pi * 52 * t[: n - i]) * np.exp(-t[: n - i] * 18)
        s[i:] += k * amp
        return s
    return lowpass(thud(0, 1.0) + thud(0.24, 0.7), 180) * strength


def power_down(rng):
    """The lights cutting out: a mains hum dropping away under a heavy relay clunk."""
    n = seconds(1.2)
    t = np.arange(n) / SR
    hum_f = 120 * np.exp(-t * 2.2) + 20
    hum = np.sin(2 * np.pi * np.cumsum(hum_f) / SR) * env(n, 0.002, 1.0, 2.5) * 0.4
    clunk = lowpass(rng.standard_normal(n), 300) * env(n, 0.0005, 0.06, 5) * 1.2
    return hum + clunk


def type_key(rng, heavy=False):
    """A manual typewriter: the type bar's smack on the platen."""
    n = seconds(0.12)
    smack = bandpass(rng.standard_normal(n), 900, 7000) * env(n, 0.0003, 0.02, 5)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (110 if heavy else 180) * t) * env(n, 0.001, 0.05, 4)
    return smack * 0.9 + body * (0.6 if heavy else 0.35)


def whoosh(rng, length=0.5):
    """Air moving past the lens: for whip pans and hard cuts."""
    n = seconds(length)
    t = np.arange(n) / SR
    x = rng.standard_normal((n, 2))
    shape = np.sin(np.pi * t / length) ** 2
    return bandpass(x, 400, 5000) * shape[:, None] * 0.5


# ---------------------------------------------------------------------------
# The radio station

def funk_bed(duration, rng, bpm=102):
    """A late-night radio bed: rubbery bass, a soft kick, off-beat hats and a warm chord stab."""
    n = seconds(duration)
    out = np.zeros(n)
    beat = 60 / bpm
    bass = ("A1", None, "A1", "C2", None, "D2", "E2", None)

    def put(sound_, at, gain):
        i = seconds(at)
        if i < n:
            j = min(n, i + len(sound_))
            out[i:j] += sound_[: j - i] * gain

    for bar in range(int(duration / (beat * 4)) + 1):
        start = bar * beat * 4
        for k, name in enumerate(bass):
            if name:
                m = seconds(beat * 0.45)
                tt = np.arange(m) / SR
                f = note(name)
                tone_ = np.tanh(np.sin(2 * np.pi * f * tt) * 2.5 + np.sin(4 * np.pi * f * tt) * 0.4)
                put(lowpass(tone_, 700) * env(m, 0.004, beat * 0.4, 3), start + k * beat / 2, 0.5)
        for k in (0, 2):
            m = seconds(0.2)
            tt = np.arange(m) / SR
            put(np.sin(2 * np.pi * (60 + 90 * np.exp(-tt * 40)) * tt) * env(m, 0.001, 0.16, 4), start + k * beat, 0.55)
        for k in range(8):
            m = seconds(0.05)
            put(highpass(rng.standard_normal(m), 7000) * env(m, 0.0005, 0.03, 5), start + (k + 0.5) * beat / 2, 0.1 if k % 2 else 0.05)
        for name in ("A3", "C4", "E4", "G4"):
            m = seconds(beat * 0.9)
            tt = np.arange(m) / SR
            f = note(name)
            put(lowpass(2 * ((tt * f) % 1.0) - 1, 1400) * env(m, 0.01, beat * 0.8, 3), start + beat * 1.5, 0.05)
    return out


def jingle(at, rng):
    """The station ident: three rising synth stabs and a bright tail."""
    n = seconds(1.8)
    out = np.zeros(n)
    for k, (names, when) in enumerate(((("A3", "C#4", "E4"), 0.0), (("B3", "D#4", "F#4"), 0.18), (("C#4", "F4", "G#4", "C#5"), 0.36))):
        for name in names:
            m = n - seconds(when)
            tt = np.arange(m) / SR
            f = note(name)
            stab = (2 * ((tt * f) % 1.0) - 1) + (2 * ((tt * f * 1.004) % 1.0) - 1)
            out[seconds(when):] += lowpass(stab, 3200) * env(m, 0.005, 0.5 if k < 2 else 1.3, 3) * 0.12
    return out


def creak(rng):
    """A studio chair taking someone's weight."""
    n = seconds(0.4)
    t = np.arange(n) / SR
    tone_ = np.sin(2 * np.pi * np.cumsum(420 + 160 * np.sin(t * 19)) / SR)
    return bandpass(tone_ * (np.sin(2 * np.pi * 34 * t) > 0), 500, 2600) * env(n, 0.02, 0.35, 2)


def room_hum(duration, rng):
    """A sealed room with the power on: barely there."""
    n = seconds(duration)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 50 * t) * 0.6 + np.sin(2 * np.pi * 100 * t) * 0.25 + lowpass(rng.standard_normal(n), 900) * 0.4


def alarm_beep():
    """The silence alarm: two soft, insistent pips."""
    n = seconds(0.42)
    t = np.arange(n) / SR
    pip = np.sin(2 * np.pi * 1046.5 * t) * ((t < 0.13) | ((t > 0.2) & (t < 0.33))).astype(float)
    return lowpass(pip, 3000) * 0.5


def neon_buzz():
    """A neon sign catching: a stuttering mains buzz that settles."""
    n = seconds(1.6)
    t = np.arange(n) / SR
    buzz = sum(np.sin(2 * np.pi * 100 * k * t) / k for k in range(1, 9))
    stutter = np.where(t < 0.7, (np.sin(2 * np.pi * 13 * t) > -0.2).astype(float), 1.0)
    return buzz * stutter * env(n, 0.005, 1.5, 2.5) * 0.35
