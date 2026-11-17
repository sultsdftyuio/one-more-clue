"""The Kaggle side of art/voices.py: speaks each line in Chatterbox on the GPU, then checks the words with Whisper.
voices.py fills in ASSETS (reference clips) and JOBS before it's sent."""
import base64
import json
import pathlib
import subprocess
import textwrap
import time

OUT = pathlib.Path("/kaggle/working/takes")
OUT.mkdir(parents=True, exist_ok=True)
TMP = pathlib.Path("/tmp/omc")
TMP.mkdir(parents=True, exist_ok=True)
ASSETS = __ASSETS__
JOBS = __JOBS__


def run(cmd, must=True):
    print(f"\n$ {cmd}", flush=True)
    t = time.time()
    done = subprocess.run(cmd, shell=True)
    print(f"[{time.time() - t:.0f}s, exit {done.returncode}]", flush=True)
    if must and done.returncode:
        raise SystemExit(done.returncode)
    return done.returncode == 0


for name, data in ASSETS.items():
    (TMP / f"{name}.ogg").write_bytes(base64.b64decode(data))
    run(f"ffmpeg -y -loglevel error -i {TMP}/{name}.ogg -ar 24000 -ac 1 {TMP}/{name}.wav")
for job in JOBS:
    job["path"] = str(OUT / job["file"])
    job["ref"] = f"{TMP}/{job['ref']}.wav"
run("python -m pip install -q uv")

# Chatterbox copies a voice from a reference clip, so a character sounds the same in every line.
RUN_CHATTERBOX = textwrap.dedent("""
    import json, sys
    import torch, torchaudio as ta
    from chatterbox.tts import ChatterboxTTS
    model = ChatterboxTTS.from_pretrained(device="cuda")
    for job in json.load(open(sys.argv[1])):
        torch.manual_seed(job.get("seed", 7))
        wav = model.generate(job["text"], audio_prompt_path=job["ref"], exaggeration=job["exaggeration"], cfg_weight=job["cfg"])
        ta.save(job["path"], wav, model.sr)
        print(job["file"], flush=True)
""")
(TMP / "run_chatterbox.py").write_text(RUN_CHATTERBOX)
(TMP / "cb.json").write_text(json.dumps(JOBS))
py = f"{TMP}/cb/bin/python"
run(f"uv venv --python 3.11 {TMP}/cb")
# Without setuptools the watermark library quietly turns into None, and Chatterbox crashes on it.
run(f"uv pip install -q --python {py} chatterbox-tts 'setuptools<81' matplotlib")
run(f"{py} -c 'import perth.perth_net.perth_net_implicit.perth_watermarker'")
run(f"{py} {TMP}/run_chatterbox.py {TMP}/cb.json", must=False)

# What a reviewer who can't hear can still check: are the words right, and how long is each take?
RUN_MEASURE = textwrap.dedent("""
    import glob, json, os
    import librosa
    from faster_whisper import WhisperModel
    asr = WhisperModel("base.en", device="cpu", compute_type="int8")
    report = {}
    for f in sorted(glob.glob("/kaggle/working/takes/*.wav")):
        y, sr = librosa.load(f, sr=24000, mono=True)
        heard = " ".join(s.text.strip() for s in asr.transcribe(f, language="en")[0])
        report[os.path.basename(f)] = {"seconds": round(len(y) / sr, 2), "heard": heard}
    json.dump(report, open("/kaggle/working/takes/report.json", "w"), indent=1)
""")
(TMP / "run_measure.py").write_text(RUN_MEASURE)
py = f"{TMP}/an/bin/python"
run(f"uv venv --python 3.11 {TMP}/an")
run(f"uv pip install -q --python {py} faster-whisper librosa soundfile")
run(f"{py} {TMP}/run_measure.py", must=False)
print("\nmade:", len(list(OUT.glob("*.wav"))), "of", len(JOBS), flush=True)
