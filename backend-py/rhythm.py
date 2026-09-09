"""
rhythm.py — Estimación robusta de tempo y compás.

El problema que resuelve: un detector por autocorrelación se engancha a la
periodicidad más fuerte de la señal, que en música con tiempo fuerte marcado
es el **compás**, no el **tiempo**. De ahí los errores de octava (÷2, ÷3, ÷1.5)
que hacían que el tempo saliera a la mitad o a un tercio del real.

La corrección no es elegir mejor el pico de autocorrelación, sino puntuar cada
tempo candidato por lo bien que *explica los ataques que realmente hay*:

  concentración — ¿los ataques caen cerca de las líneas de la rejilla?
  cobertura     — ¿hay un ataque en la mayoría de las líneas de la rejilla?

La concentración por sí sola premia los tempos demasiado rápidos: si 100 BPM
encaja, 200 también, porque todo ataque en negra cae también en corchea. La
cobertura es la que castiga eso — a 200 BPM la mitad de las líneas quedan vacías.

Sobre ambas se aplica el sesgo perceptual humano, centrado cerca de 120 BPM
(Parncutt 1994, Moelants 2002): ante dos lecturas métricamente equivalentes, el
oído elige la que cae en la zona de pulso preferido.
"""
from __future__ import annotations

import numpy as np
import librosa

# Rango de búsqueda y resolución
BPM_MIN, BPM_MAX, BPM_STEP = 40.0, 240.0, 0.25

# Centro y anchura (en octavas) del sesgo de pulso preferido
PREF_BPM, PREF_WIDTH = 120.0, 0.95

# Tolerancia de alineación: fracción del pulso, con techo absoluto
TOL_FRAC, TOL_MAX = 0.14, 0.09


# ─── Ataques ─────────────────────────────────────────────────────────────────

def onset_times(y: np.ndarray, sr: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Ataques detectados, su envolvente y los instantes de la envolvente."""
    env = librosa.onset.onset_strength(y=y, sr=sr, aggregate=np.median)
    frames = librosa.onset.onset_detect(
        onset_envelope=env, sr=sr, backtrack=True, units="frames"
    )
    times = librosa.frames_to_time(frames, sr=sr)
    env_t = librosa.times_like(env, sr=sr)
    return times, env, env_t


# ─── Puntuación de un tempo candidato ────────────────────────────────────────

def _score_bpm(onsets: np.ndarray, bpm: float, span: float) -> tuple[float, float, float]:
    """
    Devuelve (concentración, cobertura, fase) para un tempo candidato.

    La fase óptima sale de la media circular de los ataques módulo el pulso: es
    la orientación media de los vectores unitarios, y su longitud resultante es
    directamente la concentración.

    La concentración se mide en el primer armónico y también en el segundo y el
    tercero. Sin eso, una pieza en corcheas hunde la puntuación de su propio
    tempo de negra: la mitad de los ataques caen en fase 0 y la otra mitad en
    0.5, y la media circular del primer armónico se cancela. El segundo armónico
    los ve a todos alineados, que es lo correcto —una corchea a contratiempo no
    está fuera de la rejilla, está en la subdivisión—. Los armónicos superiores
    llevan descuento para que, en igualdad, gane la alineación directa al pulso.
    """
    period = 60.0 / bpm
    if period <= 0 or len(onsets) < 2:
        return 0.0, 0.0, 0.0

    ph = np.mod(onsets, period) / period
    z = np.mean(np.exp(2j * np.pi * ph))
    conc = float(np.abs(z))                       # 0 disperso … 1 perfectamente alineado
    phase = float((np.angle(z) / (2 * np.pi)) % 1.0) * period

    n_beats = int(span / period)
    if n_beats < 2:
        return conc, 0.0, phase

    grid = phase + np.arange(n_beats) * period
    tol = min(TOL_FRAC * period, TOL_MAX)
    # Distancia de cada línea de rejilla al ataque más cercano
    d = np.abs(grid[:, None] - onsets[None, :]).min(axis=1)
    coverage = float(np.mean(d < tol))

    return conc, coverage, phase


def _pref_prior(bpm: float) -> float:
    """Sesgo log-normal hacia la zona de pulso que el oído prefiere."""
    return float(np.exp(-0.5 * (np.log2(bpm / PREF_BPM) / PREF_WIDTH) ** 2))


def accent_curve(y: np.ndarray, sr: int) -> tuple[np.ndarray, np.ndarray]:
    """
    Curva de acento normalizada: envolvente de ataque + energía grave.

    El contenido por debajo de 250 Hz es lo que marca el tiempo fuerte —el bombo,
    la mano izquierda— y sin él no hay forma de saber en qué nivel métrico
    estamos.
    """
    env = librosa.onset.onset_strength(y=y, sr=sr, aggregate=np.median)
    env_t = librosa.times_like(env, sr=sr)

    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    low = S[freqs < 250.0].sum(axis=0)
    low_t = librosa.times_like(low, sr=sr, hop_length=512)

    def norm(v):
        v = np.asarray(v, dtype=float)
        rng = v.max() - v.min()
        return (v - v.min()) / rng if rng > 1e-9 else np.zeros_like(v)

    grid_t = env_t
    a = 0.55 * norm(env) + 0.45 * np.interp(grid_t, low_t, norm(low))
    return grid_t, a


def _accent_contrast(
    acc_t: np.ndarray, acc: np.ndarray, bpm: float, phase: float, span: float
) -> float:
    """
    Cuánto más acentuados están los pulsos que los puntos intermedios.

    Es el discriminador del nivel métrico, y hace falta porque la rejilla sola no
    puede decidirlo: si 100 BPM encaja, 50 y 200 también. Lo que los separa es
    que solo en el nivel verdadero los tiempos pesan más que lo que hay entre
    ellos. A doble velocidad el contraste se reduce a la mitad —los "tiempos"
    alternan fuertes y débiles—; a mitad de velocidad se anula, porque los
    supuestos puntos intermedios son en realidad tiempos.
    """
    period = 60.0 / bpm
    n = int((span - phase) / period)
    if n < 4:
        return 0.0
    beats = phase + np.arange(n) * period
    mids = beats + period / 2.0
    mids = mids[mids < span]
    if len(mids) < 3:
        return 0.0
    a_beats = float(np.mean(np.interp(beats, acc_t, acc)))
    a_mids = float(np.mean(np.interp(mids, acc_t, acc)))
    return a_beats - a_mids


def estimate_tempo(y: np.ndarray, sr: int) -> tuple[float, float, np.ndarray]:
    """
    Estima el tempo resistiendo errores de octava.

    Devuelve (bpm, fase_en_segundos, instantes_de_pulso).
    """
    onsets, _, _ = onset_times(y, sr)
    span = float(len(y) / sr)

    if len(onsets) < 4:
        # Sin ataques suficientes no hay nada que alinear; se cae al detector clásico
        t, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
        return float(np.atleast_1d(t)[0]), 0.0, np.asarray(beats)

    best = (-1.0, 120.0, 0.0)
    for bpm in np.arange(BPM_MIN, BPM_MAX + BPM_STEP, BPM_STEP):
        b = float(bpm)
        conc, cov, phase = _score_bpm(onsets, b, span)
        if cov <= 0:
            continue
        # El producto exige las dos cosas a la vez: alineación Y rejilla ocupada.
        # El sesgo perceptual desempata entre lecturas métricamente equivalentes.
        score = conc * cov * _pref_prior(b)
        if score > best[0]:
            best = (score, b, phase)

    _, bpm, phase = best
    n = max(1, int(span / (60.0 / bpm)))
    beats = phase + np.arange(n) * (60.0 / bpm)
    return bpm, phase, beats


# ─── Compás ──────────────────────────────────────────────────────────────────

def estimate_meter(
    y: np.ndarray, sr: int, bpm: float, beats: np.ndarray | None = None
) -> tuple[str, float]:
    """
    Deduce la cifra indicadora del patrón de acentos.

    El compás no está en el espectro: está en *cada cuántos pulsos vuelve a caer
    el acento fuerte*. Se toma la fuerza de cada pulso, se prueba a plegarla
    sobre cada período candidato, y gana el que produce un patrón más marcado y
    más constante a lo largo de la pieza.

    La constancia es tan importante como el contraste. Cualquier serie de
    números plegada sobre el período correcto da un perfil con relieve; lo que
    distingue al período verdadero es que ese relieve se repite compás tras
    compás en vez de venir de un par de golpes sueltos.

    Devuelve (cifra, confianza 0..1).
    """
    if beats is None or len(beats) < 8:
        _, _, beats = estimate_tempo(y, sr)
    if len(beats) < 8:
        return "4/4", 0.0

    acc_t, acc_curve_v = accent_curve(y, sr)
    acc = np.interp(beats, acc_t, acc_curve_v)
    # Se quita la tendencia: solo interesa la variación pulso a pulso, no que la
    # pieza suba o baje de intensidad en conjunto.
    acc = acc - float(np.mean(acc))
    spread = float(np.std(acc)) + 1e-9

    def fold(m: int) -> tuple[float, list[float]]:
        """
        (puntuación, perfil) al plegar los acentos sobre período m.

        Se prueban las m rotaciones posibles y se devuelve la mejor. Es
        imprescindible: la fase que da el estimador de tempo alinea la rejilla a
        los ataques, pero no sabe cuál de esas líneas es el tiempo 1. Si la
        rejilla empieza en el tiempo 2, el perfil sale rotado y el tiempo fuerte
        aparece en una posición que no es la 0.
        """
        if len(acc) < m * 3:
            return -1.0, []

        best_s, best_p = -1e9, []
        for rot in range(m):
            a = acc[rot:]
            cols = [a[k::m] for k in range(m)]
            if min(len(c) for c in cols) < 2:
                continue
            prof = [float(np.mean(c)) for c in cols]
            contrast = (prof[0] - float(np.mean(prof[1:]))) / spread

            # Constancia: en cuántos compases el tiempo 1 es realmente el más
            # fuerte. Un relieve que solo viene de un par de golpes sueltos no
            # es un compás.
            n_full = min(len(c) for c in cols)
            block = np.stack([c[:n_full] for c in cols], axis=1)   # (compases, m)
            hits = float(np.mean(block[:, 0] >= block.max(axis=1) - 1e-9))

            s = contrast * (0.35 + 0.65 * hits)
            if s > best_s:
                best_s, best_p = s, prof

        return (best_s, best_p) if best_p else (-1.0, [])

    s2, _ = fold(2)
    s3, _ = fold(3)
    s4, p4 = fold(4)
    s6, p6 = fold(6)

    # Navaja de Occam sobre el período. Un período grande siempre "explica" a
    # uno pequeño que lo divida: un 3/4 plegado en 6 son dos compases y produce
    # el mismo perfil que un 6/8; un 2/4 plegado en 4 son dos compases y produce
    # el mismo perfil que un 4/4. Desde el acento son indistinguibles, así que la
    # regla es quedarse con el período más simple salvo evidencia clara en
    # contra. Equivocarse hacia el simple da una partitura legible con las barras
    # cada dos compases; equivocarse hacia el compuesto la deja irreconocible.
    MARGEN = 1.45

    # 6/8 frente a 3/4: el apoyo secundario en la posición 4 —que en teoría
    # distingue los dos grupos de tres— resultó no discriminar nada al medirlo:
    # daba el mismo valor en un 6/8 real que en un 3/4. Solo se conserva como
    # comprobación de signo. Lo que sí separa es el margen: un 6/8 auténtico le
    # saca al período 3 bastante más de lo que se lo saca un 3/4 visto doble.
    six_ok = False
    if s6 > 0 and len(p6) == 6:
        otros = [p6[1], p6[2], p6[4], p6[5]]
        tiene_apoyo = p6[3] > float(np.mean(otros))
        six_ok = tiene_apoyo and s6 > max(s3, s2, 0.0) * MARGEN

    # 4/4 frente a 2/4: en 4/4 el tiempo 3 lleva apoyo semifuerte. El 2/4 solo se
    # propone si además le gana al 4/4 con holgura, porque el 4/4 es mucho más
    # frecuente y la diferencia entre ambos es en buena medida convencional.
    semi = bool(len(p4) == 4 and p4[2] > float(np.mean([p4[1], p4[3]])) + 0.15 * spread)
    dos_ok = s2 > max(s4, 0.0) * MARGEN and not semi

    cands: list[tuple[float, str]] = [
        (s4 * (1.12 if semi else 1.0), "4/4"),
        (s3, "3/4"),
    ]
    if six_ok:
        cands.append((s6 * 1.10, "6/8"))
    if dos_ok:
        cands.append((s2, "2/4"))

    cands.sort(key=lambda c: c[0], reverse=True)
    best_score, best_ts = cands[0]
    runner = cands[1][0] if len(cands) > 1 else 0.0

    if best_score <= 0.02:
        return "4/4", 0.0
    conf = float(np.clip((best_score - max(runner, 0.0)) / (abs(best_score) + 1e-9), 0, 1))
    return best_ts, conf


# ─── Interfaz conjunta ───────────────────────────────────────────────────────

def analyze(y: np.ndarray, sr: int) -> dict:
    """
    Tempo, compás e instantes de pulso en una sola pasada.

    El tempo se devuelve en **negras por minuto**, que es lo que necesita la
    notación para convertir el marco de MT3. Ojo con el compás compuesto: si el
    plegado encontró el compás en período 6, el pulso que se detectó es la
    corchea, no la negra —por eso el 6/8 salía al doble—. El compás es lo que
    permite saber en qué unidad está el pulso y traducirlo.
    """
    bpm, phase, beats = estimate_tempo(y, sr)
    ts, conf = estimate_meter(y, sr, bpm, beats)

    pulse_bpm = bpm
    quarter_bpm = bpm
    if ts == "6/8":
        quarter_bpm = bpm / 2.0     # seis corcheas por compás → la negra va a mitad

    return {
        "tempo": int(round(quarter_bpm)),
        "tempoExact": round(quarter_bpm, 2),
        "pulseBpm": round(pulse_bpm, 2),
        "timeSignature": ts,
        "meterConfidence": round(conf, 3),
        "beatPhase": round(phase, 4),
        "beats": beats,
    }
