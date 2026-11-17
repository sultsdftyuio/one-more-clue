"""Speaks lines with Kokoro (Apache-2.0). Runs inside art/.venv-voice, which has the model.

    python kokoro_tts.py <jobs.json>      # [[text, voice, speed, out.wav], ...], loading the model once
"""
import json
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

pipelines = {}
with open(sys.argv[1], encoding="utf-8") as jobs:
    for text, voice, speed, out in json.load(jobs):
        # British voices start with "b", American ones with "a".
        if voice[0] not in pipelines:
            pipelines[voice[0]] = KPipeline(lang_code=voice[0], repo_id="hexgrad/Kokoro-82M")
        chunks = [np.asarray(audio) for _, _, audio in pipelines[voice[0]](text, voice=voice, speed=speed)]
        sf.write(out, np.concatenate(chunks), 24000)
        print(out, flush=True)
