export interface ImportedNote {
  pitch: string;
  duration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
  midi: number;
  /** Los silencios son notas con pitch "rest" y midi -1. Se conservan porque
   *  son los que hacen cuadrar la suma de tiempos con la cifra indicadora. */
  isRest?: boolean;
  /** Compás y posición dentro de él, calculados por music21 en el backend.
   *  Se respetan tal cual: reagruparlos en el cliente movería las barras. */
  measure?: number;
  beat?: number;
  quarterLength?: number;
  /** Todas las notas del acorde. La reproducción las toca juntas; el pentagrama
   *  simple dibuja solo `pitch`, que es la más aguda. */
  midis?: number[];
}

export interface ScoreVoice {
  voice: string;
  notes: ImportedNote[];
}

/** Partitura completa devuelta por el backend. */
export interface ImportedScore {
  notes: ImportedNote[];
  voices?: ScoreVoice[];
  musicXml?: string | null;
  timeSignature?: string;
  tempo?: number;
  keyLabel?: string | null;
  measures?: number;
  engine?: string;
  /** Confianza en la cifra indicadora (0..1). Por debajo de ~0.25 conviene que
   *  el usuario la revise: el compás compuesto es difícil de distinguir del
   *  simple solo por acentos. */
  meterConfidence?: number;
}

// Audiveris en Node (port 3001) — Oemer en Python (port 3002) como fallback.
// Audiveris va primero porque Oemer está roto en este entorno: sus modelos ONNX
// son incompatibles con onnxruntime 1.29 en Python 3.12 (shape mismatch 31x32) y
// tarda ~25 s en fallar. Si algún día se arregla Oemer, invertir el orden.
const AUDIVERIS_URL = import.meta.env.VITE_OMR_URL   ?? 'http://localhost:3001';
const OEMER_URL     = import.meta.env.VITE_OEMER_URL ?? 'http://localhost:3002';

// Audiveris procesa una partitura densa en 30-90 s; este techo deja margen sin
// dejar la interfaz colgada para siempre si el proceso se atasca.
const OMR_TIMEOUT_MS = 150_000;

/** Distingue "no llegué al servidor" de "el servidor me respondió que no pudo". */
class BackendDownError extends Error {}

async function postImage(url: string, file: File, timeoutMs: number): Promise<Response> {
  const form = new FormData();
  form.append('file', file);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { method: 'POST', body: form, signal: ctrl.signal });
  } catch (e) {
    // fetch solo lanza por fallo de red o abort; un 500 llega como respuesta
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(
        `El análisis superó los ${Math.round(timeoutMs / 1000)} s. ` +
        'Prueba con una imagen de menor resolución o con menos pentagramas.'
      );
    }
    throw new BackendDownError(url);
  } finally {
    clearTimeout(timer);
  }
}

export async function imageToScore(file: File): Promise<ImportedScore> {
  // Intento 1: Audiveris
  try {
    const res = await postImage(`${AUDIVERIS_URL}/api/omr`, file, OMR_TIMEOUT_MS);
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.notes?.length) return json as ImportedScore;

    // Audiveris respondió: sabe lo que pasó y su mensaje es el más útil que hay.
    // No se prueba Oemer aquí — está roto en este entorno y solo añadiría 25 s
    // de espera para terminar mostrando este mismo error.
    throw new Error(json.error ?? `El servidor OMR respondió ${res.status}.`);
  } catch (e) {
    if (!(e instanceof BackendDownError)) throw e;
    // Solo si no se alcanzó Audiveris tiene sentido buscar otra vía
  }

  // Intento 2: Oemer, únicamente porque Audiveris no está disponible
  try {
    const res = await postImage(`${OEMER_URL}/api/omr-image`, file, OMR_TIMEOUT_MS);
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json.notes?.length) return json as ImportedScore;
    }
  } catch {
    // También caído: se reporta abajo con instrucciones concretas
  }

  throw new Error(
    'El servidor de reconocimiento no está disponible. ' +
    'Arranca el backend con "node server.js" dentro de la carpeta backend.'
  );
}
