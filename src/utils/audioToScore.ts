import {
  BasicPitch,
  noteFramesToTime,
  addPitchBendsToNoteEvents,
  outputToNotesPoly,
} from '@spotify/basic-pitch';
import type { ImportedNote } from './imageToScore';

export type { ImportedNote };
export type AudioEngine = 'omnizart' | 'basic-pitch' | 'demucs';
export interface TranscribeResult  { notes: ImportedNote[]; engine: AudioEngine }
export interface OrchestraVoice    { voice: string; notes: ImportedNote[] }
export interface KeySignature      { flats: string[]; sharps: string[] }
export interface OrchestraResult   {
  voices: OrchestraVoice[];
  engine: 'demucs';
  key?: string;
  mode?: string;
  keyLabel?: string;
  keySignature?: KeySignature;
  timeSignature?: string;
  tempo?: number;
}

// ─── Configuración ───────────────────────────────────────────────────────────

const OMNIZART_URL = import.meta.env.VITE_OMNIZART_URL ?? 'http://localhost:3002';
const MODEL_URL    = '/basic-pitch-model/model.json';
const TARGET_SR    = 22050;
const MAX_AUDIO_SEC = 30; // limita el audio para no colgar el browser

// ─── Motor 1: Omnizart ───────────────────────────────────────────────────────

interface HealthInfo { omnizart?: boolean; mt3?: boolean }

async function backendHealth(): Promise<HealthInfo> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2_000);
    const res = await fetch(`${OMNIZART_URL}/api/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return await res.json();
  } catch {
    return {};
  }
}

async function transcribeWithMT3(file: File): Promise<ImportedNote[]> {
  const form = new FormData();
  form.append('file', file);
  const ctrl = new AbortController();
  // Primera vez descarga 176 MB desde HuggingFace
  const t = setTimeout(() => ctrl.abort(), 300_000);
  try {
    const res = await fetch(`${OMNIZART_URL}/api/mt3-transcribe`, {
      method: 'POST', body: form, signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? `HTTP ${res.status}`);
    }
    const { notes } = await res.json();
    return notes as ImportedNote[];
  } finally {
    clearTimeout(t);
  }
}

async function transcribeWithOmnizart(file: File, _bpm: number): Promise<ImportedNote[]> {
  const form = new FormData();
  form.append('file', file);
  const ctrl = new AbortController();
  // piano_transcription_inference tarda ~60-90s en CPU la primera vez
  const t = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(`${OMNIZART_URL}/api/audio-transcribe`, {
      method: 'POST', body: form, signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? `HTTP ${res.status}`);
    }
    const { notes } = await res.json();
    return notes as ImportedNote[];
  } finally {
    clearTimeout(t);
  }
}

// ─── Motor 2: Basic-Pitch ────────────────────────────────────────────────────

let cachedModel: BasicPitch | null = null;
async function getModel() {
  if (!cachedModel) cachedModel = new BasicPitch(MODEL_URL);
  return cachedModel;
}

async function resampleTo22050(buffer: AudioBuffer, maxSec = MAX_AUDIO_SEC): Promise<Float32Array> {
  const duration = Math.min(buffer.duration, maxSec);
  const frames   = Math.ceil(duration * TARGET_SR);
  const offlineCtx = new OfflineAudioContext(1, frames, TARGET_SR);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

const PITCH_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiToPitch(midi: number) {
  return `${PITCH_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
function secsToDuration(secs: number, bpm: number): ImportedNote['duration'] {
  const b = secs * (bpm / 60);
  if (b >= 3.5)   return 'whole';
  if (b >= 1.75)  return 'half';
  if (b >= 0.875) return 'quarter';
  if (b >= 0.4)   return 'eighth';
  return 'sixteenth';
}

async function transcribeWithBasicPitch(
  file: File,
  bpm: number,
  onProgress?: (p: number) => void
): Promise<ImportedNote[]> {
  const ctx = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } catch {
    throw new Error('No se pudo decodificar el archivo. Formatos: WAV, MP3, OGG, M4A.');
  }

  onProgress?.(10);
  const resampled = await resampleTo22050(audioBuffer);
  onProgress?.(25);

  const model = await getModel();
  onProgress?.(40);

  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];

  await model.evaluateModel(
    resampled,
    (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c); },
    (p) => onProgress?.(40 + Math.round(p * 50))
  );
  onProgress?.(95);

  const rawNotes = noteFramesToTime(
    addPitchBendsToNoteEvents(
      contours,
      outputToNotesPoly(frames, onsets, 0.25, 0.25, 5)
    )
  );

  onProgress?.(100);
  return rawNotes
    .filter(n => n.amplitude > 0.1)
    .slice(0, 32)
    .map(n => ({
      pitch: midiToPitch(n.pitchMidi),
      duration: secsToDuration(n.durationSeconds, bpm),
      midi: n.pitchMidi,
    }));
}

// ─── API pública ─────────────────────────────────────────────────────────────

export async function audioFileToScore(
  file: File,
  bpm = 120,
  onProgress?: (engine: AudioEngine, pct: number) => void
): Promise<TranscribeResult> {
  const health = await backendHealth();

  // Motor 1: MR-MT3 (multi-instrumento, mejor calidad)
  if (health.mt3) {
    onProgress?.('omnizart', 0);
    try {
      const notes = await transcribeWithMT3(file);
      onProgress?.('omnizart', 100);
      return { notes, engine: 'omnizart' };
    } catch (e) {
      console.warn('[OMR] MT3 falló, probando piano_transcription:', e);
    }
  }

  // Motor 2: piano_transcription_inference (piano, CPU)
  if (health.omnizart) {
    onProgress?.('omnizart', 0);
    try {
      const notes = await transcribeWithOmnizart(file, bpm);
      onProgress?.('omnizart', 100);
      return { notes, engine: 'omnizart' };
    } catch (e) {
      console.warn('[OMR] piano_transcription falló, usando Basic-Pitch:', e);
    }
  }

  onProgress?.('basic-pitch', 0);
  const notes = await transcribeWithBasicPitch(
    file, bpm,
    (p) => onProgress?.('basic-pitch', p)
  );
  return { notes, engine: 'basic-pitch' };
}

// ─── Transcripción orquestal con Demucs ──────────────────────────────────────

export async function audioFileToScoreFull(
  file: File,
  bpm = 120,
  onProgress?: (msg: string) => void,
): Promise<OrchestraResult> {
  const available = await omnizartAvailable();
  if (!available) {
    throw new Error('El backend Python no está disponible. Arranca backend-py/server.py primero.');
  }

  onProgress?.('Recortando a 60 s y separando fuentes con Demucs...');
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${OMNIZART_URL}/api/audio-omr-full?bpm=${bpm}`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Error ${res.status} del servidor`);
  }

  onProgress?.('Transcribiendo cada voz...');
  const data = await res.json();
  return data as OrchestraResult;
}
