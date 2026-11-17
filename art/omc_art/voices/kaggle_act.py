"""The Kaggle side of `voices.py act`: records a case's lines with feeling, in two stages, on the GPU.

1. Each character's chosen voice reads a short speech in character, twice, and the livelier read whose
   words came out right becomes that character's reference. Chatterbox copies a reference's delivery as well
   as its voice, so a flat reference gives flat lines however hard it's pushed.
2. Every line is read in its own mood (its own exaggeration and pacing), a few times with different seeds,
   and the take kept is the one that moves most while saying the right words, as <key>.wav.

voices.py fills in ASSETS (the voices' clips), WARMUPS and LINES before it's sent.
"""
import base64
import json
import pathlib
import shutil
import subprocess
import textwrap
import time

OUT = pathlib.Path("/kaggle/working/takes")
OUT.mkdir(parents=True, exist_ok=True)
TMP = pathlib.Path("/tmp/omc")
TMP.mkdir(parents=True, exist_ok=True)
ASSETS = __ASSETS__
WARMUPS = __WARMUPS__
LINES = __LINES__


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
run("python -m pip install -q uv")

SPEAK = textwrap.dedent("""
    import json, sys
    import torch, torchaudio as ta
    from chatterbox.tts import ChatterboxTTS
    model = ChatterboxTTS.from_pretrained(device="cuda")
    for job in json.load(open(sys.argv[1])):
        torch.manual_seed(job["seed"])
        wav = model.generate(job["say"], audio_prompt_path=job["ref"], exaggeration=job["exaggeration"], cfg_weight=job["cfg"])
        ta.save(job["path"], wav, model.sr)
        print(job["path"], flush=True)
""")

# Which take to keep: the words must come out right, then the one whose pitch and loudness move most wins,
# within reason (a squeak or a long babble loses).
JUDGE = textwrap.dedent('''
    import difflib, json, re, sys
    import numpy as np, librosa
    from faster_whisper import WhisperModel
    asr = WhisperModel("base.en", device="cpu", compute_type="int8")
    words = lambda s: re.sub(r"[^a-z0-9' ]+", " ", s.lower().replace("-", " ")).split()
    import os
    groups = json.load(open(sys.argv[1]))
    chosen = {}
    report = json.load(open(sys.argv[2])) if os.path.exists(sys.argv[2]) else {}
    for name, takes in groups.items():
        best, best_score = None, -1e9
        for take in takes:
            if not os.path.exists(take["path"]):
                continue
            y, sr = librosa.load(take["path"], sr=24000, mono=True)
            heard = " ".join(s.text.strip() for s in asr.transcribe(take["path"], language="en")[0])
            match = difflib.SequenceMatcher(None, words(take["say"]), words(heard)).ratio()
            try:
                f0 = librosa.pyin(y, fmin=60, fmax=600, sr=sr, frame_length=2048)[0]
                f0 = f0[~np.isnan(f0)]
            except Exception:
                f0 = np.zeros(0)
            semis = 12 * np.log2(f0 / np.median(f0)) if len(f0) > 10 else np.zeros(1)
            pitch = float(np.percentile(semis, 95) - np.percentile(semis, 5))
            rms = librosa.feature.rms(y=y)[0]
            loud = 20 * np.log10(rms[rms > rms.max() * 0.05] + 1e-6)
            swing = float(np.std(loud)) if len(loud) else 0.0
            seconds = len(y) / sr
            per_word = seconds / max(1, len(words(take["say"])))
            penalty = 0 if match >= 0.85 else 20 + 60 * (0.85 - match)
            score = min(pitch, 14) + 0.4 * swing - penalty - (10 if per_word > 0.9 or per_word < 0.15 else 0)
            report[take["path"].split("/")[-1]] = {"heard": heard, "match": round(match, 2), "pitch": round(pitch, 1), "swing": round(swing, 1), "seconds": round(seconds, 2), "score": round(score, 1)}
            if score > best_score:
                best, best_score = take["path"], score
        chosen[name] = best
        print(name, "->", best and best.split("/")[-1], round(best_score, 1), flush=True)
    json.dump(chosen, open(sys.argv[3], "w"), indent=1)
    json.dump(report, open(sys.argv[2], "w"), indent=1)
''')
(TMP / "speak.py").write_text(SPEAK)
(TMP / "judge.py").write_text(JUDGE)

cb = f"{TMP}/cb/bin/python"
run(f"uv venv --python 3.11 {TMP}/cb")
# Without setuptools the watermark library quietly turns into None, and Chatterbox crashes on it.
run(f"uv pip install -q --python {cb} chatterbox-tts 'setuptools<81' matplotlib")
run(f"{cb} -c 'import perth.perth_net.perth_net_implicit.perth_watermarker'")
an = f"{TMP}/an/bin/python"
run(f"uv venv --python 3.11 {TMP}/an")
run(f"uv pip install -q --python {an} faster-whisper librosa soundfile")
REPORT = OUT / "report.json"

# 1. Each character reads their speech in their chosen voice; the best read becomes their reference.
jobs, groups = [], {}
for speaker, warm in WARMUPS.items():
    for seed in warm["seeds"]:
        path = str(OUT / f"ref-{speaker}-s{seed}.wav")
        job = {"say": warm["say"], "ref": f"{TMP}/{warm['voice']}.wav", "exaggeration": warm["exaggeration"], "cfg": warm["cfg"], "seed": seed, "path": path}
        jobs.append(job)
        groups.setdefault(speaker, []).append(job)
(TMP / "warm.json").write_text(json.dumps(jobs))
(TMP / "warm-groups.json").write_text(json.dumps(groups))
run(f"{cb} {TMP}/speak.py {TMP}/warm.json")
run(f"{an} {TMP}/judge.py {TMP}/warm-groups.json {REPORT} {TMP}/warm-chosen.json")
references = json.loads((TMP / "warm-chosen.json").read_text())
for speaker, path in references.items():
    shutil.copy(path, OUT / f"ref-{speaker}.wav")

# 2. Every line in its own mood, from the character's new reference.
jobs, groups = [], {}
for line in LINES:
    for seed in line["seeds"]:
        path = str(OUT / f"{line['key']}-s{seed}.wav")
        job = {"say": line["say"], "ref": references[line["speaker"]], "exaggeration": line["exaggeration"], "cfg": line["cfg"], "seed": seed, "path": path}
        jobs.append(job)
        groups.setdefault(line["key"], []).append(job)
(TMP / "lines.json").write_text(json.dumps(jobs))
(TMP / "line-groups.json").write_text(json.dumps(groups))
run(f"{cb} {TMP}/speak.py {TMP}/lines.json", must=False)
run(f"{an} {TMP}/judge.py {TMP}/line-groups.json {REPORT} {TMP}/line-chosen.json")
for key, path in json.loads((TMP / "line-chosen.json").read_text()).items():
    if path:
        shutil.copy(path, OUT / f"{key}.wav")
print("\nkept:", len(list(OUT.glob("*.wav"))), "files for", len(LINES), "lines", flush=True)
