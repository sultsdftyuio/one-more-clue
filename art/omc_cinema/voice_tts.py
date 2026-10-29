"""Speaks one narrator line with Kokoro (Apache-2.0). Runs inside art/.venv-voice.

    python voice_tts.py "<text>" <voice> <speed> <out.wav>
"""
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

text, voice, speed, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
# British voices start with "b", American with "a".
pipeline = KPipeline(lang_code=voice[0], repo_id="hexgrad/Kokoro-82M")
chunks = [np.asarray(audio) for _, _, audio in pipeline(text, voice=voice, speed=speed)]
sf.write(out, np.concatenate(chunks), 24000)
