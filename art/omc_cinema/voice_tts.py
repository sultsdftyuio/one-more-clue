"""Speaks lines with Kokoro (Apache-2.0). Runs inside art/.venv-voice.

    python voice_tts.py "<text>" <voice> <speed> <out.wav>
    python voice_tts.py --batch <jobs.json>      # [[text, voice, speed, out], ...], loading the model once
"""
import json
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

pipelines = {}


def speak(text, voice, speed, out):
    # British voices start with "b", American with "a".
    if voice[0] not in pipelines:
        pipelines[voice[0]] = KPipeline(lang_code=voice[0], repo_id="hexgrad/Kokoro-82M")
    chunks = [np.asarray(audio) for _, _, audio in pipelines[voice[0]](text, voice=voice, speed=speed)]
    sf.write(out, np.concatenate(chunks), 24000)


if sys.argv[1] == "--batch":
    with open(sys.argv[2], encoding="utf-8") as jobs:
        for text, voice, speed, out in json.load(jobs):
            speak(text, voice, speed, out)
else:
    speak(sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4])
