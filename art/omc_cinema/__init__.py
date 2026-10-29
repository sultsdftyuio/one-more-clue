"""One More Clue - cinematic renderer.

Each case's opening film is drawn frame by frame with Skia, finished with a
film look in numpy (bloom, halation, grade, grain), scored with synthesised
sound and a narrator, and encoded with ffmpeg. Films are vertical (1080 x
1920) because players watch them on their phones.

    python -m omc_cinema.case001 preview     # the 3-second style test

Needs ffmpeg on the PATH. The narrator is Kokoro (Apache-2.0), which needs
torch, so it lives in its own environment that voice.py calls:

    python -m venv .venv-voice
    .venv-voice/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
    .venv-voice/Scripts/python -m pip install kokoro soundfile
"""
