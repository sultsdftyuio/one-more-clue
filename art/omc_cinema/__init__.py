"""One More Clue - cinematic renderer.

Each case's opening film is drawn frame by frame with Skia, finished with a
film look in numpy (bloom, halation, grade, grain), scored with synthesised
sound and a narrator, and encoded with ffmpeg. Films are vertical (1080 x
1920) because players watch them on their phones.

    python -m omc_cinema.case001_film stills     # check the risky moments first
    python -m omc_cinema.case001_film draft      # quick low-res film
    python -m omc_cinema.case001_film            # the 720 x 1280 game copy
    python -m omc_cinema.case001_film master     # 1080 x 1920, for trailers

Needs ffmpeg on the PATH. The narrator is Kokoro (Apache-2.0), which needs
torch, so it lives in its own environment that voice.py calls:

    python -m venv .venv-voice
    .venv-voice/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
    .venv-voice/Scripts/python -m pip install kokoro soundfile
"""
