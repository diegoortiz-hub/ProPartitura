let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Full 88-note piano range C2–C7
export const NOTE_FREQUENCIES: Record<string, number> = {
  'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31,
  'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
  'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
  'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46,
  'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'E6': 1318.51, 'F6': 1396.91,
  'F#6': 1479.98, 'G6': 1567.98, 'G#6': 1661.22, 'A6': 1760.00, 'A#6': 1864.66, 'B6': 1975.53,
  'C7': 2093.00,
};

export function playNote(pitch: string = 'C4', duration: number = 0.6, velocity: number = 80) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const freq = NOTE_FREQUENCIES[pitch] ?? midiToFreq(60);
    const gainLevel = Math.pow(velocity / 127, 1.8) * 0.4;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(gainLevel, now + 0.012);
    masterGain.gain.exponentialRampToValueAtTime(gainLevel * 0.55, now + 0.18);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(ctx.destination);

    const harmonics: [OscillatorType, number, number][] = [
      ['triangle', 1, 1.0],
      ['sine', 2, 0.45],
      ['sine', 3, 0.25],
      ['sine', 4, 0.15],
      ['sawtooth', 5, 0.05],
    ];

    for (const [type, mult, level] of harmonics) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, now);
      osc.type = type;
      osc.frequency.setValueAtTime(freq * mult, now);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + duration);
    }
  } catch {
    // silent fail
  }
}

export function playMidi(midi: number, duration: number = 0.6, velocity: number = 80) {
  const freq = midiToFreq(midi);
  const pitch = Object.entries(NOTE_FREQUENCIES).find(([, f]) => Math.abs(f - freq) < 1)?.[0] ?? 'C4';
  playNote(pitch, duration, velocity);
}
