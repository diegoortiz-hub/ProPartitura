"""
Backend de transcripción de audio usando librosa (detección de pitch + onset).
Mejor que autocorrelación manual; no requiere TensorFlow ni madmom.
Compatible con Python 3.12+.
"""
import os
import tempfile
import numpy as np
import librosa
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ProPartitura — Audio OMR (librosa)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

PORT = int(os.getenv("PORT", 3002))

PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def midi_to_pitch(midi: int) -> str:
    return f"{PITCH_NAMES[int(midi) % 12]}{int(midi) // 12 - 1}"

def secs_to_duration(secs: float, bpm: float) -> str:
    beats = secs * (bpm / 60)
    if beats >= 3.5:   return "whole"
    if beats >= 1.75:  return "half"
    if beats >= 0.875: return "quarter"
    if beats >= 0.4:   return "eighth"
    return "sixteenth"

def transcribe(audio_path: str, bpm: int = 120) -> list[dict]:
    # Carga y resamplea a 22050 Hz, máx 30 seg
    y, sr = librosa.load(audio_path, sr=22050, duration=30.0, mono=True)

    # Detección de onsets (cuándo empieza cada nota)
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units='frames', backtrack=True)
    onset_times  = librosa.frames_to_time(onset_frames, sr=sr)

    # Añade el final del audio como último onset
    onset_times = np.append(onset_times, librosa.get_duration(y=y, sr=sr))

    notes = []
    for i, t_start in enumerate(onset_times[:-1]):
        t_end = onset_times[i + 1]
        dur   = float(t_end - t_start)
        if dur < 0.05:
            continue

        # Extrae el segmento y calcula el pitch dominante via pyin
        seg_start = int(t_start * sr)
        seg_end   = int(t_end * sr)
        seg = y[seg_start:seg_end]

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

        # Toma la mediana de los frames con pitch detectado
        voiced_f0 = f0[voiced] if f0 is not None and voiced is not None else np.array([])
        if not len(voiced_f0):
            continue

        median_f0 = float(np.median(voiced_f0))
        if median_f0 <= 0:
            continue

        midi = int(round(librosa.hz_to_midi(median_f0)))
        if not (36 <= midi <= 96):   # C2–C7
            continue

        notes.append({
            "pitch":    midi_to_pitch(midi),
            "duration": secs_to_duration(dur, bpm),
            "midi":     midi,
        })

    return notes[:32]


@app.get("/api/health")
def health():
    return {"status": "ok", "engine": "librosa", "omnizart": True}

@app.post("/api/audio-omr")
async def audio_omr(file: UploadFile = File(...), bpm: int = 120):
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        notes = transcribe(tmp_path, bpm)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)

    if not notes:
        raise HTTPException(status_code=422, detail="No se detectaron notas en el audio.")

    return {"notes": notes, "engine": "librosa"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
