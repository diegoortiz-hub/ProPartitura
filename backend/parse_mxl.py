"""
parse_mxl.py — Parsea un archivo MXL/XML con music21.
Extrae solo el pentagrama de clave de sol (treble, parte 0).
Toma la nota más alta de cada acorde (melodía).
Filtra el rango de melodía: C3–C7 (midi 48–96).
Salida: JSON por stdout  {"notes": [...]} o {"error": "..."}
"""
import sys
import json

def ql_to_duration(ql: float) -> str:
    if ql >= 3.5:   return "whole"
    if ql >= 1.75:  return "half"
    if ql >= 0.875: return "quarter"
    if ql >= 0.4:   return "eighth"
    return "sixteenth"

def parse(path: str) -> list:
    import music21

    score = music21.converter.parse(path)
    parts = score.parts
    if not parts:
        return []

    # Usar la primera parte (clave de sol / mano derecha en partitura de piano)
    treble = parts[0]
    notes_out = []

    for el in treble.flatten().notesAndRests:
        if el.isRest:
            continue

        # Acorde → nota más alta (melodía)
        if el.isChord:
            highest = max(el.pitches, key=lambda p: p.midi)
            pitch_str = highest.nameWithOctave   # "C4", "F#5" …
            midi = highest.midi
        else:
            pitch_str = el.pitch.nameWithOctave
            midi = el.pitch.midi

        # Filtrar solo rango de melodía (C3–C7)
        if not (48 <= midi <= 96):
            continue

        duration = ql_to_duration(float(el.duration.quarterLength))
        notes_out.append({"pitch": pitch_str, "duration": duration, "midi": midi})

    return notes_out[:64]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: parse_mxl.py <ruta_archivo.mxl>"}))
        sys.exit(1)
    try:
        notes = parse(sys.argv[1])
        print(json.dumps({"notes": notes}))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
