import * as Tone from 'tone';

// ── Salamander Grand Piano via Tone.js Sampler ────────────────────────────────
// Real piano samples recorded from a Yamaha C5 grand piano.
// Tone.js interpolates pitch-shifted versions for notes between samples.

const SAMPLE_NOTES = [
  'A0','C1','D#1','F#1',
  'A1','C2','D#2','F#2',
  'A2','C3','D#3','F#3',
  'A3','C4','D#4','F#4',
  'A4','C5','D#5','F#5',
  'A5','C6','D#6','F#6',
  'A6','C7',
];

const urls: Record<string, string> = {};
for (const note of SAMPLE_NOTES) {
  urls[note] = `${note.replace('#', 's')}.mp3`;
}

let sampler: Tone.Sampler | null = null;
let samplerReady = false;
let samplerLoading = false;

function getSampler(): Promise<Tone.Sampler> {
  if (sampler && samplerReady) return Promise.resolve(sampler);
  if (samplerLoading) {
    return new Promise(res => {
      const check = setInterval(() => {
        if (samplerReady && sampler) { clearInterval(check); res(sampler); }
      }, 100);
    });
  }

  samplerLoading = true;
  return new Promise((resolve, reject) => {
    sampler = new Tone.Sampler({
      urls,
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      onload: () => {
        samplerReady = true;
        samplerLoading = false;
        resolve(sampler!);
      },
      onerror: (err) => {
        console.warn('[audio] Salamander load failed, using fallback synth:', err);
        samplerLoading = false;
        reject(err);
      },
    }).toDestination();
  });
}

// Fallback: synth that sounds decent if samples fail to load
function makeFallbackSynth() {
  return new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 3.01,
    modulationIndex: 14,
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.002, decay: 0.3, sustain: 0.1, release: 1.2 },
    modulation: { type: 'square' },
    modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.2, release: 0.1 },
  }).toDestination();
}

let fallbackSynth: Tone.PolySynth | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

export async function ensureSamplerLoaded(): Promise<void> {
  await Tone.start();
  try {
    await getSampler();
  } catch {
    // fallback will be used automatically
  }
}

export async function playNote(
  pitch: string = 'C4',
  duration: number = 0.6,
  velocity: number = 80,
): Promise<void> {
  try {
    await Tone.start();

    // Normalize pitch: "C#4" stays, "Cb4" → "B3" handled by Tone internally
    const normalised = pitch.replace(/b(\d)/, (_, oct) => {
      // keep flats as-is — Tone handles enharmonics
      return `b${oct}`;
    });

    const vel = Math.min(1, velocity / 127);
    const dur = Math.max(0.05, duration);

    if (samplerReady && sampler) {
      sampler.triggerAttackRelease(normalised, dur, Tone.now(), vel);
    } else {
      // Try to load sampler, play immediately with fallback in the meantime
      if (!fallbackSynth) fallbackSynth = makeFallbackSynth();
      fallbackSynth.triggerAttackRelease(normalised, dur, Tone.now(), vel);
      // Kick off background load so next notes use real piano
      getSampler().catch(() => {});
    }
  } catch {
    // silence
  }
}

export function playMidi(midi: number, duration = 0.6, velocity = 80): void {
  const pitch = Tone.Frequency(midi, 'midi').toNote() as string;
  playNote(pitch, duration, velocity);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Pre-warm: start loading samples as soon as this module is imported
// (fires on first user gesture via Tone.start guard)
if (typeof window !== 'undefined') {
  window.addEventListener('click', () => { ensureSamplerLoaded(); }, { once: true });
}
