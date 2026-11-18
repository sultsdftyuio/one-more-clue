"""The game's spoken lines: suspects in Chatterbox voices, made on Kaggle's free GPU because this PC hasn't
got one, and the narrator in Kokoro, the same narrator as the opening films.

    python voices.py audition case-001   # a reference clip for each candidate voice, then the casting takes go to Kaggle
    python voices.py wait                # wait for Kaggle, then download everything into out/voices/lab
    python voices.py sheet case-001      # the casting video: each candidate saying two of the character's real lines
    python voices.py record case-001     # every line in the cast voices, sent to Kaggle (the narrator is spoken here)
    python voices.py act case-001        # the same, played with feeling: each line in its mood, best of a few takes
    python voices.py reel case-001       # a listening reel of the acted takes: each speech, then the strongest lines
    python voices.py wait
    python voices.py keep case-001       # trims, levels and files every take, and lists them for the game
    python voices.py draft case-001      # every line in plain Kokoro, on this PC: a stand-in to build and test with

The lines come from the case file (scripts/voice-lines.ts), keyed by who speaks and their exact words, so a
changed line simply goes missing until it's recorded again, and the game falls back to its blips. Takes are
filed as ../public/voices/<case>/<key>.mp3 and listed in ../src/lib/voice-lines.ts.

Casting is done by ear: Claude can't hear audio, so Whisper's report only checks that the words came out right.
Chatterbox copies a voice from a reference clip, so a character sounds the same from line to line. One-word
lines can come out garbled, so check those in the report.
"""
from __future__ import annotations

import base64
import json
import os
import pprint
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.io import wavfile

ART = Path(__file__).resolve().parent
GAME = ART.parent
OUT = ART / "out" / "voices"
LAB = OUT / "lab"
REFS = OUT / "refs"
TAKES = ART / "takes"  # the films' takes, kept in git
KOKORO = ART / ".venv-voice" / "Scripts" / "python.exe"
KAGGLE = ART / ".venv-kaggle" / "Scripts" / "kaggle.exe"
KERNEL = "sultanalshaabi/omc-game-voices"
PUBLIC = GAME / "public" / "voices"
MANIFEST = GAME / "src" / "lib" / "voice-lines.ts"
FONTS = ART / "fonts"

# The clip each Chatterbox voice is copied from: the voice lab's sentence, read by a Kokoro voice.
REFERENCE = ("The letter arrived on a Tuesday, and by the evening, everyone in the house had read it. "
             "Nobody said a word at dinner. I think we all knew exactly what it meant.")
RESTRAINED = (0.6, 0.4)  # Chatterbox's exaggeration and cfg_weight, as chosen for the films
NARRATOR_VOICE, NARRATOR_SPEED = "bm_george", 0.92  # the films' narrator

# Voices to audition, per character: a Kokoro voice to copy, or "take:<file>" to copy a film's own take.
CANDIDATES = {
    "case-001": {
        "triangle": ["af_heart", "af_nicole", "af_sarah"],  # af_heart is Priya's voice in the opening film
        "circle": ["take:qwen-ozzy-ba8435f7f774", "am_puck", "am_echo"],  # the first copies Ozzy from the film
        "square": ["bm_fable", "bm_daniel", "am_onyx"],
        "rectangle": ["bf_alice", "af_kore", "af_nova"],
    },
}
# Two real lines per character for the casting sheet: one steady, one under pressure.
SAMPLES = {
    "case-001": {
        "triangle": ["8733e088", "c6474e78"],
        "circle": ["01e09204", "cdd8bb86"],
        "square": ["52ff4d1e", "ca8775f8"],
        "rectangle": ["1ef4e9b3", "525ec908"],
    },
}
# The voices chosen at casting, per character. Until then the first candidate stands in.
# 2026-11-17: the user heard the casting sheet and chose Voice 1 for everyone, played with far more feeling.
CAST: dict[str, dict[str, str]] = {
    "case-001": {"triangle": "af_heart", "circle": "take:qwen-ozzy-ba8435f7f774", "square": "bm_fable", "rectangle": "bf_alice"},
    # 2026-11-18: "do the same for the other 3 cases". Film voices kept (Vince, Tess, Amélie, Sir Reginald); the rest chosen here.
    "case-002": {"square": "bm_lewis", "triangle": "bf_emma", "circle": "bm_daniel", "rectangle": "af_nicole"},
    "case-003": {"triangle": "take:qwen-amelie-895acca67094", "square": "am_michael", "circle": "am_echo", "rectangle": "af_sarah", "jo-runner": "am_puck"},
    "case-004": {"circle": "am_santa", "triangle": "af_sky", "square": "take:qwen-reginald-fd8f29ae9b83", "rectangle": "bf_lily"},
}

# How hard a line is played: Chatterbox's exaggeration (how much feeling) and cfg_weight (lower is slower and
# more deliberate, which keeps strong feeling from rushing). Chatterbox suggests ~0.7+ with ~0.3 for drama.
MOODS = {
    "steady": (0.6, 0.45),
    "nervous": (0.85, 0.35),
    "defensive": (0.9, 0.33),
    "indignant": (1.0, 0.3),
    "exasperated": (1.1, 0.3),
    "upset": (1.15, 0.3),
    "smug": (0.9, 0.3),
    "cold": (0.7, 0.35),
    "rattled": (1.0, 0.3),
    "furious": (1.25, 0.3),
    "broken": (0.8, 0.25),
    "dazed": (0.65, 0.3),
    "dismissive": (0.85, 0.33),
    "cruel": (0.95, 0.3),
    "theatrical": (1.25, 0.3),
    "warm": (0.75, 0.35),
}
# Each line's mood, by where it's heard, then by the line itself where it needs its own.
MOOD_BY_PLACE = {"asked": "steady", "cracking": "defensive", "the confrontation": "smug", "the confrontation, caught": "rattled",
                 "the confrontation, walking out": "furious", "shrugging off evidence": "dismissive", "the confession": "cold"}
LINE_MOODS = {
    "case-001": {
        "d0fb7394": "indignant",  # Squires: "I'd stake my reputation on it."
        "ca8775f8": "exasperated",  # Squires: "All right! I left her alone..."
        "cdd8bb86": "upset",  # Ozzy: "I walk past that lab every night!"
        "b0943425": "cold",  # Rena: "I've told you everything."
        "8733e088": "nervous",  # Priya: "I... didn't lock it."
        "01e09204": "nervous",  # Ozzy: finding the cabinet open
        "2d923621": "defensive",  # Ozzy: "Nobody... I'd have seen."
        "aacdeadd": "exasperated",  # Ozzy cracks: the match was on
        "52ff4d1e": "indignant",  # Squires: "Visitors are always escorted."
        "c58a7790": "nervous",  # Ozzy: the visitor at the Lab 4 door
        "465c8cb1": "cold",  # Rena: "I drove straight home."
        "99f94893": "nervous",  # Priya: the visitor
        "45f3ad0e": "nervous",  # Squires cracks: the Dean's call
        "1fa80c2d": "dismissive",  # Rena cracks: "who's counting?"
        "b5608f78": "dismissive",  # Rena: "As I've said. Several times."
        "3e58d18c": "nervous",  # Squires: "Against the rules, I know."
        "6d326191": "steady",  # Ozzy: the tote bag
        "22ed0d28": "rattled",  # Rena cracks: Kestrel
        "d98cf72b": "defensive",  # Rena cracks: "Is that a crime now?"
        "1ef4e9b3": "smug",  # Rena: "How exciting."
        "d99842e8": "cold",  # Rena: "...I'd like to stop talking now."
        "3088dfba": "broken",  # Rena: "It was me."
        "525ec908": "cold",  # Rena: what Kestrel paid
        "e6f74638": "cruel",  # Rena: "you'd all chase her instead of me"
        "c6474e78": "broken",  # Priya: "Three years of my life. In a tote bag."
        "8f97a593": "dazed",  # Squires: "a new visitor policy"
    },
    "case-002": {
        "8c059e6f": "theatrical", "0018006c": "theatrical", "ba269602": "exasperated", "ec83078e": "exasperated", "663dd86b": "theatrical",
        "161419eb": "exasperated", "9844978c": "rattled", "3d34b6b6": "indignant", "746559df": "nervous", "c2252fd2": "theatrical",
        "a13381e2": "broken", "87e46a1f": "broken", "c1653b81": "cruel", "227388c1": "smug", "b74d59d3": "upset", "4fe92c82": "defensive",
        "84422d9a": "smug", "374f088b": "smug", "65f48f32": "indignant", "735770ad": "smug",
    },
    "case-003": {
        "ca6110f9": "smug", "5e515573": "smug", "df90089e": "smug", "9b80e140": "indignant", "1dad2ef5": "furious", "1f406602": "cold",
        "93396a3c": "dismissive", "b79e6c30": "rattled", "d6dcb4cf": "indignant", "f37e8ada": "nervous", "93ace5cf": "cold", "e8e7944e": "cold",
        "7797ba66": "defensive", "fe7665c9": "rattled", "1a1b1884": "cold", "8abc7489": "cold", "94671612": "cold", "259aa974": "cold",
        "07368df9": "cold", "2aec1b9b": "cold", "0ee3ea2d": "cold", "1593b505": "broken", "a9c1fb48": "cold", "3088dfba": "broken",
        "5d8edf9d": "broken", "2121e4e8": "broken",
    },
    "case-004": {
        "2fbd9711": "smug", "8e485688": "warm", "48c6b880": "defensive", "6c7f3ba6": "warm", "7bb3a7ba": "nervous", "8027692e": "indignant",
        "581abd50": "nervous", "2794b236": "cold", "0a197743": "broken", "e7c3e352": "broken", "4e9dce0a": "smug", "8fdbc9ce": "upset",
        "3705b6c0": "defensive", "9a244fb7": "indignant", "a0426fc4": "dismissive", "1e654821": "smug", "b9a3030d": "nervous",
    },
}
# The speech each character's voice reads first, in character, to become the reference their lines copy.
WARMUPS = {
    "case-001": {
        "triangle": ("I didn't write that message. I swear I didn't! Three years I've given HALO, three whole years, and now you think "
                     "I'd just walk out with it? I locked it in the cabinet. I know I did.", "upset"),
        "circle": ("Look, I do my rounds every single night, all right? Every one! I saw that cabinet wide open and I called it in "
                   "straight away. Honestly, I'm not the one you want here. I'm really not.", "upset"),
        "square": ("This is absurd. I have run this laboratory for twenty years, and I will not be lectured about procedure by anyone. "
                   "Not tonight, and certainly not in front of our investors.", "indignant"),
        "rectangle": ("Oh, please. You have a photograph and a hunch. I came here as a guest, I was perfectly charming, and frankly, "
                      "I expected rather better manners from all of you.", "smug"),
    },
    "case-002": {
        "square": ("Ladies and gentlemen, I have been attacked! On my own show! A man in a balaclava, built like a wardrobe, and I held him off "
                   "with nothing but my voice. Nothing but my voice!", "theatrical"),
        "triangle": ("I couldn't see a thing! The blind came down, the sound went, and I just froze. I thought he'd fainted. "
                     "I've never had dead air on my watch. Never!", "upset"),
        "circle": ("Look, I was out back having a smoke, same as every hour. Tess shouted, I ran. The cables were fine, the rack was fine. "
                   "Whatever stopped that show, it wasn't my kit.", "defensive"),
        "rectangle": ("Oh, please. If I wanted Vince's slot, I'd take it on air, in front of everyone. I don't need a balaclava, darling. "
                      "I need a microphone and five minutes.", "smug"),
    },
    "case-003": {
        "triangle": ("This kitchen is nut-free. Completely! Five years, not one nut. Every plate passes my eyes, every single one. "
                     "And tonight of all nights, with her at Table One? No. Impossible.", "indignant"),
        "square": ("Do you know who I am? I own this restaurant. I taste that chocolate course every single night, at Table Nine, "
                   "and now I'm told someone wanted me dead? In my own dining room?", "indignant"),
        "circle": ("Darling, I keep that pass immaculate. A smudge on a plate for Celeste Hart? Never. I sent her the clean one. "
                   "Frankly, you should be thanking me.", "smug"),
        "rectangle": ("Twelve years. Twelve years of desserts in that kitchen, and nobody even knows my name. I make the chocolate course, "
                      "every night, start to finish. Nobody else touches it.", "cold"),
        "jo-runner": ("I just carry the plates! Olu said the left one, so I took the left one, the one with the little gold leaf. "
                      "I didn't know. I swear I didn't know!", "nervous"),
    },
    "case-004": {
        "circle": ("Welcome, welcome! A blizzard, a roaring fire, and the finest lodge in the valley. I've made you all very comfortable, "
                   "haven't I? Now, more cocoa? I insist. Nobody goes cold on my watch.", "warm"),
        "triangle": ("I film everything, all right? It's just what I do! I had my phone up for the countdown, and then the lights went out, "
                     "and when they came back, Aunt Agatha's necklace was gone. Just gone!", "upset"),
        "square": ("Lot one, the Aurora. One hundred and eighty thousand pounds, and it vanished in the dark like a cheap conjuring trick. "
                   "Thirty years of auctions, and this has never, ever happened.", "indignant"),
        "rectangle": ("My card was stolen at half past eight. I reported it at the desk. And at midnight I was on that microphone, "
                      "counting down, with the whole room watching me. Ask anyone.", "defensive"),
    },
}
SEEDS = (7, 21)
SHORT_SEEDS = (7, 21, 33, 45)  # one-word lines come out garbled more often, so they get more tries


def mood_of(case: str, line: dict) -> str:
    place = "asked" if line["where"].startswith("asked") else line["where"]
    return LINE_MOODS.get(case, {}).get(line["key"]) or MOOD_BY_PLACE.get(place, "steady")


ONES = ("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen").split()
TENS = {2: "twenty", 3: "thirty", 4: "forty", 5: "fifty"}


def _number(n: int) -> str:
    if n < 20:
        return ONES[n]
    tens, ones = divmod(n, 10)
    return TENS[tens] + (f"-{ONES[ones]}" if ones else "")


def speakable(text: str) -> str:
    """How a line is read aloud. Voices stumble on clock times ("9:17" came out as "9007"), so they're read as words:
    "nine seventeen", "nine oh two", "nine o'clock". The screen still shows the line as written."""
    def clock(m: re.Match) -> str:
        hour, minute = int(m[1]), int(m[2])
        said = "o'clock" if minute == 0 else f"oh {ONES[minute]}" if minute < 10 else _number(minute)
        return f"{_number(hour)} {said}"
    # Capitals on screen are emphasis ("poison ME?"), but a voice spells them out ("em ee"): read them as words.
    text = re.sub(r"\b[A-Z]{2,}\b", lambda m: m[0] if m[0] in SPELLED else m[0].lower(), text)
    return re.sub(r"\b(\d{1,2}):(\d{2})\b", clock, text)


# Initialisms that really are read letter by letter.
SPELLED = {"AM", "PM", "ANPR", "CCTV", "DJ", "DNA", "GPS", "HQ", "ID", "OK", "TV", "UK", "USA", "VIP"}


def lines(case: str) -> dict:
    """The case's spoken lines, straight from the case file."""
    raw = subprocess.run(["node", "--no-warnings", "scripts/voice-lines.ts", case], cwd=GAME, capture_output=True, text=True, encoding="utf-8", check=True).stdout
    data = json.loads(raw)
    (OUT / case).mkdir(parents=True, exist_ok=True)
    (OUT / case / "lines.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def kokoro(jobs: list[list]) -> None:
    """Speaks [text, voice, speed, out] jobs with Kokoro, skipping any already made."""
    todo = [job for job in jobs if not Path(job[3]).exists()]
    if not todo:
        return
    batch = OUT / "kokoro.json"
    batch.parent.mkdir(parents=True, exist_ok=True)
    batch.write_text(json.dumps(todo), encoding="utf-8")
    subprocess.run([str(KOKORO), str(ART / "omc_art" / "voices" / "kokoro_tts.py"), str(batch)], check=True, stdout=subprocess.DEVNULL)


def reference(voice: str) -> Path:
    if voice.startswith("take:"):
        return TAKES / f"{voice[5:]}.wav"
    return REFS / f"ref-{voice}.wav"


def ref_name(voice: str) -> str:
    return f"ref-{voice.replace(':', '-')}"


def make_references(voices: list[str]) -> None:
    REFS.mkdir(parents=True, exist_ok=True)
    kokoro([[REFERENCE, v, 0.95, str(reference(v))] for v in voices if not v.startswith("take:")])


def push(jobs: list[dict], voices: list[str]) -> None:
    """Sends Chatterbox jobs to Kaggle, with the reference clips they copy packed inside."""
    make_references(voices)
    assets = {}
    for v in sorted(set(voices)):
        # Opus keeps speech clear at a third of the size, and Kaggle refuses scripts much over a megabyte.
        packed = REFS / f"{ref_name(v)}.ogg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(reference(v)), "-ac", "1", "-c:a", "libopus", "-b:a", "32k", str(packed)], check=True)
        assets[ref_name(v)] = base64.b64encode(packed.read_bytes()).decode()
    template = (ART / "omc_art" / "voices" / "kaggle_job.py").read_text(encoding="utf-8")
    code = template.replace("__ASSETS__", repr(assets)).replace("__JOBS__", pprint.pformat(jobs, width=160))
    job = OUT / "job"
    job.mkdir(parents=True, exist_ok=True)
    (job / "voices.py").write_text(code, encoding="utf-8")
    meta = {"id": KERNEL, "title": "omc-game-voices", "code_file": "voices.py", "language": "python", "kernel_type": "script", "is_private": True,
            "enable_gpu": True, "enable_internet": True, "dataset_sources": [], "competition_sources": [], "kernel_sources": []}
    (job / "kernel-metadata.json").write_text(json.dumps(meta), encoding="utf-8")
    pushed = subprocess.run([str(KAGGLE), "kernels", "push", "-p", str(job)], capture_output=True, text=True, env={**os.environ, "PYTHONUTF8": "1"})
    print((pushed.stdout + pushed.stderr).strip()[-200:])
    print(f"sent {len(jobs)} takes")


def audition(case: str) -> None:
    data = lines(case)
    text = {line["key"]: line["text"] for line in data["lines"]}
    jobs = []
    for speaker, voices in CANDIDATES[case].items():
        for n, voice in enumerate(voices, 1):
            for key in SAMPLES[case][speaker]:
                jobs.append({"engine": "chatterbox", "ref": ref_name(voice), "text": text[key], "exaggeration": RESTRAINED[0], "cfg": RESTRAINED[1],
                             "file": f"try-{speaker}-{n}-{key}.wav"})
    push(jobs, [v for voices in CANDIDATES[case].values() for v in voices])


def wait() -> None:
    env = {**os.environ, "PYTHONUTF8": "1"}
    start = time.time()
    status = ""
    while time.time() - start < 5400:  # a GPU can take a while to come free
        status = subprocess.run([str(KAGGLE), "kernels", "status", KERNEL], capture_output=True, text=True, env=env).stdout
        if any(word in status for word in ("COMPLETE", "ERROR", "CANCEL")):
            break
        time.sleep(30)
    print(f"{time.time() - start:.0f}s: {status.strip()[-60:]}")
    shutil.rmtree(LAB, ignore_errors=True)
    LAB.mkdir(parents=True)
    got = subprocess.run([str(KAGGLE), "kernels", "output", KERNEL, "-p", str(LAB)], capture_output=True, text=True, env=env)
    print((got.stdout + got.stderr).strip()[-200:])
    print(f"{len(list((LAB / 'takes').glob('*.wav')))} takes in {LAB / 'takes'}")


def polish(path: Path) -> tuple[np.ndarray, int]:
    """A take, trimmed of the silence around it and brought to one loudness, so no line is louder than the next."""
    sr, x = wavfile.read(path)
    x = x.astype(np.float32)
    if x.ndim > 1:
        x = x.mean(axis=1)
    if np.abs(x).max() > 1.5:  # integer samples
        x /= 32768.0
    loud = np.flatnonzero(np.abs(x) > 10 ** (-42 / 20))
    if len(loud):
        pad = int(0.04 * sr)
        x = x[max(0, loud[0] - pad): loud[-1] + pad]
    voiced = x[np.abs(x) > np.abs(x).max() * 0.08]
    x = x * (0.1 / (np.sqrt(np.mean(voiced ** 2)) + 1e-9))
    fade = min(len(x) // 4, int(0.012 * sr))
    if fade:
        x[:fade] *= np.linspace(0, 1, fade)
        x[-fade:] *= np.linspace(1, 0, fade)
    return np.tanh(x * 1.2) / 1.2, sr


def resample(x: np.ndarray, sr: int, to: int) -> np.ndarray:
    if sr == to:
        return x
    from scipy.signal import resample_poly

    g = np.gcd(sr, to)
    return resample_poly(x, to // g, sr // g).astype(np.float32)


def sheet(case: str) -> None:
    """The casting video: a card per line, each candidate voice in turn, every take at the same loudness."""
    data = json.loads((OUT / case / "lines.json").read_text(encoding="utf-8"))
    text = {line["key"]: line["text"] for line in data["lines"]}
    who = {s["id"]: s for s in data["suspects"]}
    report = json.loads((LAB / "takes" / "report.json").read_text()) if (LAB / "takes" / "report.json").exists() else {}
    cards = OUT / "cards"
    shutil.rmtree(cards, ignore_errors=True)
    cards.mkdir(parents=True)
    title = lambda size: ImageFont.truetype(str(FONTS / "LilitaOne-Regular.ttf"), size)
    body = ImageFont.truetype(str(FONTS / "Nunito[wght].ttf"), 38)
    SR = 48000
    audio, listing = [], []

    def card(name: str, role: str, top: str, big: str, words: str) -> Path:
        img = Image.new("RGB", (720, 1280), "#15182e")
        d = ImageDraw.Draw(img)
        d.text((360, 110), f"{case.upper().replace('-', ' ')} · CASTING", font=body, fill="#f2b63c", anchor="mm")
        d.text((360, 200), name, font=title(64), fill="#f6f1e4", anchor="mm")
        d.text((360, 262), role, font=body, fill="#a9aec8", anchor="mm")
        d.text((360, 470), top, font=title(56), fill="#f2b63c", anchor="mm")
        d.text((360, 610), big, font=title(220), fill="#f6f1e4", anchor="mm")
        row, y = "", 820
        for word in f"“{words}”".split() if words else []:
            if d.textlength(f"{row} {word}", font=body) > 620:
                d.text((360, y), row, font=body, fill="#dcdff0", anchor="mm")
                row, y = word, y + 52
            else:
                row = f"{row} {word}".strip()
        if row:
            d.text((360, y), row, font=body, fill="#dcdff0", anchor="mm")
        path = cards / f"{len(listing):03d}.png"
        img.save(path)
        return path

    def add(image: Path, clip: np.ndarray) -> None:
        audio.append(clip)
        listing.append(f"file '{image.as_posix()}'\nduration {len(clip) / SR:.3f}\n")

    for speaker, voices in CANDIDATES[case].items():
        s = who[speaker]
        add(card(s["name"], s["role"], f"{len(voices)} voices", "?", ""), np.zeros(int(SR * 1.6), np.float32))
        for n, _ in enumerate(voices, 1):
            for key in SAMPLES[case][speaker]:
                take = LAB / "takes" / f"try-{speaker}-{n}-{key}.wav"
                if not take.exists():
                    print("missing", take.name)
                    continue
                clip, sr = polish(take)
                clip = np.concatenate([np.zeros(int(SR * 0.35), np.float32), resample(clip, sr, SR), np.zeros(int(SR * 0.7), np.float32)])
                add(card(s["name"], s["role"], "Voice", str(n), text[key]), clip)
                heard = report.get(take.name, {}).get("heard", "")
                print(f"{s['name']:<22} voice {n}  {report.get(take.name, {}).get('seconds', '?'):>5}s  heard: {heard}")
    wavfile.write(OUT / "casting.wav", SR, (np.concatenate(audio).clip(-1, 1) * 32767).astype(np.int16))
    (OUT / "cards.txt").write_text("".join(listing) + listing[-1].splitlines()[0] + "\n", encoding="utf-8")
    final = OUT / f"casting-{case}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(OUT / "cards.txt"), "-i", str(OUT / "casting.wav"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "10", "-c:a", "aac", "-b:a", "160k", "-shortest", str(final)], check=True)
    print(final, f"{sum(len(a) for a in audio) / SR:.0f}s")


# The lines a listening reel plays after each character's speech: the ones with the most feeling in them.
REEL = {
    "case-001": {
        "triangle": ["8733e088", "99f94893", "c6474e78"],
        "circle": ["01e09204", "cdd8bb86", "aacdeadd"],
        "square": ["d0fb7394", "ca8775f8", "8f97a593"],
        "rectangle": ["1ef4e9b3", "2ce71778", "e6f74638", "3088dfba", "a7e993b4"],
    },
    "case-002": {"square": ["c2252fd2", "0018006c", "6b689c35", "87e46a1f"], "triangle": ["b74d59d3"], "circle": ["84422d9a"], "rectangle": ["65f48f32", "227388c1"]},
    "case-003": {"rectangle": ["1a1b1884", "65d8adbc", "1593b505", "5d8edf9d"], "square": ["1dad2ef5"], "circle": ["5e515573"], "triangle": ["d6dcb4cf"], "jo-runner": ["f37e8ada"]},
    "case-004": {"circle": ["4d214de6", "9ce008d1", "e2d45d82", "4e9dce0a"], "rectangle": ["8fdbc9ce"], "square": ["1e654821"], "triangle": ["b9a3030d"]},
}


def reel(case: str) -> None:
    """A listening reel of the acted takes: each character's new reference speech, then their strongest lines,
    each card naming the line's mood. Every take at the same loudness, as the game plays them."""
    data = json.loads((OUT / case / "lines.json").read_text(encoding="utf-8"))
    by_key = {line["key"]: line for line in data["lines"]}
    who = {s["id"]: s for s in data["suspects"]}
    report = json.loads((LAB / "takes" / "report.json").read_text()) if (LAB / "takes" / "report.json").exists() else {}
    cards = OUT / "cards"
    shutil.rmtree(cards, ignore_errors=True)
    cards.mkdir(parents=True)
    title = lambda size: ImageFont.truetype(str(FONTS / "LilitaOne-Regular.ttf"), size)
    body = ImageFont.truetype(str(FONTS / "Nunito[wght].ttf"), 38)
    SR = 48000
    audio, listing = [], []

    def card(name: str, role: str, mood: str, words: str) -> Path:
        img = Image.new("RGB", (720, 1280), "#15182e")
        d = ImageDraw.Draw(img)
        d.text((360, 110), f"{case.upper().replace('-', ' ')} · VOICES", font=body, fill="#f2b63c", anchor="mm")
        d.text((360, 200), name, font=title(64), fill="#f6f1e4", anchor="mm")
        d.text((360, 262), role, font=body, fill="#a9aec8", anchor="mm")
        d.text((360, 520), mood, font=title(120), fill="#f2b63c", anchor="mm")
        row, y = "", 760
        for word in f"\u201c{words}\u201d".split():
            if d.textlength(f"{row} {word}", font=body) > 620:
                d.text((360, y), row, font=body, fill="#dcdff0", anchor="mm")
                row, y = word, y + 52
            else:
                row = f"{row} {word}".strip()
        d.text((360, y), row, font=body, fill="#dcdff0", anchor="mm")
        path = cards / f"{len(listing):03d}.png"
        img.save(path)
        return path

    def add(take: Path, image: Path) -> None:
        clip, sr = polish(take)
        clip = np.concatenate([np.zeros(int(SR * 0.35), np.float32), resample(clip, sr, SR), np.zeros(int(SR * 0.8), np.float32)])
        audio.append(clip)
        listing.append(f"file '{image.as_posix()}'\nduration {len(clip) / SR:.3f}\n")
        r = report.get(take.name, {})
        print(f"  {take.name:<22} match {r.get('match', '?')}  pitch {r.get('pitch', '?')}  heard: {r.get('heard', '')}")

    for speaker, keys in REEL[case].items():
        s = who.get(speaker) or {"name": speaker.replace("-", " ").title(), "role": "Witness"}
        print(s["name"])
        speech, mood = WARMUPS[case][speaker]
        ref = next((p for p in (LAB / "takes" / f"ref-{case}.{speaker}.wav", LAB / "takes" / f"ref-{speaker}.wav") if p.exists()), None)
        if ref:
            add(ref, card(s["name"], s["role"], "In character", speech))
        for key in keys:
            take = take_for(case, key)
            if take.exists():
                add(take, card(s["name"], s["role"], mood_of(case, by_key[key]).capitalize(), by_key[key]["text"]))
            else:
                print("  missing", key)
    wavfile.write(OUT / "reel.wav", SR, (np.concatenate(audio).clip(-1, 1) * 32767).astype(np.int16))
    (OUT / "cards.txt").write_text("".join(listing) + listing[-1].splitlines()[0] + "\n", encoding="utf-8")
    final = OUT / f"voices-{case}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(OUT / "cards.txt"), "-i", str(OUT / "reel.wav"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "10", "-c:a", "aac", "-b:a", "160k", "-shortest", str(final)], check=True)
    print(final, f"{sum(len(a) for a in audio) / SR:.0f}s")


def chosen(case: str, speaker: str) -> str:
    return CAST.get(case, {}).get(speaker) or CANDIDATES[case][speaker][0]


def take_for(case: str, key: str) -> Path:
    """A line's kept take from the lab: named by case since jobs could carry several, or by key alone in older jobs."""
    named = LAB / "takes" / f"{case}-{key}.wav"
    return named if named.exists() else LAB / "takes" / f"{key}.wav"


def record(case: str) -> None:
    """Every suspect line in its cast voice, sent to Kaggle. The narrator's lines are spoken here by Kokoro."""
    data = lines(case)
    jobs = [{"engine": "chatterbox", "ref": ref_name(chosen(case, line["speaker"])), "text": speakable(line["text"]), "exaggeration": RESTRAINED[0], "cfg": RESTRAINED[1],
             "file": f"{line['key']}.wav"} for line in data["lines"] if line["speaker"] != "narrator"]
    narrate(case, data)
    push(jobs, sorted({chosen(case, line["speaker"]) for line in data["lines"] if line["speaker"] != "narrator"}))


def act(*cases: str) -> None:
    """Every suspect line of these cases played in its mood, from a reference each character reads in character first.
    Several cases go in one job; files are named <case>-<key>, and references ref-<case>.<speaker>. See kaggle_act.py."""
    warmups, jobs, refs = {}, [], set()
    for case in cases:
        data = lines(case)
        speakers = sorted({line["speaker"] for line in data["lines"] if line["speaker"] != "narrator"})
        voices = {speaker: chosen(case, speaker) for speaker in speakers}
        refs |= set(voices.values())
        for speaker in speakers:
            words, mood = WARMUPS[case][speaker]
            exaggeration, cfg = MOODS[mood]
            warmups[f"{case}.{speaker}"] = {"say": words, "voice": ref_name(voices[speaker]), "exaggeration": exaggeration, "cfg": cfg, "seeds": list(SEEDS)}
        for line in data["lines"]:
            if line["speaker"] == "narrator":
                continue
            exaggeration, cfg = MOODS[mood_of(case, line)]
            short = len(line["text"].split()) <= 2
            jobs.append({"key": f"{case}-{line['key']}", "speaker": f"{case}.{line['speaker']}", "say": speakable(line["text"]), "exaggeration": exaggeration,
                         "cfg": cfg, "seeds": list(SHORT_SEEDS if short else SEEDS)})
        narrate(case, data)
    make_references(sorted(refs))
    assets = {}
    for v in sorted(refs):
        packed = REFS / f"{ref_name(v)}.ogg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(reference(v)), "-ac", "1", "-c:a", "libopus", "-b:a", "32k", str(packed)], check=True)
        assets[ref_name(v)] = base64.b64encode(packed.read_bytes()).decode()
    template = (ART / "omc_art" / "voices" / "kaggle_act.py").read_text(encoding="utf-8")
    code = (template.replace("__ASSETS__", repr(assets)).replace("__WARMUPS__", pprint.pformat(warmups, width=160))
            .replace("__LINES__", pprint.pformat(jobs, width=160)))
    job = OUT / "job"
    shutil.rmtree(job, ignore_errors=True)
    job.mkdir(parents=True)
    (job / "voices.py").write_text(code, encoding="utf-8")
    meta = {"id": KERNEL, "title": "omc-game-voices", "code_file": "voices.py", "language": "python", "kernel_type": "script", "is_private": True,
            "enable_gpu": True, "enable_internet": True, "dataset_sources": [], "competition_sources": [], "kernel_sources": []}
    (job / "kernel-metadata.json").write_text(json.dumps(meta), encoding="utf-8")
    pushed = subprocess.run([str(KAGGLE), "kernels", "push", "-p", str(job)], capture_output=True, text=True, env={**os.environ, "PYTHONUTF8": "1"})
    print((pushed.stdout + pushed.stderr).strip()[-200:])
    takes = sum(len(j["seeds"]) for j in jobs) + sum(len(w["seeds"]) for w in warmups.values())
    print(f"sent {len(jobs)} lines ({takes} takes) for {len(warmups)} characters, {(job / 'voices.py').stat().st_size / 1024:.0f} KB")


def narrate(case: str, data: dict) -> None:
    folder = OUT / case / "narrator"
    folder.mkdir(parents=True, exist_ok=True)
    kokoro([[speakable(line["text"]), NARRATOR_VOICE, NARRATOR_SPEED, str(folder / f"{line['key']}.wav")] for line in data["lines"] if line["speaker"] == "narrator"])


def file_takes(case: str, takes: dict[str, Path], note: str) -> None:
    """Writes each take as a small mp3 for phones, and lists every line that has one for the game."""
    target = PUBLIC / case
    shutil.rmtree(target, ignore_errors=True)
    target.mkdir(parents=True)
    lengths = {}
    for key, path in sorted(takes.items()):
        clip, sr = polish(path)
        wav = OUT / "tmp.wav"
        wavfile.write(wav, sr, (clip * 32767).astype(np.int16))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", str(target / f"{key}.mp3")], check=True)
        lengths[key] = round(len(clip) / sr * 1000)
    listed = {}
    if MANIFEST.exists():
        for row in MANIFEST.read_text(encoding="utf-8").splitlines():
            if row.startswith('  "') and '": {' in row:
                listed[row.split('"')[1]] = row
    listed[case] = f'  "{case}": {{ {", ".join(f"{json.dumps(k)}: {v}" for k, v in sorted(lengths.items()))} }},'
    MANIFEST.write_text(
        "// Made by art/voices.py: don't edit by hand. Every spoken line that has a recording, by case, as\n"
        "// voiceKey(speaker, text) → its length in milliseconds. The files are public/voices/<case>/<key>.mp3.\n"
        f"// {note}\n"
        "export const VOICE_LINES: Record<string, Record<string, number>> = {\n" + "\n".join(listed[c] for c in sorted(listed)) + "\n};\n",
        encoding="utf-8",
    )
    size = sum(f.stat().st_size for f in target.glob("*.mp3"))
    print(f"filed {len(lengths)} lines for {case}: {size / 1024:.0f} KB in {target}")


def keep(case: str) -> None:
    data = json.loads((OUT / case / "lines.json").read_text(encoding="utf-8"))
    takes, missing = {}, []
    for line in data["lines"]:
        path = (OUT / case / "narrator" / f"{line['key']}.wav") if line["speaker"] == "narrator" else take_for(case, line["key"])
        (takes.__setitem__(line["key"], path) if path.exists() else missing.append(line["key"]))
    if missing:
        print(f"{len(missing)} lines have no take yet: {', '.join(missing[:8])}")
    file_takes(case, takes, f"{case}: suspects in the voices cast by ear, each line acted in its mood (Chatterbox); narrator in Kokoro ({NARRATOR_VOICE}).")


def draft(case: str) -> None:
    """Every line in plain Kokoro on this PC, each suspect in the Kokoro voice behind their first candidate."""
    data = lines(case)
    folder = OUT / case / "draft"
    folder.mkdir(parents=True, exist_ok=True)
    voice = lambda speaker: NARRATOR_VOICE if speaker == "narrator" else next(v for v in CANDIDATES[case][speaker] if not v.startswith("take:"))
    jobs = [[speakable(line["text"]), voice(line["speaker"]), NARRATOR_SPEED if line["speaker"] == "narrator" else 1.0, str(folder / f"{line['key']}.wav")] for line in data["lines"]]
    kokoro(jobs)
    file_takes(case, {line["key"]: folder / f"{line['key']}.wav" for line in data["lines"]}, f"{case}: a stand-in, every line in plain Kokoro, until the cast voices are recorded.")


if __name__ == "__main__":
    command, *rest = sys.argv[1:]
    {"audition": audition, "wait": wait, "sheet": sheet, "record": record, "act": act, "reel": reel, "keep": keep, "draft": draft}[command](*rest)
