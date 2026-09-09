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
}

// Audiveris en Node (port 3001) — Oemer en Python (port 3002) como fallback.
// Audiveris va primero porque Oemer está roto en este entorno: sus modelos ONNX
// son incompatibles con onnxruntime 1.29 en Python 3.12 (shape mismatch 31x32) y
// tarda ~25 s en fallar. Si algún día se arregla Oemer, invertir el orden.
const AUDIVERIS_URL = import.meta.env.VITE_OMR_URL   ?? 'http://localhost:3001';
const OEMER_URL     = import.meta.env.VITE_OEMER_URL ?? 'http://localhost:3002';

export async function imageToScore(file: File): Promise<ImportedScore> {
  let audiverisError: string | null = null;

  // Intento 1: Audiveris (funcional)
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${AUDIVERIS_URL}/api/omr`, { method: 'POST', body: form });
    const json = await res.json();
    if (res.ok && json.notes?.length) return json as ImportedScore;
    audiverisError = json.error ?? `Error ${res.status} del servidor OMR`;
  } catch {
    audiverisError = 'El backend de Audiveris (puerto 3001) no está disponible.';
  }

  // Intento 2: Oemer (deep learning) — normalmente falla, pero se intenta por si acaso
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${OEMER_URL}/api/omr-image`, { method: 'POST', body: form });
    if (res.ok) {
      const json = await res.json();
      if (json.notes?.length) return json as ImportedScore;
    }
  } catch {
    // Oemer no disponible — se reporta el error de Audiveris, que es más informativo
  }

  throw new Error(audiverisError ?? 'No se pudo analizar la imagen.');
}
