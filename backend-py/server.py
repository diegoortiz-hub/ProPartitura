"""
Backend Omnizart para transcripción de audio a notas musicales.
Usa Omnizart (Academia Sinica) como motor principal y expone una API REST
que el frontend consume antes de caer al fallback Basic-Pitch en browser.
"""
import os
import tempfile
import mido
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ProPartitura — Omnizart OMR")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

PORT = int(os.getenv("PORT", 3002))

NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def midi_to_pitch(midi: int) -> str:
    octave = midi // 12 - 1
    return f"{NOTES[midi % 12]}{octave}"


def secs_to_duration(secs: float, bpm: float) -> str:
    beats = secs * (bpm / 60)
    if beats >= 3.5:
        return "whole"
    if beats >= 1.75:
        return "half"
    if beats >= 0.875:
        return "quarter"
    if beats >= 0.4:
        return "eighth"
    return "sixteenth"


def parse_midi_file(midi_path: str, bpm: float = 120) -> list[dict]:
    """Parsea un archivo MIDI y devuelve lista de notas con pitch/duration/midi."""
    mid = mido.MidiFile(midi_path)
    tempo = int(60_000_000 / bpm)
    notes_out: list[dict] = []

    for track in mid.tracks:
        tick_time = 0
        active: dict[int, tuple[int, int]] = {}  # note → (tick_start, velocity)
        for msg in track:
            tick_time += msg.time
            if msg.type == "set_tempo":
                tempo = msg.tempo
            elif msg.type == "note_on" and msg.velocity > 0:
                active[msg.note] = (tick_time, msg.velocity)
            elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                if msg.note in active:
                    start_tick, _ = active.pop(msg.note)
                    dur_ticks = tick_time - start_tick
                    dur_sec = mido.tick2second(dur_ticks, mid.ticks_per_beat, tempo)
                    bpm_val = 60_000_000 / tempo
                    notes_out.append({
                        "pitch": midi_to_pitch(msg.note),
                        "duration": secs_to_duration(dur_sec, bpm_val),
                        "midi": msg.note,
                        "_start_tick": start_tick,
                    })
        # solo primer track con notas
        if notes_out:
            break

    # ordenar por tiempo de inicio y devolver las primeras 32
    notes_out.sort(key=lambda n: n.pop("_start_tick"))
    return notes_out[:32]


@app.get("/api/health")
def health():
    try:
        import omnizart  # noqa: F401
        omnizart_ok = True
    except ImportError:
        omnizart_ok = False
    return {"status": "ok", "omnizart": omnizart_ok}


@app.post("/api/audio-omr")
async def transcribe_audio(file: UploadFile = File(...), bpm: int = 120):
    try:
        from omnizart.music import app as music_app
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Omnizart no está instalado. Ejecuta: pip install omnizart",
        )

    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, f"input{suffix}")
        content = await file.read()
        with open(input_path, "wb") as f:
            f.write(content)

        try:
            midi_path = music_app.transcribe(input_path, output=tmpdir)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Omnizart error: {exc}") from exc

        notes = parse_midi_file(str(midi_path), bpm=bpm)

    if not notes:
        raise HTTPException(status_code=422, detail="No se detectaron notas en el audio.")

    return {"notes": notes, "engine": "omnizart"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
