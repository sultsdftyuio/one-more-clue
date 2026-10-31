"""Takes from the better voice engines, made on Kaggle's free GPU because this PC hasn't got one.

    python -m omc_cinema.voice_lab push      # record the reference clips, send the job to Kaggle
    python -m omc_cinema.voice_lab wait      # wait for it, then download everything into out/lab
    python -m omc_cinema.voice_lab keep      # copy the takes named in CAST from out/lab into takes/
    python -m omc_cinema.voice_lab audition  # one labelled video of TRYOUTS, each take at the same loudness
    python -m omc_cinema.voice_lab push retake   # several tries at the lines in RETAKES, to pick from by transcript

A film uses a take by giving a line the voice "chatterbox:celeste" or "qwen:agatha" instead of a Kokoro
voice. Takes live in art/takes and are kept in git, because they can't be remade on this PC.

Casting is done by ear, character by character: Claude can't hear audio, so the report only checks the
words and how much the pitch moves. Chatterbox copies a voice from a clip, so a character sounds the same
from line to line. Qwen designs a new voice from a description each time, so it suits one-line parts.
"""
from __future__ import annotations

import base64
import json
import os
import pprint
import shutil
import subprocess
import sys
import time

from .film import OUT as FILM_OUT
from .film import ROOT
from .voice import TAKES, _path, record

KERNEL = "sultanalshaabi/omc-voice-lab"
KAGGLE = ROOT / ".venv-kaggle" / "Scripts" / "kaggle.exe"
LAB = ROOT / "out" / "lab"
REFERENCE = ("The letter arrived on a Tuesday, and by the evening, everyone in the house had read it. "
             "Nobody said a word at dinner. I think we all knew exactly what it meant.")
RESTRAINED = (0.6, 0.4)  # Chatterbox's exaggeration and cfg_weight: the setting chosen in the first audition

# Kept for the films, by engine and character.
CAST = ("chatterbox:celeste", "chatterbox:priya", "chatterbox:vince", "chatterbox:tess", "qwen:ozzy", "qwen:amelie")
CELESTE = ("Maison Lune. Seven courses.", "Course one. Oysters. Competent.", "Two. A soup with ambitions.", "Three. I have had worse.", "Four. The fish is brave.", "Five. Fine.", "Six.")
# (character, Kokoro voice to copy, Kokoro speed in the film, description for Qwen, the character's lines)
TRYOUTS = (
    ("ozzy", "am_puck", 1.08, "A young male night security guard, out of breath and panicking, shouting into a walkie-talkie.", ("Lab four! Cabinet B is wide open. HALO's gone!",)),
    ("priya", "af_heart", 1.0, "A young woman scientist, shocked and frightened, blurting out a desperate denial.", ("I didn't write that!",)),
    ("vince", "bm_lewis", 1.12, "A smooth, velvety British late-night radio DJ in his forties, warm, cheesy and showbiz, grinning into the microphone.",
     ("You're up late with Vince Valentine, and tonight, someone wins five grand.",)),
    ("vince", "bm_lewis", 1.08, "A British radio DJ in his forties, terrified and yelling for help from a corridor, voice cracking with panic.", ("Help! A man in a balaclava! He took the jackpot!",)),
    ("tess", "bf_emma", 1.08, "A sharp young British radio producer, worried and urgent, speaking fast into a studio talkback.", ("Vince? You're off air! Why's the blind down?",)),
    ("amelie", "bf_lily", 1.05, "A fierce French head chef in her forties with a strong French accent, shouting in fury and shock across a restaurant kitchen.", ("Not in my kitchen! Not tonight!",)),
)


# One-word lines come out garbled, so these give the model a little more to read and are cut down afterwards.
RETAKES = (("Five. Fine. Six.", (7, 11, 23)), ("Course five. Fine.", (7, 11)), ("Course six.", (7, 11)))


def retakes():
    return [{"engine": "chatterbox", "ref": "ref-bf_isabella", "text": words, "exaggeration": RESTRAINED[0], "cfg": RESTRAINED[1], "seed": seed,
             "file": f"retake-{''.join(c for c in words if c.isalpha()).lower()}-{seed}.wav"} for words, seeds in RETAKES for seed in seeds]


VINCE_ON_AIR = ("You're up late with Vince Valentine, and tonight, someone wins five grand.", "And the Night Owl jackpot winner is... right after this!")


def jobs():
    if sys.argv[2:] == ["retake"]:
        return retakes()
    if sys.argv[2:] == ["vince"]:  # a radio voice needs more than the restrained setting
        return [{"engine": "chatterbox", "ref": "ref-bm_lewis", "text": words, "exaggeration": 0.8, "cfg": 0.35, "file": _path(words, "chatterbox:vince", 1.0).name} for words in VINCE_ON_AIR]
    made = [{"engine": "chatterbox", "ref": "ref-bf_isabella", "text": words, "exaggeration": RESTRAINED[0], "cfg": RESTRAINED[1], "file": _path(words, "chatterbox:celeste", 1.0).name} for words in CELESTE]
    for who, voice, _, instruct, lines in TRYOUTS:
        for words in lines:
            made.append({"engine": "chatterbox", "ref": f"ref-{voice}", "text": words, "exaggeration": RESTRAINED[0], "cfg": RESTRAINED[1], "file": _path(words, f"chatterbox:{who}", 1.0).name})
            made.append({"engine": "qwen", "instruct": instruct, "text": words, "file": _path(words, f"qwen:{who}", 1.0).name})
    return made


def push():
    refs = sorted({"bf_isabella", *(t[1] for t in TRYOUTS)})
    record([(REFERENCE, v, 0.95) for v in refs])
    assets = {}
    LAB.mkdir(parents=True, exist_ok=True)
    for v in refs:
        mp3 = LAB / f"ref-{v}.mp3"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(_path(REFERENCE, v, 0.95)), "-ac", "1", "-b:a", "96k", str(mp3)], check=True)
        assets[f"ref-{v}"] = base64.b64encode(mp3.read_bytes()).decode()
    code = (ROOT / "omc_cinema" / "voice_lab_job.py").read_text(encoding="utf-8").replace("__ASSETS__", repr(assets)).replace("__JOBS__", pprint.pformat(jobs(), width=160))
    job = LAB / "job"
    job.mkdir(exist_ok=True)
    (job / "lab.py").write_text(code, encoding="utf-8")
    (job / "kernel-metadata.json").write_text(json.dumps({"id": KERNEL, "title": "omc-voice-lab", "code_file": "lab.py", "language": "python", "kernel_type": "script", "is_private": True,
                                                          "enable_gpu": True, "enable_internet": True, "dataset_sources": [], "competition_sources": [], "kernel_sources": []}), encoding="utf-8")
    print(subprocess.run([str(KAGGLE), "kernels", "push", "-p", str(job)], capture_output=True, text=True, env={**os.environ, "PYTHONUTF8": "1"}).stdout.strip()[-120:])


def wait():
    env = {**os.environ, "PYTHONUTF8": "1"}
    time.sleep(60)
    start = time.time()
    while time.time() - start < 2400:
        status = subprocess.run([str(KAGGLE), "kernels", "status", KERNEL], capture_output=True, text=True, env=env).stdout
        if any(word in status for word in ("COMPLETE", "ERROR", "CANCEL")):
            break
        time.sleep(20)
    print(f"{time.time() - start:.0f}s: {status.strip()[-60:]}")
    shutil.rmtree(LAB / "takes", ignore_errors=True)
    print(subprocess.run([str(KAGGLE), "kernels", "output", KERNEL, "-p", str(LAB)], capture_output=True, text=True, env=env).stdout.strip()[-100:])


def keep():
    TAKES.mkdir(exist_ok=True)
    kept = 0
    for take in (LAB / "takes").glob("*.wav"):
        if any(take.name.startswith(voice.replace(":", "-") + "-") for voice in CAST):
            shutil.copy(take, TAKES / take.name)
            kept += 1
    print(f"kept {kept} takes in {TAKES}")


def audition():
    """Every clip gets the films' polish and the same loudness, so nothing wins by being louder."""
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    from scipy.io import wavfile

    from . import sound
    from .film import FONTS
    from .voice import _trim

    report = json.loads((LAB / "takes" / "report.json").read_text())
    cards = LAB / "cards"
    cards.mkdir(exist_ok=True)
    title = lambda size: ImageFont.truetype(str(FONTS / "LilitaOne-Regular.ttf"), size)
    body = ImageFont.truetype(str(FONTS / "Nunito[wght].ttf"), 40)

    def clip(path):
        sr, x = wavfile.read(path)
        x = x.astype(np.float32) / (32768.0 if np.abs(x).max() > 1.5 else 1.0)
        x = _trim(sound.voice_chain(x.mean(axis=1) if x.ndim > 1 else x, sr))
        x = x * (0.1 / (np.sqrt(np.mean(x[np.abs(x) > np.abs(x).max() * 0.08] ** 2)) + 1e-9))
        return np.tanh(x * 1.2) / 1.2

    def card(path, n, who, words, take, name, colour):
        img = Image.new("RGB", (720, 1280), "#0F1A3A")
        d = ImageDraw.Draw(img)
        d.text((360, 120), f"LINE {n} OF {len(rows)}", font=body, fill="#9FD8FF", anchor="mm")
        d.text((360, 195), who, font=title(50), fill="#F6FCFF", anchor="mm")
        row, y = "", 300
        for word in f"\u201c{words}\u201d".split():
            if d.textlength(f"{row} {word}", font=body) > 610:
                d.text((360, y), row, font=body, fill="#D6E2F0", anchor="mm")
                row, y = word, y + 54
            else:
                row = f"{row} {word}".strip()
        d.text((360, y), row, font=body, fill="#D6E2F0", anchor="mm")
        d.text((360, 700), take, font=title(210), fill=colour, anchor="mm")
        d.text((360, 890), name, font=title(64), fill=colour, anchor="mm")
        img.save(path)

    rows = [(who, voice, speed, words) for who, voice, speed, _, lines in TRYOUTS for words in lines]
    audio, listing = [], []
    for n, (who, voice, speed, words) in enumerate(rows, 1):
        for take, name, colour, path in (("1", "Kokoro", "#8E93A0", _path(words, voice, speed)), ("2", "Chatterbox", "#9FD8FF", LAB / "takes" / _path(words, f"chatterbox:{who}", 1.0).name),
                                         ("3", "Qwen3-TTS", "#F2D38E", LAB / "takes" / _path(words, f"qwen:{who}", 1.0).name)):
            audio.append(np.concatenate([np.zeros(int(sound.SR * 0.35)), clip(path), np.zeros(int(sound.SR * 0.8))]))
            image = cards / f"{n}-{take}.png"
            card(image, n, who.capitalize(), words, take, name, colour)
            listing.append(f"file '{image.as_posix()}'\nduration {len(audio[-1]) / sound.SR:.3f}\n")
            print(n, who, name, report.get(path.name, {}).get("heard", ""))
    wavfile.write(LAB / "audition.wav", sound.SR, (np.concatenate(audio).clip(-1, 1) * 32767).astype(np.int16))
    (LAB / "cards.txt").write_text("".join(listing) + listing[-1].splitlines()[0] + "\n", encoding="utf-8")
    final = FILM_OUT / "voice-audition-2.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(LAB / "cards.txt"), "-i", str(LAB / "audition.wav"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "10",
                    "-c:a", "aac", "-b:a", "160k", "-shortest", str(final)], check=True)
    print(final, f"{sum(len(a) for a in audio) / sound.SR:.1f}s")


if __name__ == "__main__":
    {"push": push, "wait": wait, "keep": keep, "audition": audition}[sys.argv[1]]()
