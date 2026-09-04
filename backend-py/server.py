"""
Backend de transcripción de audio.
- /api/audio-omr        → librosa pyin  (melodía simple, rápido)
- /api/audio-omr-full   → Demucs + pyin (orquestal, 2-5 min en CPU)
"""
import os
import tempfile
import subprocess
import numpy as np
import librosa
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ProPartitura — Audio OMR")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

PORT = int(os.getenv("PORT", 3002))
PYTHON = os.path.join(os.path.dirname(__file__), ".venv", "Scripts", "python.exe")

PITCH_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

def midi_to_pitch(midi: int) -> str:
    return f"{PITCH_NAMES[int(midi) % 12]}{int(midi) // 12 - 1}"

def secs_to_duration(secs: float, bpm: float) -> str:
    b = secs * (bpm / 60)
    if b >= 3.5:   return "whole"
    if b >= 1.75:  return "half"
    if b >= 0.875: return "quarter"
    if b >= 0.4:   return "eighth"
    return "sixteenth"

def transcribe_stem(audio_path: str, bpm: int = 120, max_sec: float = 30.0) -> list[dict]:
    """Transcribe un archivo de audio mono con librosa pyin."""
    y, sr = librosa.load(audio_path, sr=22050, duration=max_sec, mono=True)

    # Silencio — nada que transcribir
    if np.max(np.abs(y)) < 0.01:
        return []

    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units='frames', backtrack=True)
    onset_times  = librosa.frames_to_time(onset_frames, sr=sr)
    onset_times  = np.append(onset_times, librosa.get_duration(y=y, sr=sr))

    notes = []
    for i, t_start in enumerate(onset_times[:-1]):
        t_end = onset_times[i + 1]
        dur   = float(t_end - t_start)
        if dur < 0.05:
            continue
        seg = y[int(t_start * sr): int(t_end * sr)]
        if len(seg) < 256:
            continue
        try:
            f0, voiced, _ = librosa.pyin(
                seg, sr=sr,
                fmin=librosa.note_to_hz('C2'),
                fmax=librosa.note_to_hz('C7'),
                frame_length=min(2048, len(seg)),
            )
        except Exception:
            continue

        voiced_f0 = f0[voiced] if f0 is not None and voiced is not None else np.array([])
        if not len(voiced_f0):
            continue

        median_f0 = float(np.median(voiced_f0))
        if median_f0 <= 0:
            continue

        midi = int(round(librosa.hz_to_midi(median_f0)))
        if not (36 <= midi <= 96):
            continue

        notes.append({
            "pitch":    midi_to_pitch(midi),
            "duration": secs_to_duration(dur, bpm),
            "midi":     midi,
        })

    return notes[:32]


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    try:
        import demucs  # noqa: F401
        demucs_ok = True
    except ImportError:
        demucs_ok = False
    return {"status": "ok", "engine": "librosa", "omnizart": True, "demucs": demucs_ok}


@app.post("/api/audio-omr")
async def audio_omr(file: UploadFile = File(...), bpm: int = 120):
    """Transcripción simple: una voz, rápida."""
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        notes = transcribe_stem(tmp_path, bpm)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)

    if not notes:
        raise HTTPException(status_code=422, detail="No se detectaron notas en el audio.")
    return {"notes": notes, "engine": "librosa"}


@app.post("/api/audio-omr-full")
async def audio_omr_full(file: UploadFile = File(...), bpm: int = 120):
    """
    Transcripción orquestal:
    1. Demucs separa el audio en stems (melody, bass, other)
    2. librosa pyin transcribe cada stem
    3. Devuelve múltiples voces
    """
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    content = await file.read()

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, f"input{suffix}")
        with open(input_path, "wb") as f:
            f.write(content)

        # ── 1. Separación con Demucs ─────────────────────────────────────
        try:
            result = subprocess.run(
                [PYTHON, "-m", "demucs",
                 "--out", tmpdir,
                 "--name", "htdemucs",
                 "--two-stems", "other",   # separa: other (melodía) + bass+drums+vocals
                 input_path],
                capture_output=True, text=True, timeout=360,
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr[-500:])
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Demucs tardó demasiado (>6 min). Prueba con un audio más corto.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Demucs error: {e}")

        # ── 2. Localiza stems generados ──────────────────────────────────
        track_name = os.path.splitext(os.path.basename(input_path))[0]
        stem_dir   = os.path.join(tmpdir, "htdemucs", track_name)

        if not os.path.isdir(stem_dir):
            raise HTTPException(status_code=500, detail="Demucs no generó stems. Revisa el audio.")

        stem_files = {
            name: os.path.join(stem_dir, f"{name}.wav")
            for name in ("other", "no_other")
            if os.path.exists(os.path.join(stem_dir, f"{name}.wav"))
        }

        # ── 3. Transcribe cada stem ──────────────────────────────────────
        voices = []
        label_map = {"other": "Melodía / Cuerdas", "no_other": "Bajo / Armónica"}

        for stem_name, stem_path in stem_files.items():
            notes = transcribe_stem(stem_path, bpm, max_sec=30.0)
            if notes:
                voices.append({
                    "voice": label_map.get(stem_name, stem_name),
                    "notes": notes,
                })

        if not voices:
            raise HTTPException(status_code=422, detail="No se detectaron notas en ningún stem.")

        return {"voices": voices, "engine": "demucs+librosa"}
