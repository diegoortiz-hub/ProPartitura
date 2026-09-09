"""
Precisión de detección de tempo y compás sobre material con verdad conocida.

    python tests/test_rhythm.py

Genera el banco si falta y reporta aciertos. No es un test de aprobado/suspenso
sino una medición: el objetivo es poder comparar un cambio contra el estado
anterior en vez de decidir por intuición.

Estado medido el 2026-09-09 (commit 4997069):
    tempo  4/6 dentro de ±2%   error medio 13.9%
    compás 5/6

Advertencia sobre el banco: la primera versión no tenía progresión armónica y
daba 6/6 en tempo. Al añadir acordes sostenidos —que enmascaran los ataques de
los tiempos débiles, como ocurre en la música real— el resultado bajó a 4/6. La
cifra alta era optimismo del banco, no calidad del detector. Cualquier banco
nuevo debe incluir armonía sostenida o volverá a mentir.
"""
import os
import sys

import librosa
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import rhythm                      # noqa: E402
from bench_rhythm import CASOS, sintetiza, OUT   # noqa: E402

TOL_PCT = 2.0


def main() -> int:
    print(f"{'caso':<14} {'bpm real':>9} {'bpm det':>8} {'err':>7} "
          f"{'cifra':>7} {'detectada':>10} {'conf':>6}")
    print("-" * 66)

    errs: list[float] = []
    ok_t = ok_m = 0

    for nombre, bpm, num, den, comp in CASOS:
        path = os.path.join(OUT, f"rt_{nombre}.wav")
        if not os.path.exists(path):
            path = sintetiza(nombre, bpm, num, den, comp)

        y, sr = librosa.load(path, sr=22050, mono=True)
        r = rhythm.analyze(y, sr)

        det, ts = r["tempoExact"], r["timeSignature"]
        real_ts = f"{num}/{den}"
        err = abs(det - bpm) / bpm * 100
        errs.append(err)

        t_ok = err < TOL_PCT
        m_ok = ts == real_ts
        ok_t += t_ok
        ok_m += m_ok

        marca = "OK" if (t_ok and m_ok) else ("~" if (t_ok or m_ok) else "!!")
        print(f"{nombre:<14} {bpm:>9} {det:>8.1f} {err:>6.1f}% "
              f"{real_ts:>7} {ts:>10} {r['meterConfidence']:>6.2f}  {marca}")

    n = len(CASOS)
    print("-" * 66)
    print(f"Tempo  : {ok_t}/{n} dentro de ±{TOL_PCT}%   error medio {np.mean(errs):.1f}%")
    print(f"Compás : {ok_m}/{n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
