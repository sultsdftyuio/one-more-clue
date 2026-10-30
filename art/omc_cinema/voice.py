"""Narrator lines, generated once and cached by their words, voice and pace."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile

from .film import OUT, ROOT
from .sound import voice_chain

VENV_PYTHON = ROOT / ".venv-voice" / "Scripts" / "python.exe"
SCRIPT = Path(__file__).resolve().parent / "voice_tts.py"
NARRATOR = "bm_george"


def _path(words: str, voice: str, speed: float) -> Path:
    key = hashlib.sha1(f"{voice}|{speed}|{words}".encode()).hexdigest()[:12]
    return OUT / "voice" / f"{key}.wav"


def record(takes) -> None:
    """Records many (words, voice, speed) lines in one go. The model loads once, so a crowd takes minutes, not an hour."""
    missing = [[words, voice, speed, str(_path(words, voice, speed))] for words, voice, speed in takes if not _path(words, voice, speed).exists()]
    if missing:
        jobs = OUT / "voice" / "batch.json"
        jobs.parent.mkdir(parents=True, exist_ok=True)
        jobs.write_text(json.dumps(missing), encoding="utf-8")
        subprocess.run([str(VENV_PYTHON), str(SCRIPT), "--batch", str(jobs)], check=True)


def line(words: str, voice: str = NARRATOR, speed: float = 0.92) -> np.ndarray:
    """The narrator saying `words`, polished and at 48 kHz."""
    path = _path(words, voice, speed)
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([str(VENV_PYTHON), str(SCRIPT), words, voice, str(speed), str(path)], check=True)
    sr, audio = wavfile.read(path)
    audio = audio.astype(np.float32)
    if np.abs(audio).max() > 1.5:  # integer PCM
        audio /= 32768.0
    return _trim(voice_chain(audio, sr))


def _trim(v: np.ndarray, floor_db: float = -42, pad: float = 0.03) -> np.ndarray:
    """Cuts the silence the voice model leaves before and after the words."""
    loud = np.flatnonzero(np.abs(v) > 10 ** (floor_db / 20))
    if not len(loud):
        return v
    keep = int(pad * 48000)
    return v[max(0, loud[0] - keep): loud[-1] + keep]
