interface StaffSVGProps {
  theme?: 'dark' | 'paper'
  opacity?: number
}

interface NoteGlyph {
  x: number
  cy: number
  label: string
  duration: 'quarter' | 'half'
}

const STAFF_LINES = [80, 100, 120, 140, 160] // y positions

// Mapa de pitch a y-coordinate en el pentagrama (treble clef)
const PITCH_Y: Record<string, number> = {
  E4: 160, F4: 150, G4: 140, A4: 130, B4: 120,
  C5: 110, D5: 100, E5: 90,  F5: 80,  G5: 70,
  A5: 60,  B5: 50,
}

// Compás 1: K.545 mano derecha (simplificado para 4/4)
const MEASURE1_NOTES: NoteGlyph[] = [
  { x: 110, cy: PITCH_Y['C5'], label: 'C5', duration: 'quarter' },
  { x: 175, cy: PITCH_Y['E5'], label: 'E5', duration: 'quarter' },
  { x: 240, cy: PITCH_Y['G5'], label: 'G5', duration: 'quarter' },
  { x: 305, cy: PITCH_Y['E5'], label: 'E5', duration: 'quarter' },
]

// Compás 2
const MEASURE2_NOTES: NoteGlyph[] = [
  { x: 420, cy: PITCH_Y['F5'], label: 'F5', duration: 'quarter' },
  { x: 485, cy: PITCH_Y['A5'], label: 'A5', duration: 'quarter' },
  { x: 550, cy: PITCH_Y['D5'], label: 'D5', duration: 'quarter' },
  { x: 615, cy: PITCH_Y['F5'], label: 'F5', duration: 'quarter' },
]

// Compás 3: A4, G4, F4, E4 — 4 beats completos
const MEASURE3_NOTES: NoteGlyph[] = [
  { x: 700, cy: PITCH_Y['A4'], label: 'A4', duration: 'quarter' },
  { x: 740, cy: PITCH_Y['G4'], label: 'G4', duration: 'quarter' },
  { x: 780, cy: PITCH_Y['F4'], label: 'F4', duration: 'quarter' },
  { x: 820, cy: PITCH_Y['E4'], label: 'E4', duration: 'quarter' },
]

function NoteHead({ x, cy, duration, color }: { x: number; cy: number; duration: 'quarter' | 'half'; color: string }) {
  const filled = duration === 'quarter'
  return (
    <g>
      <ellipse cx={x} cy={cy} rx={7} ry={5} fill={filled ? color : 'none'} stroke={color} strokeWidth={1.5} transform={`rotate(-15 ${x} ${cy})`} />
      <line x1={x + 6} y1={cy} x2={x + 6} y2={cy - 35} stroke={color} strokeWidth={1.5} />
    </g>
  )
}

export default function StaffSVG({ theme = 'dark', opacity = 1 }: StaffSVGProps) {
  const lineColor = theme === 'paper' ? '#1a1a1a' : '#C8A84B'
  const noteColor = theme === 'paper' ? '#1a1a1a' : '#C8A84B'
  const clefColor = theme === 'paper' ? '#333' : '#C8A84B'

  return (
    <svg
      viewBox="0 0 900 240"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity, width: '100%' }}
      aria-label="Pentagrama musical"
    >
      {/* Staff lines */}
      {STAFF_LINES.map((y) => (
        <line key={y} x1={60} y1={y} x2={880} y2={y} stroke={lineColor} strokeWidth={1} opacity={0.7} />
      ))}

      {/* Barlines */}
      {[60, 370, 680, 880].map((x) => (
        <line key={x} x1={x} y1={80} x2={x} y2={160} stroke={lineColor} strokeWidth={x === 880 ? 3 : 1.5} />
      ))}

      {/* Treble clef simplified */}
      <text x={65} y={155} fontSize={90} fill={clefColor} fontFamily="serif" opacity={0.9}>𝄞</text>

      {/* Time signature 4/4 */}
      <text x={90} y={115} fontSize={22} fill={lineColor} fontFamily="serif" fontWeight="bold">4</text>
      <text x={90} y={155} fontSize={22} fill={lineColor} fontFamily="serif" fontWeight="bold">4</text>

      {/* Notes */}
      {[...MEASURE1_NOTES, ...MEASURE2_NOTES, ...MEASURE3_NOTES].map((n) => (
        <NoteHead key={`${n.label}-${n.x}`} x={n.x} cy={n.cy} duration={n.duration} color={noteColor} />
      ))}

      {/* Ledger line for C5 */}
      <line x1={103} y1={110} x2={117} y2={110} stroke={lineColor} strokeWidth={1} />
    </svg>
  )
}
