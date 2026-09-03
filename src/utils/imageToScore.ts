export interface ImportedNote {
  pitch: string;
  duration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
  midi: number;
}

const OMR_URL = import.meta.env.VITE_OMR_URL ?? 'http://localhost:3001';

export async function imageToScore(file: File): Promise<ImportedNote[]> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${OMR_URL}/api/omr`, {
    method: 'POST',
    body: form,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? `Error ${res.status} del servidor OMR`);
  }

  return json.notes as ImportedNote[];
}
