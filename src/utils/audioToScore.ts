import type { ImportedNote } from './imageToScore';

export type { ImportedNote };

function freqToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

function midiToPitch(midi: number): string {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTES[midi % 12]}${octave}`;
}

function autocorrelate(buf: Float32Array, sampleRate: number): number {
  const half = Math.floor(buf.length / 2);
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.008) return -1;

  let bestOffset = -1;
  let bestCorr = -1;

  for (let offset = 20; offset < half; offset++) {
    let corr = 0;
    for (let i = 0; i < half; i++) corr += buf[i] * buf[i + offset];
    corr /= half;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestOffset = offset;
    }
  }

  if (bestCorr > 0.005 && bestOffset > 0) return sampleRate / bestOffset;
  return -1;
}

function medianFilter(arr: number[], k = 3): number[] {
  return arr.map((_, i) => {
    const win = arr.slice(Math.max(0, i - k), i + k + 1).filter(v => v > 0).sort((a, b) => a - b);
    return win.length ? win[Math.floor(win.length / 2)] : 0;
  });
}

function countToDuration(count: number): ImportedNote['duration'] {
  if (count >= 16) return 'whole';
  if (count >= 8) return 'half';
  if (count >= 4) return 'quarter';
  if (count >= 2) return 'eighth';
  return 'sixteenth';
}

export async function audioFileToScore(file: File, bpm = 120): Promise<ImportedNote[]> {
  const ctx = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } catch {
    throw new Error(
      'No se pudo decodificar el archivo de audio. Formatos soportados: WAV, MP3, OGG, M4A.'
    );
  }

  const channelData = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;
  const bps = bpm / 60;
  const windowSize = Math.floor(sr / (bps * 4)); // one sixteenth note
  const hop = Math.floor(windowSize * 0.5);

  const rawMidi: number[] = [];
  for (let i = 0; i + windowSize < channelData.length; i += hop) {
    const seg = channelData.slice(i, i + windowSize);
    const freq = autocorrelate(seg, sr);
    if (freq > 55 && freq < 2500) {
      const midi = freqToMidi(freq);
      rawMidi.push(midi >= 36 && midi <= 96 ? midi : 0);
    } else {
      rawMidi.push(0);
    }
    if (rawMidi.length >= 192) break;
  }

  const smoothed = medianFilter(rawMidi, 2);

  // Group consecutive same pitches
  const groups: { midi: number; count: number }[] = [];
  for (const midi of smoothed) {
    if (midi === 0) continue;
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.midi - midi) <= 1) {
      last.count++;
    } else {
      groups.push({ midi, count: 1 });
    }
  }

  return groups
    .filter(g => g.count >= 2)
    .slice(0, 16)
    .map(g => ({
      pitch: midiToPitch(g.midi),
      duration: countToDuration(g.count),
      midi: g.midi,
    }));
}
