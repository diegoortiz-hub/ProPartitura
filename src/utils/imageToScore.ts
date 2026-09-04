export interface ImportedNote {
  pitch: string;
  duration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
  midi: number;
}

// Oemer en Python (port 3002) — Audiveris en Node (port 3001) como fallback
const OEMER_URL    = import.meta.env.VITE_OEMER_URL    ?? 'http://localhost:3002';
const AUDIVERIS_URL = import.meta.env.VITE_OMR_URL     ?? 'http://localhost:3001';

export async function imageToScore(file: File): Promise<ImportedNote[]> {
  // Intento 1: Oemer (deep learning)
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${OEMER_URL}/api/omr-image`, {
      method: 'POST', body: form,
    });
    if (res.ok) {
      const json = await res.json();
      if (json.notes?.length) return json.notes as ImportedNote[];
    }
  } catch {
    // Oemer no disponible — continúa con Audiveris
  }

  // Intento 2: Audiveris (fallback)
  const form2 = new FormData();
  form2.append('file', file);
  const res2 = await fetch(`${AUDIVERIS_URL}/api/omr`, {
    method: 'POST', body: form2,
  });
  const json2 = await res2.json();
  if (!res2.ok) throw new Error(json2.error ?? `Error ${res2.status} del servidor OMR`);
  return json2.notes as ImportedNote[];
}
