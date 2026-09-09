"""
notation.py — Puente entre transcripción (física) y notación (intención musical).

Un motor de transcripción como MT3 responde "cuándo suena y cuándo deja de sonar".
Una partitura necesita "qué figura escribió el compositor". Convertir lo primero en
lo segundo es el trabajo de este módulo:

1. Corrección de tempo   — MT3 exporta el MIDI en un marco fijo de 120 BPM, no en
                           el tempo real de la pieza. Sin corregirlo, cada duración
                           queda escalada por el cociente entre ambos tempos.
2. Cuantización de onsets— Se ajustan los ataques a la rejilla de semicorcheas.
3. Duración onset→onset  — La duración notada sale del hueco hasta el siguiente
                           ataque, NO del release acústico. Un pianista suelta una
                           negra al 80% y sigue siendo una negra.
4. Separación de voces   — Grave y agudo van a pentagramas distintos; si se aplanan
                           en uno solo, los compases desbordan.
5. Notación              — music21 añade silencios, ligaduras y barrados.
"""
from __future__ import annotations

import music21
from music21 import chord, clef, key, meter, note, stream, tempo

# Rejilla de cuantización: semicorchea
GRID = 0.25

# Duraciones que existen como figura simple (con puntillo incluido)
NOTATABLE = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0]

# Etiquetas que entiende el frontend
_QL_LABEL: list[tuple[float, str]] = [
    (4.0, "whole"), (3.0, "half"), (2.0, "half"), (1.5, "quarter"),
    (1.0, "quarter"), (0.75, "eighth"), (0.5, "eighth"), (0.25, "sixteenth"),
]

# Frontera grave/agudo del sistema de piano (Do central)
SPLIT_MIDI = 60


def _snap(x: float, grid: float = GRID) -> float:
    """Ajusta un tiempo a la rejilla."""
    return round(x / grid) * grid


def element_pitches(el) -> list:
    """
    Alturas de un elemento, sea nota o acorde, o lista vacía si no tiene.

    Acceder a `el.pitch` directamente rompe con la percusión: MT3 transcribe
    batería y music21 la entrega como `PercussionChord`, que expone `pitches`
    pero no `pitch`. Y aunque no reventara, un golpe de caja no tiene altura que
    llevar al pentagrama —sus "notas" son códigos de instrumento— así que se
    descarta en vez de dibujarse como si fuera melodía.
    """
    if "Percussion" in type(el).__name__:
        return []
    if getattr(el, "isRest", False):
        return []
    ps = getattr(el, "pitches", None)
    return list(ps) if ps else []


def _fit_notatable(ql: float) -> float:
    """
    Mayor figura que cabe en `ql` sin pasarse.

    Se elige "la que cabe" y no "la más cercana" a propósito: pasarse haría que las
    notas se solapen y el compás desborde. Quedarse corto deja un hueco que music21
    rellena con un silencio, que es exactamente lo que un copista escribiría.
    """
    cands = [n for n in NOTATABLE if n <= ql + 1e-9]
    return max(cands) if cands else GRID


def ql_to_label(ql: float) -> str:
    """Quarter-length → etiqueta de figura para el frontend."""
    for value, label in _QL_LABEL:
        if ql >= value - 1e-9:
            return label
    return "sixteenth"


# ─── Paso 1: extraer eventos con el tempo corregido ──────────────────────────

def extract_events(midi_path: str, real_bpm: float) -> tuple[list[dict], float]:
    """
    Lee el MIDI de MT3 y devuelve sus notas ya trasladadas al tempo real.

    MT3 escribe el MIDI en un marco de 120 BPM fijo. Los tiempos absolutos en
    segundos sí son correctos, pero expresados en ese marco. Para pasarlos al
    tempo real hay que multiplicar por (bpm_real / bpm_del_marco).
    """
    sc = music21.converter.parse(midi_path)

    marks = sc.flatten().getElementsByClass(tempo.MetronomeMark)
    frame_bpm = float(marks[0].number) if marks else 120.0
    ratio = real_bpm / frame_bpm if frame_bpm > 0 else 1.0

    events: list[dict] = []
    for el in sc.flatten().notes:
        pitches = element_pitches(el)
        if not pitches:
            continue                       # percusión u otro evento sin altura
        onset = float(el.offset) * ratio
        sound = float(el.duration.quarterLength) * ratio
        for p in pitches:
            events.append({"onset": onset, "sound": sound, "midi": int(p.midi)})

    events.sort(key=lambda e: (e["onset"], e["midi"]))
    return events, ratio


# ─── Paso 2: separar en voces ────────────────────────────────────────────────

def split_voices(events: list[dict], split_midi: int = SPLIT_MIDI) -> tuple[list, list]:
    """
    Reparte los eventos entre pentagrama de sol y de fa.

    El corte fijo en el Do central es lo que hace un editor de piano por defecto.
    Si una de las dos manos queda vacía se devuelve todo junto en la de arriba,
    porque una pieza monofónica aguda no debe generar un pentagrama de fa vacío.
    """
    treble = [e for e in events if e["midi"] >= split_midi]
    bass = [e for e in events if e["midi"] < split_midi]
    if not bass:
        return treble, []
    if not treble:
        return bass, []
    return treble, bass


# ─── Paso 3: construir una parte notada ──────────────────────────────────────

def build_part(
    events: list[dict],
    real_bpm: float,
    ts_str: str,
    clef_obj: clef.Clef,
    max_ql: float = 4.0,
) -> stream.Part:
    """
    Convierte eventos crudos en una parte con figuras notables.

    El truco central: se cuantizan los ATAQUES primero y las duraciones se derivan
    de los huecos entre ataques ya cuantizados. Así toda duración es múltiplo de la
    rejilla por construcción, sin necesidad de cuantizarla por separado.
    """
    part = stream.Part()
    part.append(clef_obj)
    part.append(meter.TimeSignature(ts_str))
    part.append(tempo.MetronomeMark(number=round(real_bpm)))

    if not events:
        return part

    # Agrupar por ataque cuantizado: mismo onset = acorde
    groups: dict[float, list[dict]] = {}
    for e in events:
        groups.setdefault(_snap(e["onset"]), []).append(e)

    onsets = sorted(groups)
    for i, on in enumerate(onsets):
        grp = groups[on]

        if i + 1 < len(onsets):
            # Duración = hueco hasta el siguiente ataque (criterio de copista)
            gap = onsets[i + 1] - on
        else:
            # Última nota: no hay siguiente ataque, se usa lo que sonó
            gap = max(_snap(max(g["sound"] for g in grp)), GRID)

        ql = _fit_notatable(min(gap, max_ql))

        midis = sorted({g["midi"] for g in grp})
        el = note.Note(midis[0]) if len(midis) == 1 else chord.Chord(midis)
        el.duration.quarterLength = ql
        part.insert(on, el)

    return part


# ─── Paso 4: notación completa ───────────────────────────────────────────────

def notate(part: stream.Part, key_obj: key.Key | None = None) -> stream.Part:
    """Agrupa en compases y añade silencios, ligaduras y barrados."""
    if key_obj is not None:
        part.insert(0, key_obj)
    try:
        part.makeRests(fillGaps=True, inPlace=True)
    except Exception:
        pass
    out = part.makeMeasures(inPlace=False)
    try:
        out.makeNotation(inPlace=True)
    except Exception:
        # makeNotation puede quejarse con material muy irregular; los compases
        # ya construidos siguen siendo utilizables.
        pass
    return out


# ─── Paso 5: salida ──────────────────────────────────────────────────────────

def part_to_notes(part: stream.Part, max_notes: int = 128) -> list[dict]:
    """
    Aplana una parte notada al formato que consume el frontend.

    Cada evento lleva su número de compás y su posición dentro de él. Es
    deliberado: si el frontend reagrupara las figuras por su cuenta acabaría
    discrepando del reparto que ya hizo music21 —que sí conoce ligaduras y
    silencios de relleno— y las barras de compás caerían en otro sitio.

    Los silencios se conservan por la misma razón: sin ellos la suma de tiempos
    de un compás nunca cuadra con la cifra indicadora.
    """
    out: list[dict] = []

    measures = list(part.getElementsByClass("Measure"))
    if not measures:
        # Parte sin compases (no pasó por makeMeasures): se aplana sin agrupar
        for el in part.flatten().notesAndRests:
            ql = float(el.duration.quarterLength)
            if ql <= 0:
                continue
            out.append(_event_dict(el, ql, measure=1, beat=1.0))
            if len(out) >= max_notes:
                break
        return out

    for m in measures:
        beat_pos = 0.0
        for el in m.notesAndRests:
            ql = float(el.duration.quarterLength)
            if ql <= 0:
                continue
            out.append(_event_dict(el, ql, measure=int(m.number or 1),
                                   beat=beat_pos + 1.0))
            beat_pos += ql
            if len(out) >= max_notes:
                return out
    return out


def _event_dict(el, ql: float, measure: int, beat: float) -> dict:
    """
    Serializa una nota, acorde o silencio al formato del frontend.

    De un acorde se destaca la nota más aguda —es la que lleva la melodía y la
    que dibuja el pentagrama simple— pero se conservan todas en `midis`. Sin eso
    la reproducción pierde los acordes de la mano izquierda y suena a melodía
    suelta en vez de a la pieza.
    """
    base = {
        "duration": ql_to_label(ql),
        "quarterLength": round(ql, 4),
        "measure": measure,
        "beat": round(beat, 4),
    }
    if el.isRest:
        return {**base, "pitch": "rest", "midi": -1, "isRest": True, "midis": []}

    pitches = sorted(element_pitches(el), key=lambda x: x.midi)
    if not pitches:
        # Percusión: ocupa su tiempo en el compás pero no lleva altura
        return {**base, "pitch": "rest", "midi": -1, "isRest": True, "midis": []}

    top = pitches[-1]
    return {
        **base,
        "pitch": top.nameWithOctave,
        "midi": int(top.midi),
        "isRest": False,
        "midis": [int(p.midi) for p in pitches],
    }


def _name_part(part: stream.Part, name: str, abbrev: str) -> None:
    """
    Pone nombre a la parte para que el grabador escriba algo legible al margen.

    Sin esto music21 emite su identificador interno —una cadena hexadecimal de
    treinta y tantos caracteres— y OSMD la imprime tal cual junto al pentagrama.
    """
    part.partName = name
    part.partAbbreviation = abbrev
    try:
        instr = part.getInstrument(returnDefault=True)
        instr.partName = name
        instr.partAbbreviation = abbrev
        instr.instrumentName = name
    except Exception:
        pass


def score_to_musicxml(score: stream.Score) -> str:
    """Serializa a MusicXML sin pasar por disco."""
    from music21.musicxml import m21ToXml
    exporter = m21ToXml.GeneralObjectExporter(score)
    return exporter.parse().decode("utf-8")


# ─── Partituras que ya vienen notadas (OMR de imagen) ────────────────────────

def notated_xml_to_output(xml_path: str, max_notes: int = 128) -> dict:
    """
    Procesa un MusicXML que YA trae notación (salida de Audiveris u Oemer).

    A diferencia del audio, aquí no hay que corregir tempo ni derivar duraciones:
    el grabador original ya escribió compases y figuras. Lo que sí hace falta es
    conservar los silencios —el parser anterior los descartaba, y sin ellos la
    suma de tiempos nunca cuadra con la cifra indicadora— y repartir las manos.
    """
    sc = music21.converter.parse(xml_path)

    ts_str = "4/4"
    tss = sc.flatten().getElementsByClass(meter.TimeSignature)
    if tss:
        ts_str = tss[0].ratioString

    real_bpm = 120.0
    marks = sc.flatten().getElementsByClass(tempo.MetronomeMark)
    if marks and marks[0].number:
        real_bpm = float(marks[0].number)

    key_label = None
    try:
        k = sc.analyze("key")
        key_label = f"{k.tonic.name} {k.mode}"
    except Exception:
        pass

    parts = list(sc.parts) or [sc]
    voices_out: list[dict] = []
    names = ["Mano derecha", "Mano izquierda", "Voz 3", "Voz 4"]

    for i, p in enumerate(parts[:4]):
        notes = part_to_notes(p, max_notes)
        if notes:
            voices_out.append({"voice": names[i] if i < len(names) else f"Voz {i+1}",
                               "notes": notes})

    if not voices_out:
        return {"notes": [], "voices": [], "musicXml": None,
                "timeSignature": ts_str, "tempo": int(real_bpm),
                "keyLabel": key_label, "measures": 0}

    try:
        xml = score_to_musicxml(sc if isinstance(sc, stream.Score) else parts[0])
    except Exception:
        xml = None

    measures = len(list(parts[0].getElementsByClass("Measure")))
    return {
        "notes": voices_out[0]["notes"],
        "voices": voices_out,
        "musicXml": xml,
        "timeSignature": ts_str,
        "tempo": int(real_bpm),
        "keyLabel": key_label,
        "measures": measures,
    }


# ─── Orquestador ─────────────────────────────────────────────────────────────

def midi_to_notated_score(
    midi_path: str,
    real_bpm: float,
    ts_str: str = "4/4",
    detected_key: str | None = None,
) -> dict:
    """
    Pipeline completo: MIDI de transcripción → partitura notada.

    Devuelve las notas del pentagrama de sol (compatibilidad con el frontend
    actual), ambas voces por separado, y el MusicXML completo.
    """
    events, ratio = extract_events(midi_path, real_bpm)
    if not events:
        return {"notes": [], "voices": [], "musicXml": None,
                "tempoRatio": ratio, "measures": 0}

    treble_ev, bass_ev = split_voices(events)

    key_obj = None
    if detected_key:
        try:
            key_obj = key.Key(detected_key)
        except Exception:
            key_obj = None

    score = stream.Score()
    voices_out: list[dict] = []

    treble_part = notate(
        build_part(treble_ev, real_bpm, ts_str, clef.TrebleClef()), key_obj
    )
    _name_part(treble_part, "Mano derecha", "M.D.")
    score.insert(0, treble_part)
    voices_out.append({"voice": "Mano derecha", "notes": part_to_notes(treble_part)})

    if bass_ev:
        bass_part = notate(
            build_part(bass_ev, real_bpm, ts_str, clef.BassClef()), key_obj
        )
        _name_part(bass_part, "Mano izquierda", "M.I.")
        score.insert(0, bass_part)
        voices_out.append({"voice": "Mano izquierda", "notes": part_to_notes(bass_part)})

    try:
        xml = score_to_musicxml(score)
    except Exception:
        xml = None

    measures = len(list(treble_part.getElementsByClass("Measure")))
    return {
        "notes": voices_out[0]["notes"],
        "voices": voices_out,
        "musicXml": xml,
        "tempoRatio": round(ratio, 4),
        "measures": measures,
    }
