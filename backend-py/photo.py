"""
photo.py — Prepara una foto de partitura para que un motor de OMR la lea.

Una foto de móvil tiene resolución de sobra: 12 MP sobre una hoja A4 son unos
250 dpi, que dan ~17 px de interlineado. Lo que la estropea es todo lo demás:

  perspectiva   la hoja se fotografía en ángulo y los pentagramas convergen
  inclinación   basta 1-2 grados para que el detector de pentagramas falle
  iluminación   sombras y brillos hacen que un umbral global no sirva
  encuadre      la hoja ocupa parte del cuadro y el resto son píxeles perdidos

Es el mismo tratamiento que aplica un escáner de documentos, adaptado a lo que
importa en una partitura: que las líneas del pentagrama queden rectas,
horizontales y con el grosor suficiente.

El paso final es el que decide el resultado: se mide el interlineado real y se
escala para dejarlo en 20 px, que es donde Audiveris trabaja cómodo. Medido:
por debajo de 8 px las duraciones dejan de ser fiables aunque las alturas
sigan bien.
"""
from __future__ import annotations

import cv2
import numpy as np

# Interlineado al que se deja la imagen. Audiveris pide 16 como mínimo.
INTERLINEA_OBJETIVO = 20.0

# Techo de tamaño: más allá solo se gana tiempo de proceso
MAX_LADO = 4200


# ─── Medición ────────────────────────────────────────────────────────────────

def medir_interlinea(gris: np.ndarray) -> float | None:
    """
    Distancia entre líneas del pentagrama, en píxeles.

    Se busca sobre el perfil de oscuridad por filas: las líneas del pentagrama
    son las filas sistemáticamente más oscuras de la imagen.
    """
    h, w = gris.shape[:2]
    if h < 20:
        return None
    osc = 255.0 - gris.mean(axis=1)
    umbral = osc.mean() + 1.6 * osc.std()
    filas = np.where(osc > umbral)[0]
    if len(filas) < 6:
        return None

    centros, grupo = [], [filas[0]]
    for f in filas[1:]:
        if f - grupo[-1] <= 2:
            grupo.append(f)
        else:
            centros.append(float(np.mean(grupo)))
            grupo = [f]
    centros.append(float(np.mean(grupo)))
    if len(centros) < 6:
        return None

    difs = np.diff(centros)
    difs = difs[(difs > 1.5) & (difs < 80)]
    return float(np.median(difs)) if len(difs) >= 4 else None


# ─── Perspectiva ─────────────────────────────────────────────────────────────

def _ordenar_esquinas(pts: np.ndarray) -> np.ndarray:
    """Ordena cuatro puntos como superior-izq, sup-der, inf-der, inf-izq."""
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).ravel()
    return np.array([
        pts[np.argmin(s)],   # arriba-izquierda: menor x+y
        pts[np.argmin(d)],   # arriba-derecha:   menor y-x
        pts[np.argmax(s)],   # abajo-derecha
        pts[np.argmax(d)],   # abajo-izquierda
    ], dtype=np.float32)


def corregir_perspectiva(img: np.ndarray) -> tuple[np.ndarray, bool]:
    """
    Busca la hoja en la foto y la endereza a rectángulo.

    Solo actúa si encuentra un cuadrilátero convincente que ocupe buena parte
    del cuadro. Ante la duda no toca nada: deformar una imagen que ya estaba
    bien es peor que dejarla como está.
    """
    h, w = img.shape[:2]
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Desenfoque previo: sin él, el texto genera contornos que confunden
    borde = cv2.Canny(cv2.GaussianBlur(gris, (5, 5), 0), 40, 120)
    borde = cv2.dilate(borde, np.ones((3, 3), np.uint8), iterations=2)

    contornos, _ = cv2.findContours(borde, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contornos:
        return img, False

    area_img = float(h * w)
    for c in sorted(contornos, key=cv2.contourArea, reverse=True)[:5]:
        area = cv2.contourArea(c)
        if area < 0.35 * area_img:      # la hoja tiene que dominar el cuadro
            break
        aprox = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
        if len(aprox) != 4 or not cv2.isContourConvex(aprox):
            continue

        src = _ordenar_esquinas(aprox.reshape(4, 2).astype(np.float32))
        (tl, tr, br, bl) = src
        ancho = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
        alto = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
        if ancho < 200 or alto < 200:
            continue

        dst = np.array([[0, 0], [ancho - 1, 0],
                        [ancho - 1, alto - 1], [0, alto - 1]], dtype=np.float32)
        M = cv2.getPerspectiveTransform(src, dst)
        return cv2.warpPerspective(img, M, (ancho, alto),
                                   flags=cv2.INTER_CUBIC,
                                   borderMode=cv2.BORDER_REPLICATE), True

    return img, False


# ─── Inclinación ─────────────────────────────────────────────────────────────

def enderezar(img: np.ndarray) -> tuple[np.ndarray, float]:
    """
    Gira la imagen hasta dejar los pentagramas horizontales.

    El ángulo sale de las propias líneas del pentagrama, que son los segmentos
    largos y rectos más fiables de una partitura. Basta un grado de inclinación
    para que el detector de pentagramas empiece a perder líneas.
    """
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    bordes = cv2.Canny(gris, 50, 150, apertureSize=3)
    largo_min = max(60, img.shape[1] // 6)
    lineas = cv2.HoughLinesP(bordes, 1, np.pi / 720, threshold=100,
                             minLineLength=largo_min, maxLineGap=12)
    if lineas is None:
        return img, 0.0

    # OpenCV 4 devuelve (N, 1, 4) y OpenCV 5 devuelve (N, 4): se normaliza
    segs = np.asarray(lineas).reshape(-1, 4)

    angulos = []
    for x1, y1, x2, y2 in segs:
        a = np.degrees(np.arctan2(float(y2 - y1), float(x2 - x1)))
        if abs(a) < 20:                 # solo las casi horizontales
            angulos.append(a)
    if len(angulos) < 5:
        return img, 0.0

    ang = float(np.median(angulos))
    if abs(ang) < 0.15:                 # ya está recta; girar solo añadiría borrón
        return img, 0.0

    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), ang, 1.0)
    girada = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC,
                            borderMode=cv2.BORDER_REPLICATE)
    return girada, ang


# ─── Iluminación ─────────────────────────────────────────────────────────────

def normalizar_iluminacion(img: np.ndarray) -> np.ndarray:
    """
    Quita sombras y degradados de luz.

    Se estima el fondo con un desenfoque muy amplio —a esa escala solo queda la
    iluminación, no la tinta— y se divide la imagen por él. Es lo que permite
    que una foto con sombra en una esquina se binarice de una pieza.
    """
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    k = max(31, (min(gris.shape[:2]) // 12) | 1)     # impar y proporcional
    fondo = cv2.GaussianBlur(gris, (k, k), 0)
    norm = cv2.divide(gris, fondo, scale=255)
    # Un poco de realce local de contraste para las líneas finas
    return cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(norm)


def binarizar(gris: np.ndarray) -> np.ndarray:
    """
    Blanco y negro con umbral local.

    ⚠️ NO se usa en el camino normal, y conviene saber por qué antes de
    reactivarla. Audiveris trae su propia binarización, afinada para partituras.
    Encadenar la nuestra antes borraba símbolos pequeños: en una prueba con una
    pieza en Sol menor desaparecieron los bemoles de la armadura, y todos los
    Mi♭ y Si♭ pasaron a leerse naturales. Ocho notas de dieciocho salían un
    semitono altas por eso.

    Se conserva para material con iluminación tan extrema que el gris no sirva,
    pero entonces hay que comprobar que la armadura sobreviva.
    """
    bin_ = cv2.adaptiveThreshold(
        gris, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY,
        blockSize=51, C=9)
    return cv2.morphologyEx(bin_, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))


# ─── Escalado al interlineado objetivo ───────────────────────────────────────

def escalar(gris: np.ndarray, objetivo: float = INTERLINEA_OBJETIVO
            ) -> tuple[np.ndarray, float | None, float]:
    """
    Lleva el interlineado al valor donde el motor de OMR trabaja cómodo.

    Ampliar no crea información —un puntillo de 1.6 px sigue siendo un puntillo
    borroso— pero sí evita que el motor descarte símbolos por pequeños. Reducir
    una foto enorme, en cambio, sí ayuda: acelera el proceso sin perder nada.
    """
    il = medir_interlinea(gris)
    if il is None or il <= 0:
        return gris, None, 1.0

    factor = objetivo / il
    h, w = gris.shape[:2]
    # No pasar del techo de tamaño ni encoger por debajo de lo legible
    factor = min(factor, MAX_LADO / max(h, w))
    if abs(factor - 1.0) < 0.05:
        return gris, il, 1.0

    interp = cv2.INTER_CUBIC if factor > 1 else cv2.INTER_AREA
    salida = cv2.resize(gris, (int(w * factor), int(h * factor)), interpolation=interp)
    return salida, il, factor


# ─── Orquestador ─────────────────────────────────────────────────────────────

def parece_foto(src: str) -> tuple[bool, dict]:
    """
    Decide si la imagen es una foto o un escaneo/captura ya limpia.

    Importa acertar: el tratamiento de foto rescata una foto que de otro modo
    sería ilegible, pero sobre un escaneo limpio no aporta y puede empeorar el
    resultado. Se aplica solo cuando hay señales claras de cámara.

    Las tres señales, cualquiera basta:
      inclinación   una hoja escaneada llega recta; una foto casi nunca
      iluminación   una foto tiene degradado de luz; un escaneo es uniforme
      perspectiva   se detecta la hoja como cuadrilátero dentro del cuadro
    """
    img = cv2.imread(src)
    if img is None:
        return False, {}

    h, w = img.shape[:2]
    # Se trabaja en pequeño: estas señales no necesitan resolución
    f = min(1.0, 1200 / max(h, w))
    chico = cv2.resize(img, (int(w * f), int(h * f))) if f < 1 else img
    gris = cv2.cvtColor(chico, cv2.COLOR_BGR2GRAY)

    # 1. Inclinación de los pentagramas
    _, angulo = enderezar(chico)

    # 2. Desigualdad de iluminación.
    #
    # Se mide sobre el PAPEL, no sobre la imagen entera: una partitura tiene
    # zonas densas y márgenes vacíos, así que el brillo medio varía por el
    # contenido aunque la luz sea perfecta. El papel es lo claro de cada
    # región —el percentil 90— y en un escaneo vale lo mismo en todas; en una
    # foto con sombra, no.
    gh, gw = gris.shape[:2]
    ph, pw = gh // 4, gw // 4
    papel = []
    for i in range(4):
        for j in range(4):
            tile = gris[i*ph:(i+1)*ph, j*pw:(j+1)*pw]
            if tile.size > 100:
                papel.append(float(np.percentile(tile, 90)))
    desigualdad = float(np.std(papel)) if len(papel) >= 8 else 0.0

    # 3. Perspectiva detectable
    _, hay_perspectiva = corregir_perspectiva(chico)

    señales = {
        "angulo": round(abs(angulo), 2),
        "desigualdadLuz": round(desigualdad, 1),
        "perspectiva": hay_perspectiva,
    }
    # Umbrales calibrados sobre casos reales: una captura web limpia da ~2 de
    # desigualdad y 0 de ángulo; una foto con sombra pasa de 12.
    es_foto = abs(angulo) > 0.4 or desigualdad > 12.0 or hay_perspectiva
    return es_foto, señales


def preparar(src: str, dst: str, binario: bool = False) -> dict:
    """
    Deja una foto lista para el motor de OMR y cuenta qué hizo.

    Se entrega en escala de grises, no binarizada: Audiveris trae su propia
    binarización afinada para partituras y encadenar otra antes borra símbolos
    pequeños. Ver la nota en `binarizar`.

    Devuelve los datos de diagnóstico para poder decirle al usuario por qué su
    imagen va a dar buen o mal resultado, en vez de dejarle adivinando.
    """
    img = cv2.imread(src)
    if img is None:
        raise ValueError("No se pudo leer la imagen.")

    alto0, ancho0 = img.shape[:2]

    # Una foto enorme se reduce antes de analizarla: el trabajo pesado no
    # necesita 48 MP y así todo lo demás va mucho más rápido
    if max(alto0, ancho0) > MAX_LADO * 1.6:
        f = (MAX_LADO * 1.6) / max(alto0, ancho0)
        img = cv2.resize(img, (int(ancho0 * f), int(alto0 * f)),
                         interpolation=cv2.INTER_AREA)

    img, hubo_perspectiva = corregir_perspectiva(img)
    img, angulo = enderezar(img)

    gris = normalizar_iluminacion(img)
    il_antes = medir_interlinea(gris)
    gris, _, factor = escalar(gris)
    salida = binarizar(gris) if binario else gris
    il_despues = medir_interlinea(salida)

    cv2.imwrite(dst, salida)

    return {
        "originalPx": [ancho0, alto0],
        "finalPx": [salida.shape[1], salida.shape[0]],
        "perspectivaCorregida": hubo_perspectiva,
        "anguloCorregido": round(angulo, 2),
        "interlineaAntes": round(il_antes, 1) if il_antes else None,
        "interlineaDespues": round(il_despues, 1) if il_despues else None,
        "factorEscala": round(factor, 2),
    }


if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 3:
        print(json.dumps({"error": "Uso: photo.py <entrada> <salida> [--forzar]"}))
        raise SystemExit(1)

    src, dst = sys.argv[1], sys.argv[2]
    forzar = "--forzar" in sys.argv
    try:
        es_foto, señales = parece_foto(src)
        if not (es_foto or forzar):
            # Escaneo o captura limpia: el tratamiento de foto no aporta aquí,
            # así que se indica que siga el camino normal
            print(json.dumps({"aplicado": False, "esFoto": False, "señales": señales}))
        else:
            info = preparar(src, dst)
            print(json.dumps({"aplicado": True, "esFoto": es_foto,
                              "señales": señales, **info}))
    except Exception as e:
        print(json.dumps({"error": f"{type(e).__name__}: {e}"}))
        raise SystemExit(1)
