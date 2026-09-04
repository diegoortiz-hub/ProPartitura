"""
Backend de transcripción de audio — pipeline por capas.

Capa 1: Demucs       — separación de fuentes (stem "other" = melodía)
Capa 2: Detección    — tonalidad (Krumhansl-Schmuckler) + tempo + compás
Capa 3: pyin         — pitch tracking monofónico por stem
Capa 4: Cuantización — snap onsets a la cuadrícula de beats
Capa 5: Limpieza     — elimina ruido, outliers de octava, notas repetidas
Capa 6: Salida       — { notes, key, mode, keySignature, timeSignature, tempo }
"""
import os
import tempfile
import subprocess
import numpy as np
import librosa
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ProPartitura — Audio OMR")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

PYTHON     = os.path.join(os.path.dirname(__file__), ".venv", "Scripts", "python.exe")
NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

# Perfiles de Krumhansl-Schmuckler
_MAJOR = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
_MINOR = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])

# Armaduras canónicas
_KEY_SIG: dict[str, dict] = {
    "C major":  {"flats": [],                 "sharps": []},
    "G major":  {"flats": [],                 "sharps": ["F"]},
    "D major":  {"flats": [],                 "sharps": ["F","C"]},
    "A major":  {"flats": [],                 "sharps": ["F","C","G"]},
    "E major":  {"flats": [],                 "sharps": ["F","C","G","D"]},
    "B major":  {"flats": [],                 "sharps": ["F","C","G","D","A"]},
    "F major":  {"flats": ["B"],              "sharps": []},
    "Bb major": {"flats": ["B","E"],          "sharps": []},
    "Eb major": {"flats": ["B","E","A"],      "sharps": []},
    "Ab major": {"flats": ["B","E","A","D"],  "sharps": []},
    "A minor":  {"flats": [],                 "sharps": []},
    "E minor":  {"flats": [],                 "sharps": ["F"]},
    "B minor":  {"flats": [],                 "sharps": ["F","C"]},
    "F# minor": {"flats": [],                 "sharps": ["F","C","G"]},
    "D minor":  {"flats": ["B"],              "sharps": []},
    "G minor":  {"flats": ["B","E"],          "sharps": []},
    "C minor":  {"flats": ["B","E","A"],      "sharps": []},
    "F minor":  {"flats": ["B","E","A","D"],  "sharps": []},
}

# ─── Helpers ─────────────────────────────────────────────────────────────────

def midi_to_pitch(midi: int) -> str:
    return f"{NOTE_NAMES[int(midi) % 12]}{int(midi) // 12 - 1}"

def beats_to_duration(beats: float) -> str:
    if beats >= 3.5:   return "whole"
    if beats >= 1.75:  return "half"
    if beats >= 0.875: return "quarter"
    if beats >= 0.4:   return "eighth"
    return "sixteenth"

# ─── Capa 2: Tonalidad + Tempo + Compás ──────────────────────────────────────

def detect_key(y: np.ndarray, sr: int) -> tuple[str, str, dict]:
    chroma      = librosa.feature.chroma_cqt(y=y, sr=sr)
    mean_chroma = np.mean(chroma, axis=1)
    best_key, best_mode, best_corr = 0, "major", -np.inf
    for i in range(12):
        rot = np.roll(mean_chroma, -i)
        for profile, mode in [(_MAJOR, "major"), (_MINOR, "minor")]:
            corr = float(np.corrcoef(rot, profile)[0, 1])
            if corr > best_corr:
                best_corr, best_key, best_mode = corr, i, mode
    key_name  = NOTE_NAMES[best_key]
    label     = f"{key_name} {best_mode}"
    key_sig   = _KEY_SIG.get(label, {"flats": [], "sharps": []})
    return key_name, best_mode, key_sig

def detect_tempo_and_beats(y: np.ndarray, sr: int) -> tuple[float, np.ndarray]:
    tempo_arr, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units='frames')
    tempo       = float(tempo_arr)
    beat_times  = librosa.frames_to_time(beat_frames, sr=sr)
    return tempo, beat_times

def detect_meter(y: np.ndarray, sr: int, tempo: float) -> str:
    """Estima compás: 3/4, 2/4 o 4/4 vía autocorrelación de onset strength."""
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    ac        = librosa.autocorrelate(onset_env, max_size=sr // 64)
    fps       = sr / 512.0
    beat_lag  = int(round(fps * 60.0 / tempo))

    def strength_at(n: int) -> float:
        lag = beat_lag * n
        return float(ac[lag]) if lag < len(ac) else 0.0

    s3, s4 = strength_at(3), strength_at(4)
    if s3 > s4 * 1.15:
        return "3/4"
    return "4/4"

# ─── Capa 3+4: pyin + cuantización ───────────────────────────────────────────

def _snap_to_grid(t: float, beat_times: np.ndarray, beat_dur: float, subs: int = 4) -> float:
    if len(beat_times) == 0:
        return t
    sub = beat_dur / subs
    nearest = beat_times[np.argmin(np.abs(beat_times - t))]
    offset  = t - nearest
    return float(nearest + round(offset / sub) * sub)

def transcribe_stem(
    audio_path: str,
    beat_times: np.ndarray,
    beat_dur: float,
    max_sec: float = 60.0,
) -> list[dict]:
    y, sr = librosa.load(audio_path, sr=22050, duration=max_sec, mono=True)
    if np.max(np.abs(y)) < 0.01:
        return []

    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units='frames', backtrack=True)
    onset_times  = librosa.frames_to_time(onset_frames, sr=sr)
    onset_times  = np.append(onset_times, librosa.get_duration(y=y, sr=sr))

    raw: list[dict] = []
    for i, t_start in enumerate(onset_times[:-1]):
        t_end   = onset_times[i + 1]
        raw_dur = float(t_end - t_start)
        if raw_dur < 0.05:
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

        # Snap onset to beat grid
        q_start = _snap_to_grid(t_start, beat_times, beat_dur)
        # Duration in beats → note value
        dur_beats = raw_dur / beat_dur
        duration  = beats_to_duration(dur_beats)

        raw.append({"pitch": midi_to_pitch(midi), "duration": duration, "midi": midi, "_dur": raw_dur})

    return raw

# ─── Capa 5: Limpieza ─────────────────────────────────────────────────────────

def clean_notes(notes: list[dict], beat_dur: float) -> list[dict]:
    if not notes:
        return notes

    # Eliminar outliers de octava (± 2 oct desde mediana)
    midis = [n["midi"] for n in notes]
    median_midi = float(np.median(midis))
    notes = [n for n in notes if abs(n["midi"] - median_midi) <= 24]

    # Eliminar notas demasiado cortas (< 1/16 del beat)
    min_dur = beat_dur * 0.2
    notes   = [n for n in notes if n.get("_dur", 1.0) >= min_dur]

    # Unir notas consecutivas del mismo pitch (posibles ligaduras)
    merged: list[dict] = []
    for n in notes:
        if merged and merged[-1]["midi"] == n["midi"] and merged[-1]["duration"] == n["duration"]:
            continue  # skip duplicate
        merged.append(n)

    # Limpiar campo interno
    return [{"pitch": n["pitch"], "duration": n["duration"], "midi": n["midi"]} for n in merged[:32]]

# ─── Transcripción simple (endpoint /api/audio-omr) ──────────────────────────

def transcribe_simple(audio_path: str, bpm: int = 120) -> list[dict]:
    """Transcripción rápida sin Demucs, con cuantización básica."""
    y, sr        = librosa.load(audio_path, sr=22050, duration=30.0, mono=True)
    tempo, beats = detect_tempo_and_beats(y, sr)
    beat_dur     = 60.0 / (tempo if tempo > 0 else bpm)
    beat_times   = beats
    notes        = transcribe_stem(audio_path, beat_times, beat_dur, max_sec=30.0)
    return clean_notes(notes, beat_dur)

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
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        notes = transcribe_simple(tmp_path, bpm)
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
    Pipeline orquestal de 6 capas:
    1. Trim 60 s  2. Demucs  3. Key+Tempo  4. pyin  5. Cuantización  6. Limpieza
    """
    suffix  = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    content = await file.read()

    with tempfile.TemporaryDirectory() as tmpdir:
        raw_path   = os.path.join(tmpdir, f"raw{suffix}")
        input_path = os.path.join(tmpdir, "input.wav")

        with open(raw_path, "wb") as f:
            f.write(content)

        # ── Capa 1: Recortar a 60 s y convertir a WAV ────────────────────
        try:
            y_full, sr_full = librosa.load(raw_path, sr=None, mono=False, duration=60.0)
            sf.write(input_path, y_full.T if y_full.ndim > 1 else y_full, sr_full)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"No se pudo leer el audio: {e}")

        # ── Capa 2: Detectar tonalidad, tempo y compás ───────────────────
        y_mono, sr_mono = librosa.load(input_path, sr=22050, mono=True)
        key_name, mode, key_sig = detect_key(y_mono, sr_mono)
        tempo, beat_times       = detect_tempo_and_beats(y_mono, sr_mono)
        time_sig                = detect_meter(y_mono, sr_mono, tempo)
        beat_dur                = 60.0 / max(tempo, 40.0)

        # ── Capa 1b: Demucs — separar fuentes ────────────────────────────
        try:
            proc = subprocess.run(
                [PYTHON, "-m", "demucs",
                 "--out", tmpdir,
                 "--name", "htdemucs",
                 "--two-stems", "other",
                 input_path],
                capture_output=True, text=True, timeout=360,
            )
            if proc.returncode != 0:
                raise RuntimeError(proc.stderr[-600:])
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Demucs tardó demasiado. El audio (60 s) no pudo procesarse.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Demucs error: {e}")

        track_name = os.path.splitext(os.path.basename(input_path))[0]
        stem_dir   = os.path.join(tmpdir, "htdemucs", track_name)
        if not os.path.isdir(stem_dir):
            raise HTTPException(status_code=500, detail="Demucs no generó stems.")

        stem_files = {
            name: os.path.join(stem_dir, f"{name}.wav")
            for name in ("other", "no_other")
            if os.path.exists(os.path.join(stem_dir, f"{name}.wav"))
        }

        # ── Capas 3-5: pyin + cuantización + limpieza por stem ───────────
        label_map = {"other": "Melodía / Cuerdas", "no_other": "Bajo / Armónica"}
        voices = []
        for stem_name, stem_path in stem_files.items():
            raw   = transcribe_stem(stem_path, beat_times, beat_dur, max_sec=60.0)
            clean = clean_notes(raw, beat_dur)
            if clean:
                voices.append({"voice": label_map.get(stem_name, stem_name), "notes": clean})

        if not voices:
            raise HTTPException(status_code=422, detail="No se detectaron notas en ningún stem.")

        # ── Capa 6: Respuesta estructurada ───────────────────────────────
        return {
            "voices":        voices,
            "engine":        "demucs+librosa",
            "key":           key_name,
            "mode":          mode,
            "keyLabel":      f"{key_name} {mode}",
            "keySignature":  key_sig,
            "timeSignature": time_sig,
            "tempo":         round(tempo),
        }
