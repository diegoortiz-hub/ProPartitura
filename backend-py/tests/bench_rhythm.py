"""
Banco de pruebas de tempo y compas con verdad conocida.

Sintetiza piezas con patron de acentos realista: el tiempo fuerte lleva mas
energia y contenido grave (como un bombo o la mano izquierda de un piano),
que es exactamente la pista que usa un oido entrenado para inferir el compas.
"""
import numpy as np, wave, struct, os, math, random

SR = 22050
OUT = os.path.dirname(__file__)

# (nombre, bpm, numerador, denominador, compases)
CASOS = [
    ("rock_4_4",    100, 4, 4, 8),
    ("vals_3_4",    120, 3, 4, 8),
    ("marcha_2_4",  140, 2, 4, 8),
    ("giga_6_8",     90, 6, 8, 6),
    ("balada_4_4",   72, 4, 4, 6),
    ("rapido_3_4",  168, 3, 4, 8),
]

# Fuerza relativa por posicion dentro del compas (patron metrico real)
ACENTO = {
    (4, 4): [1.00, 0.55, 0.78, 0.52],       # fuerte, debil, semifuerte, debil
    (3, 4): [1.00, 0.56, 0.58],             # fuerte, debil, debil
    (2, 4): [1.00, 0.58],                   # fuerte, debil
    (6, 8): [1.00, 0.48, 0.52, 0.80, 0.47, 0.51],  # dos grupos de tres
}


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def golpe(y, t0, midi, amp, dur, grave=False):
    """Inserta un evento tonal con envolvente percusiva."""
    s = max(0, int(t0 * SR))
    n = min(int(dur * SR), len(y) - s)
    if n <= 0:
        return
    t = np.arange(n) / SR
    env = np.exp(-4.5 * t) * np.minimum(1.0, t / 0.004)
    f = hz(midi)
    w = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t)
    if grave:
        # Componente sub-grave: es la que delata el tiempo fuerte
        w = w + 1.3 * np.sin(2 * np.pi * (f / 2) * t) * np.exp(-9 * t)
        w = w + 0.7 * np.exp(-38 * t) * np.random.RandomState(7).randn(n) * 0.3
    y[s:s + n] += w * env * amp


# Progresion I-V-vi-IV en Do: la armonia cambia en cada tiempo fuerte, que es
# como se comporta la musica real y la pista mas fiable para hallar el compas.
PROGRESION = [
    (48, [60, 64, 67]),   # C   (I)
    (43, [59, 62, 67]),   # G   (V)
    (45, [60, 64, 69]),   # Am  (vi)
    (41, [60, 65, 69]),   # F   (IV)
]


def sintetiza(nombre, bpm, num, den, compases, seed=11):
    rnd = random.Random(seed)
    beat = 60.0 / bpm                    # duracion del pulso de negra
    unidad = beat * (4 / den)            # duracion de la unidad del compas
    pulsos = num * compases
    total = pulsos * unidad + 1.5
    y = np.zeros(int(SR * total))

    acentos = ACENTO[(num, den)]

    for i in range(pulsos):
        pos = i % num
        a = acentos[pos]
        compas = i // num
        raiz, acorde = PROGRESION[compas % len(PROGRESION)]
        # Micro-desviacion humana de +-12 ms
        t = i * unidad + rnd.uniform(-0.012, 0.012)

        if pos == 0:
            # Tiempo fuerte: bajo en la fundamental + acorde completo.
            # El cambio de acorde aqui es lo que marca el limite de compas.
            golpe(y, t, raiz - 12, 0.42 * a, unidad * 2.4, grave=True)
            for nota in acorde:
                golpe(y, t, nota, 0.17 * a, unidad * num * 0.85)
        elif a > 0.7:
            golpe(y, t, raiz - 5, 0.24 * a, unidad * 1.4, grave=True)
            for nota in acorde:
                golpe(y, t, nota, 0.10 * a, unidad * 1.2)
        else:
            # Tiempos debiles: solo melodia, tomada del acorde vigente
            golpe(y, t, acorde[i % len(acorde)] + 12, 0.20 * a, unidad * 0.9)

    y = (y / max(1e-9, np.abs(y).max()) * 0.85).astype(np.float32)
    p = os.path.join(OUT, f"rt_{nombre}.wav")
    with wave.open(p, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(v * 32767)) for v in y))
    return p


if __name__ == "__main__":
    print(f"{'caso':<14} {'bpm':>5} {'cifra':>6} {'seg':>6}")
    for nombre, bpm, num, den, comp in CASOS:
        p = sintetiza(nombre, bpm, num, den, comp)
        dur = os.path.getsize(p) / (SR * 2)
        print(f"{nombre:<14} {bpm:>5} {f'{num}/{den}':>6} {dur:>6.1f}")
    print(f"\n{len(CASOS)} archivos en {OUT}")
