export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth'
export type Accidental = 'sharp' | 'flat' | 'natural' | null
export type Articulation = 'none' | 'staccato' | 'tenuto' | 'accent' | 'marcato' | 'staccatissimo' | 'portato'
export type Dynamic = 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff' | 'sfz' | 'sfp' | 'fp'
export type Ornament =
  | 'none' | 'trill' | 'trill-slow' | 'mordent' | 'mordent-inv'
  | 'turn' | 'appoggiatura' | 'acciaccatura'

export interface NoteData {
  id: string
  pitch: string       // e.g. "C4", "A#5"
  octave: number
  duration: Duration
  accidental: Accidental
  articulation: Articulation
  dynamic: Dynamic
  ornament: Ornament
  beat: number
  measure: number
}

export interface MeasureData {
  id: string
  notes: NoteData[]
}

export interface ScoreData {
  title: string
  composer: string
  instrument: string
  timeSignature: [number, number]
  keySignature: number  // sharps: positive, flats: negative
  measures: MeasureData[]
}
