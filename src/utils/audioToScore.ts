import {
  BasicPitch,
  noteFramesToTime,
  addPitchBendsToNoteEvents,
  outputToNotesPoly,
} from '@spotify/basic-pitch';
import type { ImportedNote } from './imageToScore';

export type { ImportedNote };

const MODEL_URL = '/basic-pitch-model/model.json';
const TARGET_SR  = 22050;

let cachedModel: BasicPitch | null = null;

async function getModel(): Promise<BasicPitch> {
  if (!cachedModel) cachedModel = new BasicPitch(MODEL_URL);
  return cachedModel;
}

async function resampleTo22050(buffer: AudioBuffer): Promise<Float32Array> {
  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(buffer.duration * TARGET_SR),
    TARGET_SR
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

function midiToPitch(midi: number): string {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTES[midi % 12]}${octave}`;
}

function secondsToDuration(secs: number, bpm: number): ImportedNote['duration'] {
  const beats = secs * (bpm / 60);
  if (beats >= 3.5)  return 'whole';
  if (beats >= 1.75) return 'half';
  if (beats >= 0.875) return 'quarter';
  if (beats >= 0.4)  return 'eighth';
  return 'sixteenth';
}

export async function audioFileToScore(file: File, bpm = 120): Promise<ImportedNote[]> {
  const ctx = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } catch {
    throw new Error('No se pudo decodificar el archivo. Formatos soportados: WAV, MP3, OGG, M4A.');
  }

  const resampled = await resampleTo22050(audioBuffer);
  const model = await getModel();

  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];

  await model.evaluateModel(
    resampled,
    (f, o, c) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    () => {}
  );

  const rawNotes = noteFramesToTime(
    addPitchBendsToNoteEvents(
      contours,
      outputToNotesPoly(frames, onsets, 0.25, 0.25, 5)
    )
  );

  return rawNotes
    .filter(n => n.amplitude > 0.1)
    .slice(0, 32)
    .map(n => ({
      pitch: midiToPitch(n.pitchMidi),
      duration: secondsToDuration(n.durationSeconds, bpm),
      midi: n.pitchMidi,
    }));
}
