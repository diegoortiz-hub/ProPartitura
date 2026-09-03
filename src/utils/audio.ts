// Web Audio API engine for ProPartituras

export type NoteName =
  | 'C2' | 'C#2' | 'Db2' | 'D2' | 'D#2' | 'Eb2' | 'E2' | 'F2' | 'F#2' | 'Gb2' | 'G2' | 'G#2' | 'Ab2' | 'A2' | 'A#2' | 'Bb2' | 'B2'
  | 'C3' | 'C#3' | 'Db3' | 'D3' | 'D#3' | 'Eb3' | 'E3' | 'F3' | 'F#3' | 'Gb3' | 'G3' | 'G#3' | 'Ab3' | 'A3' | 'A#3' | 'Bb3' | 'B3'
  | 'C4' | 'C#4' | 'Db4' | 'D4' | 'D#4' | 'Eb4' | 'E4' | 'F4' | 'F#4' | 'Gb4' | 'G4' | 'G#4' | 'Ab4' | 'A4' | 'A#4' | 'Bb4' | 'B4'
  | 'C5' | 'C#5' | 'Db5' | 'D5' | 'D#5' | 'Eb5' | 'E5' | 'F5' | 'F#5' | 'Gb5' | 'G5' | 'G#5' | 'Ab5' | 'A5' | 'A#5' | 'Bb5' | 'B5'
  | 'C6' | 'C#6' | 'Db6' | 'D6' | 'D#6' | 'Eb6' | 'E6' | 'F6' | 'F#6' | 'Gb6' | 'G6' | 'G#6' | 'Ab6' | 'A6' | 'A#6' | 'Bb6' | 'B6'
  | 'C7'

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Build frequency map: C2 (MIDI 36) to C7 (MIDI 96)
function buildNoteFrequencies(): Record<string, number> {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const enharmonics: Record<string, string> = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
  }
  const map: Record<string, number> = {}

  for (let octave = 2; octave <= 7; octave++) {
    for (let i = 0; i < 12; i++) {
      const midi = 24 + (octave - 2) * 12 + i
      if (midi > 96) break
      const name = noteNames[i]
      const key = `${name}${octave}`
      const freq = midiToFreq(midi)
      map[key] = freq
      if (enharmonics[name]) {
        map[`${enharmonics[name]}${octave}`] = freq
      }
    }
  }
  return map
}

export const NOTE_FREQUENCIES: Record<string, number> = buildNoteFrequencies()

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

export function playNote(
  note: string,
  durationSeconds: number,
  velocity: number = 90,
): void {
  const freq = NOTE_FREQUENCIES[note]
  if (!freq) return

  const ctx = getAudioContext()
  const now = ctx.currentTime

  // Logarithmic velocity curve
  const gainLevel = Math.pow(velocity / 127, 2) * 0.4

  const masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(gainLevel, now)
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds + 0.1)
  masterGain.connect(ctx.destination)

  function makeOsc(type: OscillatorType, freqMult: number, gain: number, decayMult: number = 1) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq * freqMult, now)
    g.gain.setValueAtTime(gain, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds * decayMult + 0.05)
    osc.connect(g)
    g.connect(masterGain)
    osc.start(now)
    osc.stop(now + durationSeconds + 0.15)
  }

  // Fundamental: sine
  makeOsc('sine', 1, 1, 1)
  // OSC2: triangle harmonic 2
  makeOsc('triangle', 2, 0.3, 0.8)
  // OSC3: sawtooth harmonic 3
  makeOsc('sawtooth', 3, 0.12, 0.6)
  // OSC4: sine harmonic 5
  makeOsc('sine', 5, 0.06, 0.5)
  // OSC5: square harmonic 7, only for notes > 60ms
  if (durationSeconds > 0.06) {
    makeOsc('square', 7, 0.03, 0.4)
  }
}
