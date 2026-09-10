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
import threading
import uuid
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

# ─── Modelo MT3 en memoria ───────────────────────────────────────────────────
# Cargar el checkpoint de 175 MB tarda ~43 s; la inferencia solo ~1 s.
# Se carga una vez al arrancar (en background) y se reutiliza en cada petición.
_mt3_model = None
_mt3_error: str | None = None
_mt3_lock = threading.Lock()


def get_mt3_model():
    """Devuelve el modelo MR-MT3 cargado, cargándolo si hace falta."""
    global _mt3_model, _mt3_error
    if _mt3_model is not None:
        return _mt3_model
    with _mt3_lock:
        if _mt3_model is not None:
            return _mt3_model
        try:
            import mt3_infer
            _mt3_model = mt3_infer.load_model("mr_mt3", device="cpu", cache=True)
            _mt3_error = None
        except Exception as e:
            _mt3_error = f"{type(e).__name__}: {e}"
            raise
    return _mt3_model


_PT_CKPT = os.path.join(
    os.path.expanduser("~"),
    "piano_transcription_inference_data",
    "note_F1=0.9677_pedal_F1=0.9186.pth",
)
_PT_URL = ("https://zenodo.org/record/4034264/files/"
           "CRNN_note_F1%3D0.9677_pedal_F1%3D0.9186.pth?download=1")
_pt_model = None
_pt_lock = threading.Lock()


def ensure_pt_checkpoint() -> bool:
    """
    Descarga el checkpoint del CNN si falta.

    La librería lo baja con `os.system('wget ...')`, que no existe en Windows y
    tampoco está garantizado en una imagen mínima de servidor. Se hace con
    urllib para que funcione en cualquier sitio donde corra Python.
    """
    if os.path.exists(_PT_CKPT) and os.path.getsize(_PT_CKPT) > 100 * 1024 * 1024:
        return True
    os.makedirs(os.path.dirname(_PT_CKPT), exist_ok=True)
    try:
        import urllib.request
        tmp = _PT_CKPT + ".part"
        print("[CNN] descargando checkpoint (~165 MB)...")
        urllib.request.urlretrieve(_PT_URL, tmp)
        os.replace(tmp, _PT_CKPT)
        print("[CNN] checkpoint listo")
        return True
    except Exception as e:
        print(f"[CNN] no se pudo descargar el checkpoint: {e}")
        return False


def get_pt_model():
    """Modelo CNN cacheado. Feed-forward: coste lineal, ~0.85x tiempo real."""
    global _pt_model
    if _pt_model is not None:
        return _pt_model
    with _pt_lock:
        if _pt_model is not None:
            return _pt_model
        if not ensure_pt_checkpoint():
            raise RuntimeError("Falta el checkpoint del transcriptor CNN.")
        from piano_transcription_inference import PianoTranscription
        _pt_model = PianoTranscription(device="cpu", checkpoint_path=_PT_CKPT)
    return _pt_model


@app.on_event("startup")
def _warm_models():
    """
    Precarga el motor por defecto en background.

    Se precarga el CNN y **no** MT3: el CNN carga en ~4 s y ocupa poco, mientras
    que MT3 tarda ~43 s y se lleva unos 400 MB. En un servidor modesto no tiene
    sentido reservar esa memoria para un motor opcional, así que MT3 se carga
    solo si alguien lo pide de verdad.
    """
    def _load():
        try:
            get_pt_model()
            print("[CNN] transcriptor listo en memoria")
        except Exception as e:
            print(f"[CNN] fallo al precargar: {e}")
    threading.Thread(target=_load, daemon=True).start()

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
    # librosa devuelve un array; float() sobre él lanza TypeError
    tempo       = float(np.atleast_1d(tempo_arr)[0])
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

def _ql_to_duration(ql: float) -> str:
    if ql >= 3.5:   return "whole"
    if ql >= 1.75:  return "half"
    if ql >= 0.875: return "quarter"
    if ql >= 0.4:   return "eighth"
    return "sixteenth"

def _parse_mxl_music21(xml_path: str) -> list:
    import music21
    score = music21.converter.parse(xml_path)
    parts = score.parts
    if not parts:
        return []
    from notation import element_pitches
    treble = parts[0]
    notes_out = []
    for el in treble.flatten().notesAndRests:
        if el.isRest:
            continue
        pitches = element_pitches(el)
        if not pitches:
            continue
        highest = max(pitches, key=lambda p: p.midi)
        pitch_str, midi = highest.nameWithOctave, highest.midi
        if not (48 <= midi <= 96):
            continue
        duration = _ql_to_duration(float(el.duration.quarterLength))
        notes_out.append({"pitch": pitch_str, "duration": duration, "midi": midi})
    return notes_out[:64]


@app.post("/api/omr-image")
async def omr_image(file: UploadFile = File(...)):
    """OMR de imagen con Oemer (deep learning) + music21 para parsear MusicXML."""
    import shutil, sys
    suffix = os.path.splitext(file.filename or "score.png")[1] or ".png"
    content = await file.read()

    with tempfile.TemporaryDirectory() as tmpdir:
        img_path = os.path.join(tmpdir, f"score{suffix}")
        out_dir  = os.path.join(tmpdir, "out")
        os.makedirs(out_dir, exist_ok=True)
        with open(img_path, "wb") as f:
            f.write(content)

        # Llamar oemer via su ejecutable (oemer.exe en Windows)
        oemer_exe = os.path.join(os.path.dirname(sys.executable), "oemer.exe")
        if not os.path.exists(oemer_exe):
            oemer_exe = "oemer"  # fallback: en PATH
        proc = subprocess.run(
            [oemer_exe, img_path, "-o", out_dir, "--without-deskew"],
            capture_output=True, text=True, timeout=180,
        )
        if proc.returncode != 0:
            combined = (proc.stdout or "") + "\n" + (proc.stderr or "")
            err = combined[-800:].strip()
            raise HTTPException(status_code=500, detail=f"Oemer error (rc={proc.returncode}): {err}")

        # Buscar el XML de salida
        xml_files = [f for f in os.listdir(out_dir) if f.endswith(".xml") or f.endswith(".musicxml")]
        if not xml_files:
            raise HTTPException(status_code=422, detail="Oemer no detectó pentagramas en la imagen.")

        xml_path = os.path.join(out_dir, xml_files[0])
        notes = _parse_mxl_music21(xml_path)

    if not notes:
        raise HTTPException(status_code=422, detail="No se detectaron notas. Prueba con imagen más nítida.")
    return {"notes": notes, "engine": "oemer+music21"}


def _midi_to_notes_music21(midi_path: str, max_notes: int = 64) -> list:
    """Convierte MIDI → lista de notas usando music21. Extrae la pista con más notas (melodía)."""
    import music21
    score = music21.converter.parse(midi_path)
    # Elegir la parte con más notas (melodía principal)
    best_part = max(score.parts, key=lambda p: len(p.flatten().notes), default=None)
    if best_part is None:
        return []
    from notation import element_pitches
    notes_out = []
    for el in best_part.flatten().notesAndRests:
        if el.isRest:
            continue
        # element_pitches evita el AttributeError con la percusión que
        # transcribe MT3 y que music21 devuelve como PercussionChord
        pitches = element_pitches(el)
        if not pitches:
            continue
        highest = max(pitches, key=lambda p: p.midi)
        pitch_str, midi = highest.nameWithOctave, highest.midi
        if not (36 <= midi <= 96):
            continue
        duration = _ql_to_duration(float(el.duration.quarterLength))
        notes_out.append({"pitch": pitch_str, "duration": duration, "midi": midi})
    return notes_out[:max_notes]


@app.post("/api/mt3-transcribe")
async def mt3_transcribe(file: UploadFile = File(...), seconds: int = 60):
    """
    Transcripción con MR-MT3 + pipeline de notación.

    MT3 resuelve la parte física (qué suena y cuándo); notation.py resuelve la
    parte musical (qué figura se escribe). Sin ese segundo paso las duraciones
    salen del release acústico y los compases no cuadran con la cifra indicadora.
    """
    suffix  = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    content = await file.read()

    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = os.path.join(tmpdir, f"input{suffix}")
        midi_path  = os.path.join(tmpdir, "mt3_out.mid")
        with open(audio_path, "wb") as f:
            f.write(content)

        # El recorte lo decide quien llama. El coste de MT3 en CPU es de ~1.7x la
        # duración con material denso, y crece con la cantidad de notas
        # simultáneas: es el compromiso que hay que poder ajustar.
        secs = max(10, min(int(seconds), 300))

        # MT3 requiere 16 kHz
        try:
            y, _ = librosa.load(audio_path, sr=16000, mono=True, duration=float(secs))
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"No se pudo leer el audio: {e}")

        # Tempo, tonalidad y compás salen del audio, no del MIDI: el MIDI de MT3
        # viene en un marco de 120 BPM fijo que no corresponde a la pieza.
        tempo_val, key_name, mode, key_sig, time_sig = 120, "C", "major", {"flats": [], "sharps": []}, "4/4"
        meter_conf = 0.0
        try:
            import rhythm
            y22, sr22 = librosa.load(audio_path, sr=22050, mono=True, duration=float(secs))
            r = rhythm.analyze(y22, sr22)
            tempo_val  = r["tempo"] or 120
            time_sig   = r["timeSignature"]
            meter_conf = r["meterConfidence"]
            key_name, mode, key_sig = detect_key(y22, sr22)
        except Exception:
            pass

        try:
            model = get_mt3_model()          # cacheado en memoria
            midi_file = model.transcribe(y, sr=16000)
            midi_file.save(midi_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error MT3: {e}")

        try:
            import notation
            result = notation.midi_to_notated_score(
                midi_path, real_bpm=float(tempo_val),
                ts_str=time_sig, detected_key=key_name,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error de notación: {e}")

    if not result["notes"]:
        raise HTTPException(status_code=422, detail="MT3 no detectó notas en el audio.")

    return {
        "notes":         result["notes"],
        "voices":        result["voices"],
        "musicXml":      result["musicXml"],
        "engine":        "mr_mt3+notation",
        "tempo":         tempo_val,
        "timeSignature": time_sig,
        "key":           key_name,
        "mode":          mode,
        "keyLabel":      f"{key_name} {mode}",
        "keySignature":  key_sig,
        "measures":      result["measures"],
        "tempoRatio":    result["tempoRatio"],
        # Baja confianza = la cifra es dudosa y conviene que el usuario la revise
        "meterConfidence": meter_conf,
        "secondsAnalyzed": secs,
    }


def _analyze_context(audio_path: str, secs: int) -> dict:
    """
    Tempo, compás y tonalidad del audio.

    Se saca del audio y no del MIDI transcrito porque el MIDI viene en el marco
    de tempo del modelo, no en el de la pieza.
    """
    ctx = {
        "tempo": 120, "key": "C", "mode": "major",
        "keySignature": {"flats": [], "sharps": []},
        "timeSignature": "4/4", "meterConfidence": 0.0,
    }
    try:
        import rhythm
        y22, sr22 = librosa.load(audio_path, sr=22050, mono=True, duration=float(secs))
        r = rhythm.analyze(y22, sr22)
        key_name, mode, key_sig = detect_key(y22, sr22)
        ctx.update({
            "tempo": r["tempo"] or 120,
            "timeSignature": r["timeSignature"],
            "meterConfidence": r["meterConfidence"],
            "key": key_name, "mode": mode, "keySignature": key_sig,
        })
    except Exception:
        pass
    return ctx


def run_audio_transcription(audio_path: str, secs: int, engine: str = "cnn") -> dict:
    """
    Transcribe un archivo ya guardado en disco. Sin dependencias de FastAPI para
    que pueda ejecutarla el trabajador de la cola igual que un endpoint.

    engine="cnn"  → coste lineal, 0.85x tiempo real. El predeterminado.
    engine="mt3"  → multi-instrumento, pero escala superlineal con la densidad.
    """
    ctx = _analyze_context(audio_path, secs)

    with tempfile.TemporaryDirectory() as tmpdir:
        midi_path = os.path.join(tmpdir, "out.mid")

        if engine == "mt3":
            y, _ = librosa.load(audio_path, sr=16000, mono=True, duration=float(secs))
            get_mt3_model().transcribe(y, sr=16000).save(midi_path)
            engine_label = "mr_mt3+notation"
        else:
            from piano_transcription_inference import sample_rate as PT_SR
            audio, _ = librosa.load(audio_path, sr=PT_SR, mono=True, duration=float(secs))
            get_pt_model().transcribe(audio, midi_path)
            engine_label = "piano_cnn+notation"

        if not os.path.exists(midi_path):
            raise RuntimeError("El modelo no produjo MIDI.")

        import notation
        result = notation.midi_to_notated_score(
            midi_path, real_bpm=float(ctx["tempo"]),
            ts_str=ctx["timeSignature"], detected_key=ctx["key"],
        )

    if not result["notes"]:
        raise RuntimeError("No se detectaron notas en el audio.")

    return {
        "notes":    result["notes"],
        "voices":   result["voices"],
        "musicXml": result["musicXml"],
        "engine":   engine_label,
        "measures": result["measures"],
        "keyLabel": f"{ctx['key']} {ctx['mode']}",
        "secondsAnalyzed": secs,
        **{k: ctx[k] for k in ("tempo", "timeSignature", "key", "mode",
                               "keySignature", "meterConfidence")},
    }


@app.post("/api/audio-transcribe")
async def audio_transcribe(file: UploadFile = File(...), seconds: int = 60):
    """
    Transcripción síncrona con el CNN. Se conserva por compatibilidad; para
    producción conviene `/api/jobs/transcribe`, que no bloquea la petición.
    """
    suffix  = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    content = await file.read()
    secs = max(10, min(int(seconds), 300))

    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = os.path.join(tmpdir, f"input{suffix}")
        with open(audio_path, "wb") as f:
            f.write(content)
        try:
            return run_audio_transcription(audio_path, secs, "cnn")
        except RuntimeError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error de transcripción: {e}")


# ─── Cola de trabajos ────────────────────────────────────────────────────────
# Los archivos subidos viven aquí hasta que el trabajador los procesa: la
# petición HTTP termina antes de que empiece el trabajo, así que no vale un
# directorio temporal atado a su ciclo de vida.
JOBS_DIR = os.path.join(os.path.dirname(__file__), "jobs_tmp")
os.makedirs(JOBS_DIR, exist_ok=True)


def _job_handler(kind: str, payload: dict):
    """Ejecuta un encargo. Corre en el hilo trabajador, no en el del servidor."""
    if kind == "audio":
        return run_audio_transcription(
            payload["path"], payload["seconds"], payload.get("engine", "cnn"))
    raise ValueError(f"Tipo de trabajo desconocido: {kind}")


def _limpiar_huerfanos() -> None:
    """
    Borra los audios de encargos que un reinicio dejó a medias.

    La cola vive en memoria, así que al reiniciar se pierde lo que hubiera
    pendiente pero sus archivos siguen en disco. Sin esta limpieza el directorio
    crece con cada reinicio hasta llenar el disco del servidor.
    """
    try:
        n = 0
        for f in os.listdir(JOBS_DIR):
            # Los archivos que empiezan por punto son configuración del
            # directorio (.gitignore), no audios de encargos
            if f.startswith("."):
                continue
            p = os.path.join(JOBS_DIR, f)
            if os.path.isfile(p):
                os.unlink(p)
                n += 1
        if n:
            print(f"[jobs] {n} archivo(s) huérfano(s) de un reinicio anterior, borrados")
    except OSError as e:
        print(f"[jobs] no se pudo limpiar {JOBS_DIR}: {e}")


_limpiar_huerfanos()

import jobs as _jobs  # noqa: E402
JOB_QUEUE = _jobs.JobQueue(_job_handler)

# Coste medido por segundo de audio. El CNN es lineal (0.85x); MT3 escala
# superlineal con la densidad, de ahí el factor mucho mayor y conservador.
_ETA_POR_SEGUNDO = {"cnn": 0.95, "mt3": 4.5}


@app.post("/api/jobs/transcribe")
async def jobs_transcribe(
    file: UploadFile = File(...), seconds: int = 60, engine: str = "cnn",
):
    """
    Encola una transcripción y responde de inmediato con su identificador.

    La petición dura milisegundos, lo que evita que nginx la corte a los 60 s
    —su valor por defecto— y que varias transcripciones compitan por los mismos
    núcleos.
    """
    secs = max(10, min(int(seconds), 300))
    eng = "mt3" if engine == "mt3" else "cnn"

    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Archivo vacío.")

    path = os.path.join(JOBS_DIR, f"{uuid.uuid4().hex[:12]}{suffix}")
    with open(path, "wb") as f:
        f.write(content)

    try:
        job = JOB_QUEUE.submit(
            "audio",
            {"path": path, "seconds": secs, "engine": eng},
            eta=secs * _ETA_POR_SEGUNDO[eng] + 6,
        )
    except _jobs.QueueFull as e:
        try:
            os.unlink(path)
        except OSError:
            pass
        raise HTTPException(
            status_code=503,
            detail=f"El servidor está saturado ({e}). Inténtalo en unos minutos.",
        )

    return {"jobId": job.id, **(JOB_QUEUE.snapshot(job.id) or {})}


@app.get("/api/jobs/{job_id}")
def jobs_status(job_id: str):
    """Estado del encargo: posición en la cola, avance o resultado."""
    snap = JOB_QUEUE.snapshot(job_id)
    if snap is None:
        raise HTTPException(status_code=404, detail="Ese trabajo no existe o ya caducó.")
    return snap


@app.delete("/api/jobs/{job_id}")
def jobs_cancel(job_id: str):
    """Cancela un encargo que aún no ha empezado."""
    if JOB_QUEUE.cancel(job_id):
        return {"cancelled": True}
    raise HTTPException(
        status_code=409,
        detail="No se puede cancelar: ya está en proceso o ha terminado.",
    )


@app.get("/api/jobs")
def jobs_stats():
    return JOB_QUEUE.stats()


@app.get("/api/health")
def health():
    try:
        import demucs  # noqa: F401
        demucs_ok = True
    except ImportError:
        demucs_ok = False
    try:
        import oemer  # noqa: F401
        oemer_ok = True
    except ImportError:
        oemer_ok = False
    try:
        import mt3_infer  # noqa: F401
        mt3_ok = True
    except ImportError:
        mt3_ok = False
    # El CNN es el motor por defecto: coste lineal y por debajo del tiempo real.
    # Se reporta descargable aunque falte el checkpoint, porque ahora se baja
    # solo con urllib en la primera petición.
    pt_ok = os.path.exists(_PT_CKPT)
    return {
        "status": "ok", "engine": "librosa",
        "omnizart": True, "cnnReady": pt_ok, "cnnLoaded": _pt_model is not None,
        "queue": JOB_QUEUE.stats(),
        "demucs": demucs_ok,
        "oemer": oemer_ok, "mt3": mt3_ok,
        # loaded=True → la transcripción responde en ~3 s; False → primera vez ~60 s
        "mt3Loaded": _mt3_model is not None,
        "mt3Error": _mt3_error,
    }


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
    Pipeline orquestal de 6 capas (HPSS en lugar de Demucs — sin timeout):
    1. Trim 60 s  2. HPSS  3. Key+Tempo+Compás  4. pyin  5. Cuantización  6. Limpieza
    """
    suffix  = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    content = await file.read()

    with tempfile.TemporaryDirectory() as tmpdir:
        raw_path = os.path.join(tmpdir, f"raw{suffix}")
        with open(raw_path, "wb") as f:
            f.write(content)

        # ── Capa 1: Cargar y recortar a 60 s ─────────────────────────────
        try:
            y_mono, sr = librosa.load(raw_path, sr=22050, mono=True, duration=60.0)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"No se pudo leer el audio: {e}")

        # ── Capa 2: Tonalidad, tempo y compás ────────────────────────────
        key_name, mode, key_sig = detect_key(y_mono, sr)
        try:
            import rhythm
            r          = rhythm.analyze(y_mono, sr)
            tempo      = float(r["tempoExact"])
            time_sig   = r["timeSignature"]
            beat_times = r["beats"]
        except Exception:
            tempo, beat_times = detect_tempo_and_beats(y_mono, sr)
            time_sig          = detect_meter(y_mono, sr, tempo)
        beat_dur = 60.0 / max(tempo, 40.0)

        # ── Capa 1b: HPSS — separación armónica / percusiva ──────────────
        # Rápido (~1 s); sustituye Demucs para evitar timeouts en CPU
        y_harm, y_perc = librosa.effects.hpss(y_mono, margin=3.0)

        stem_map = {
            "Melodía / Cuerdas":    y_harm,
            "Bajo / Percusión":     y_perc,
        }

        # Guardar stems como WAV temporales para reutilizar transcribe_stem
        stems: dict[str, str] = {}
        for label, y_stem in stem_map.items():
            p = os.path.join(tmpdir, f"{label}.wav")
            sf.write(p, y_stem, sr)
            stems[label] = p

        # ── Capas 3-5: pyin + cuantización + limpieza por stem ───────────
        voices = []
        for label, stem_path in stems.items():
            raw   = transcribe_stem(stem_path, beat_times, beat_dur, max_sec=60.0)
            clean = clean_notes(raw, beat_dur)
            if clean:
                voices.append({"voice": label, "notes": clean})

        if not voices:
            raise HTTPException(status_code=422, detail="No se detectaron notas en el audio.")

        # ── Capa 6: Respuesta estructurada ───────────────────────────────
        return {
            "voices":        voices,
            "engine":        "hpss+librosa",
            "key":           key_name,
            "mode":          mode,
            "keyLabel":      f"{key_name} {mode}",
            "keySignature":  key_sig,
            "timeSignature": time_sig,
            "tempo":         round(tempo),
        }
