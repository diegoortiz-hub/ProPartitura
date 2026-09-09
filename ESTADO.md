# Estado del proyecto

Documento de contexto: qué hace el sistema hoy, qué se midió, qué está resuelto y
qué queda abierto. Actualizado el 2026-09-09.

**Restricción de diseño que manda sobre todo lo demás:** sin GPU y sin APIs de
pago. Todo lo que sigue corre en CPU con modelos locales.

---

## Arquitectura

| Servicio | Puerto | Arranque | Rol |
|---|---|---|---|
| Frontend | 5173 | `npm run dev` | React 19 + Vite 8 + TS + Tailwind v4 |
| Backend Python | 3002 | `python -m uvicorn server:app --port 3002` en `backend-py/` | Audio, notación, ritmo |
| Backend Node | 3001 | `node server.js` en `backend/` | OMR de imagen con Audiveris |

Los tres tienen que estar arriba. Si el 3001 se cae, la importación de imagen
falla; el mensaje de error ahora lo dice explícitamente.

### Flujo de importación

```
IMAGEN → Node:3001 → Audiveris → MXL → parse_mxl.py → notation.py → notas + MusicXML
AUDIO  → Py:3002   → MR-MT3 → MIDI → notation.py    → notas + MusicXML + voces
```

Ambas rutas comparten `backend-py/notation.py`, que es donde vive la conversión
de transcripción a partitura legible.

---

## El principio central: transcripción ≠ notación

Un motor de transcripción responde **qué suena y cuándo** (física). Una partitura
necesita **qué figura se escribe** (intención). Son dos problemas y el código los
trataba como uno.

MT3 reporta el *release acústico*: cuándo la cuerda deja de vibrar. Una negra se
escribe como negra aunque el pianista la suelte al 80%. Usar la física como si
fuera la escritura producía duraciones de 2.75 y 3.25 tiempos, que no existen
como figura.

### Las cinco etapas de `notation.py`

1. **Corrección del marco de tempo.** MT3 exporta el MIDI a 120 BPM fijo, no al
   tempo de la pieza. Medido: en una pieza a 100 BPM, la nota del tiempo 1
   aparecía en el 1.25 — el cociente exacto 120/100. Sin corregirlo *toda*
   duración queda escalada.
2. **Cuantización de ataques** a la rejilla de semicorchea.
3. **Duración por hueco entre ataques**, no por release. Como los ataques ya
   están en rejilla, toda duración es múltiplo de ella *por construcción*.
   `_fit_notatable` elige la figura que **cabe**, no la más cercana: pasarse
   solapa notas; quedarse corto deja un hueco que music21 rellena con silencio,
   que es lo que escribiría un copista.
4. **Separación de manos** en el Do central. Antes todo se aplanaba en una parte
   y los compases desbordaban (llegaban a sumar 9.75 en un 4/4).
5. **Notación con music21**: `makeMeasures` + `makeNotation` añaden silencios de
   relleno, ligaduras y barrados.

**Los compases los calcula el backend, no el cliente.** Cada evento lleva
`measure`, `beat` y `quarterLength`. Reagruparlos en el frontend hacía que las
barras discreparan del reparto real de music21.

---

## Resultados medidos

### Notación

| | Antes | Ahora |
|---|---|---|
| Suma de tiempos por compás | 9.75 en un 4/4 | exacta en 10/10 |
| Duraciones fuera de figura | 1.25, 1.75, 2.75, 3.25 | ninguna |
| Voces | todo aplanado | mano derecha + izquierda |
| MusicXML | no se generaba | sí, ambas rutas |

### Ritmo (`backend-py/tests/test_rhythm.py`)

| | Antes | Ahora |
|---|---|---|
| Tempo ±2% | 0/6 | 4/6 |
| Error medio | 52.8% | 13.9% |
| Compás | 2/6 | 5/6 |

⚠️ **Advertencia sobre el banco.** Su primera versión no tenía progresión
armónica y daba 6/6 en tempo. Al añadir acordes sostenidos —que enmascaran los
ataques de los tiempos débiles, como en la música real— cayó a 4/6. La cifra alta
era optimismo del banco, no calidad del detector. Cualquier banco nuevo debe
incluir armonía sostenida o volverá a mentir.

### Rendimiento del audio (60 s de audio denso sintético)

| Etapa | Tiempo |
|---|---|
| `librosa.load` 16 kHz | 3.1 s |
| `rhythm.analyze` | 0.3 s |
| `detect_key` | 0.6 s |
| **`model.transcribe`** | **64.1 s** ← 75% del total |
| `notation` | 1.0 s |
| **Total** | **76.2 s** (1.27× la duración) |

El coste escala con la **densidad de notas**, no solo con la duración:

| Material | Factor |
|---|---|
| Sintético poco denso, 60 s | 1.27× |
| Sintético denso (296 notas en 12 s) | 1.67× |
| Grabación real de orquesta | mucho peor — la Novena pasó de 277 s sin terminar |

Una textura orquestal real tiene muchas más voces simultáneas que cualquier
síntesis de prueba, y cada nota añade tokens que decodificar.

---

## Motores

| Motor | Estado | Notas |
|---|---|---|
| **Audiveris** (imagen) | ✅ Funciona | Java 21. Necesita imágenes de ≥1000 px de ancho |
| **MR-MT3** (audio) | ✅ Funciona | 176 MB. Precargado al arrancar |
| **music21** | ✅ Funciona | Toda la notación |
| **OSMD** (grabado) | ✅ Funciona | 152 ms para 4 compases × 2 partes |
| **Oemer** (imagen) | ❌ Roto | ONNX incompatible con onnxruntime 1.29 en Python 3.12 |
| **piano_transcription** | ❌ Sin checkpoint | El `.pth` nunca se descargó; `health` reporta `omnizart:false` |
| **Basic Pitch (Python)** | ❌ No instala | `note_seq` usa `pkgutil.ImpImporter`, removido en 3.12 |

---

## Trampas que cuestan horas si se re-descubren

### `PercussionChord` no tiene `.pitch`

MT3 transcribe batería y music21 la devuelve como `PercussionChord`, que expone
`pitches` pero **no** `pitch`. Llamar `el.pitch` lanzaba `AttributeError` con
prácticamente cualquier grabación real. Usar siempre `element_pitches()` de
`notation.py`, que además descarta la percusión: sus "notas" son códigos de
instrumento, no alturas.

### El import de OSMD que compila y falla en runtime

```typescript
// ❌ Compila. El constructor llega undefined.
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

// ✅
import * as osmdPkg from 'opensheetmusicdisplay';
const OpenSheetMusicDisplay =
  (osmdPkg as any).OpenSheetMusicDisplay ?? (osmdPkg as any).default?.OpenSheetMusicDisplay;
```

OSMD se publica como CommonJS y Vite deja sus clases bajo `default`, pero sus
tipos `.d.ts` declaran exports con nombre.

### Nunca encadenar duraciones con más de una voz

La mano izquierda se desplaza respecto a la derecha en cuanto una tiene un
silencio o una ligadura. Cada evento trae `measure` y `beat`:

```
offset_absoluto = (measure - 1) * qlPerMeasure + (beat - 1)
```

### `mt3_infer.transcribe()` recarga el modelo cada vez

Usar `get_mt3_model()` de `server.py`, que lo cachea. Cargar el checkpoint son
43 s; la inferencia, ~1 s por cada 4 s de audio.

### `float()` sobre un array de numpy

`librosa.beat.beat_track` devuelve un array. `float(tempo_arr)` lanza
`TypeError`. Usar `np.atleast_1d(x)[0]`.

---

## Detección de ritmo: hipótesis que los datos tumbaron

Todas son enfoques razonables de la literatura que **empeoraron** el resultado.
No reintentarlos sin leer esto.

| Hipótesis | Resultado |
|---|---|
| Apoyo secundario en posición 4 separa 6/8 de 3/4 | Dio `+0.016` en un 6/8 real y `+0.016` en un 3/4: ruido |
| Superflux para ataques enmascarados | Recall 0.50 → 0.47 |
| Concentración en armónicos superiores de la fase | Arregla el 6/8, rompe el 3/4 rápido |
| Contraste de acento como factor de puntuación | 4/6 → 1/6 |
| Jerarquía compás→subdivisión con precisión/exhaustividad | 4/6 → 2/6 |

**El hallazgo que sí sirve:** la métrica de cobertura contaba pulsos con energía
sobre la mediana, y esa cuenta **cae como 1/n al subdividir** (medido: 0.50, 0.33,
0.25 para n=2,3,4). Penalizaba los tempos rápidos por aritmética, no por
evidencia. Una métrica insensible a la densidad de rejilla es el camino.

---

## Lo que queda abierto

### 1. Rendimiento de MT3 — sin atajo disponible

**Se buscaron optimizaciones de CPU y ninguna sirvió.** El coste es intrínseco
al modelo sobre este hardware. Documentado con detalle para no repetir la
búsqueda.

Desglose con 12 s de audio denso (6 segmentos, 8 hilos, sin contención):

| Fase | Tiempo |
|---|---|
| `preprocess` (espectrograma) | 0.0 s |
| **`forward` (encoder + decoder)** | **20.0 s** ← el 100% |
| `decode` (tokens → MIDI) | 0.0 s |

#### Optimizaciones probadas y descartadas

| Optimización | Resultado | Por qué falla |
|---|---|---|
| **Caché KV** (`use_cache=True`) | 20.7 s → 19.9 s (**1.0×**) | El coste no está en el decodificado autorregresivo sino en el forward del encoder |
| **Cuantización int8** | 21.3 s → 80.6 s (**0.26×**, 4× peor) | Además cambió la salida un 34% (296 → 397 notas) |
| **Bajar `max_length`** | Sin efecto | La generación ya para sola en ~147 tokens; los segmentos alcanzan EOS entre 121 y 146 |
| **Más hilos** | Ya óptimo | 1→55.8 s, 2→33.1 s, 4→24.0 s, 8→20.0 s. Los 8 son el valor por defecto |

⚠️ **Cuidado al medir:** la primera medición de la caché KV dio 99.6 s contra
91.8 s y parecía concluyente. Estaba contaminada por contención de CPU con el
servidor de uvicorn corriendo en paralelo. Con la máquina limpia, los mismos
12 s dieron 20.7 s. **Matar todo proceso Python antes de cronometrar.**

#### Lo que sí queda

El coste medido es **~1.7× la duración** con material denso, y crece con la
cantidad de notas simultáneas. Como no hay forma de bajarlo, la decisión pasa al
usuario: el importador ofrece 15 s / 30 s / 1 min / 2 min con la espera estimada
al lado. El endpoint acepta `?seconds=N` (10–300).

Vía sin explorar: **entregar la partitura por tramos** conforme se transcriben,
para que las primeras notas aparezcan a los ~15 s en vez de esperar al final.
No baja el coste total pero cambia por completo la percepción.

### 2. Nivel métrico del tempo

Falla en 2 de 6 por engancharse al compás en vez de al pulso. Con acordes
sostenidos los tiempos débiles quedan hasta 12 dB por debajo y el detector de
ataques solo ve los fuertes; la rejilla que definen es la del compás. El recall
de ataques medido es 0.33–0.58, y eso es correcto, no un bug.

`meterConfidence` **no detecta este fallo**: en el vals la cifra sale mal con
confianza 0.84, porque al estar el tempo corrido los pulsos parecen coherentes.

Candidata: ritmo armónico por **picos** de novedad de croma. Los acordes cambian
en el tiempo fuerte aunque los golpes sean uniformes. Muestrearlo en puntos de
rejilla NO funciona — es señal de picos y la media sale dominada por dónde caen
las muestras (valores medidos ~0.002, ruido).

### 3. Calidad del OMR de imagen

Audiveris lee las duraciones con errores en partituras densas. No lo introduce
el pipeline: la cadena respeta lo que Audiveris entrega. Tampoco exporta los
símbolos de acorde (Gm, Ebm…).

### 4. Alcance realista

**Canción completa → partitura perfecta no es un problema resuelto**, ni
comercialmente. Lo alcanzable es un borrador editable de una grabación limpia:
piano solo o melodía dominante. Un mix denso con batería y voz no dará una
partitura decente con ningún motor, gratuito o de pago.

---

## Cómo verificar

```bash
# Precisión de tempo y compás
cd backend-py && python tests/test_rhythm.py

# Compilación del frontend
npx tsc --noEmit

# Salud de los backends
curl http://localhost:3002/api/health
curl http://localhost:3001/api/health
```

`health` del backend Python expone `mt3Loaded`: en `false` la primera
transcripción tardará ~60 s extra mientras carga el checkpoint.
