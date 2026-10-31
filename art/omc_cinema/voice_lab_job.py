"""The Kaggle side of the voice lab: runs each take on the GPU and checks it. voice_lab.py fills in ASSETS and JOBS."""
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
    (TMP / f"{name}.mp3").write_bytes(base64.b64decode(data))
    run(f"ffmpeg -y -loglevel error -i {TMP}/{name}.mp3 -ar 24000 -ac 1 {TMP}/{name}.wav")
for job in JOBS:
    job["path"] = str(OUT / job["file"])
    if "ref" in job:
        job["ref"] = f"{TMP}/{job['ref']}.wav"
run("python -m pip install -q uv")
run("apt-get install -y -q sox libsox-dev > /dev/null 2>&1", must=False)

# Chatterbox copies a voice from a reference clip and acts on a dial. Helpers must not be named after what they import.
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
batch = [j for j in JOBS if j["engine"] == "chatterbox"]
if batch:
    (TMP / "run_chatterbox.py").write_text(RUN_CHATTERBOX)
    (TMP / "cb.json").write_text(json.dumps(batch))
    py = f"{TMP}/cb/bin/python"
    run(f"uv venv --python 3.11 {TMP}/cb")
    # Without setuptools the watermark library quietly turns into None, and Chatterbox crashes on it.
    run(f"uv pip install -q --python {py} chatterbox-tts 'setuptools<81' matplotlib")
    run(f"{py} -c 'import perth.perth_net.perth_net_implicit.perth_watermarker'")
    run(f"{py} {TMP}/run_chatterbox.py {TMP}/cb.json", must=False)

# Qwen3-TTS designs a voice from a written description.
RUN_QWEN = textwrap.dedent("""
    import json, sys
    import soundfile as sf, torch
    from qwen_tts import Qwen3TTSModel
    model = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa")
    for job in json.load(open(sys.argv[1])):
        torch.manual_seed(7)
        wavs, sr = model.generate_voice_design(text=job["text"], language="English", instruct=job["instruct"])
        sf.write(job["path"], wavs[0], sr)
        print(job["file"], flush=True)
""")
batch = [j for j in JOBS if j["engine"] == "qwen"]
if batch:
    (TMP / "run_qwen.py").write_text(RUN_QWEN)
    (TMP / "qw.json").write_text(json.dumps(batch))
    py = f"{TMP}/qw/bin/python"
    run(f"uv venv --python 3.12 {TMP}/qw")
    run(f"uv pip install -q --python {py} torch==2.6.0 torchaudio==2.6.0 qwen-tts")
    run(f"{py} {TMP}/run_qwen.py {TMP}/qw.json", must=False)

# What a reviewer who can't hear can still check: are the words right, and does the voice move?
RUN_MEASURE = textwrap.dedent("""
    import glob, json, os
    import numpy as np, librosa
    from faster_whisper import WhisperModel
    asr = WhisperModel("base.en", device="cpu", compute_type="int8")
    report = {}
    for f in sorted(glob.glob("/kaggle/working/takes/*.wav")):
        y, sr = librosa.load(f, sr=24000, mono=True)
        heard = " ".join(s.text.strip() for s in asr.transcribe(f, language="en")[0])
        f0 = librosa.pyin(y, fmin=60, fmax=500, sr=sr, frame_length=2048)[0]
        f0 = f0[~np.isnan(f0)]
        semis = 12 * np.log2(f0 / np.median(f0)) if len(f0) else np.zeros(1)
        report[os.path.basename(f)] = {"seconds": round(len(y) / sr, 2), "pitch_hz": round(float(np.median(f0)), 0) if len(f0) else 0,
            "pitch_range": round(float(np.percentile(semis, 95) - np.percentile(semis, 5)), 1), "heard": heard}
    json.dump(report, open("/kaggle/working/takes/report.json", "w"), indent=1)
""")
(TMP / "run_measure.py").write_text(RUN_MEASURE)
py = f"{TMP}/an/bin/python"
run(f"uv venv --python 3.11 {TMP}/an")
run(f"uv pip install -q --python {py} faster-whisper librosa soundfile")
run(f"{py} {TMP}/run_measure.py", must=False)
print("\nmade:", len(list(OUT.glob("*.wav"))), "of", len(JOBS), flush=True)
