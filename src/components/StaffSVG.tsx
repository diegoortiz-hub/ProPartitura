import React from 'react';
import { playNote } from '../utils/audio';

export interface NoteData {
  id: string;
  pitch: string;
  name: string;
  duration: string;
  durationLabel: string;
  midi: number;
  system: 'treble' | 'bass';
  measure: number;
  beat: number;
  articulation?: 'staccato' | 'tenuto' | 'accent' | 'fermata';
}

interface StaffSVGProps {
  selectedNoteId?: string;
  onSelectNote?: (note: NoteData) => void;
  interactive?: boolean;
  theme?: 'dark' | 'paper';
  measuresCount?: number;
  height?: number;
  importedNotes?: NoteData[];
}

// Compute Y coordinate from pitch string (treble clef)
function pitchToY(pitch: string): number {
  const match = pitch.match(/([A-G])[#b]?(\d)/);
  if (!match) return 60;
  const note = match[1];
  const octave = parseInt(match[2]);
  const STEPS: Record<string, number> = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
  const stepsFromC4 = (octave - 4) * 7 + (STEPS[note] ?? 0);
  return 96 - stepsFromC4 * 6;
}

export const StaffSVG: React.FC<StaffSVGProps> = ({
  selectedNoteId = 'note-treble-2',
  onSelectNote,
  interactive = true,
  theme = 'dark',
  importedNotes,
}) => {
  const isDark = theme === 'dark';
  const staffLineColor = isDark ? 'rgba(255, 255, 255, 0.22)' : '#45464c';
  const barLineColor = isDark ? 'rgba(255, 255, 255, 0.35)' : '#45464c';
  const clefColor = '#C8A84B';
  const defaultNoteColor = isDark ? '#F7F4EE' : '#1A1F2E';
  const selectedNoteColor = '#4A9EFF';

  // K.545 Sonata facile — Allegro opening (measures 1–4)
  const notes: NoteData[] = [
    { id: 'note-treble-1', pitch: 'C4', name: 'C4 (Do 4)', duration: 'quarter', durationLabel: 'Negra (1/4)', midi: 60, system: 'treble', measure: 1, beat: 1 },
    { id: 'note-treble-2', pitch: 'E4', name: 'E4 (Mi 4)', duration: 'quarter', durationLabel: 'Negra (1/4)', midi: 64, system: 'treble', measure: 1, beat: 2 },
    { id: 'note-treble-3', pitch: 'G4', name: 'G4 (Sol 4)', duration: 'quarter', durationLabel: 'Negra (1/4)', midi: 67, system: 'treble', measure: 1, beat: 3 },
    { id: 'note-treble-4', pitch: 'C5', name: 'C5 (Do 5)', duration: 'quarter', durationLabel: 'Negra (1/4)', midi: 72, system: 'treble', measure: 1, beat: 4 },
    { id: 'note-treble-5', pitch: 'E5', name: 'E5 (Mi 5)', duration: 'half', durationLabel: 'Blanca (1/2)', midi: 76, system: 'treble', measure: 2, beat: 1 },
    { id: 'note-treble-6', pitch: 'D5', name: 'D5 (Re 5)', duration: 'quarter', durationLabel: 'Negra (1/4)', midi: 74, system: 'treble', measure: 2, beat: 3 },
    { id: 'note-treble-7', pitch: 'C5', name: 'C5 (Do 5)', duration: 'eighth', durationLabel: 'Corchea (1/8)', midi: 72, system: 'treble', measure: 3, beat: 1 },
    { id: 'note-treble-8', pitch: 'B4', name: 'B4 (Si 4)', duration: 'eighth', durationLabel: 'Corchea (1/8)', midi: 71, system: 'treble', measure: 3, beat: 2 },
    { id: 'note-treble-9', pitch: 'A4', name: 'A4 (La 4)', duration: 'quarter', durationLabel: 'Negra (1/4)', midi: 69, system: 'treble', measure: 3, beat: 3 },
    { id: 'note-treble-10', pitch: 'G4', name: 'G4 (Sol 4)', duration: 'whole', durationLabel: 'Redonda (1)', midi: 67, system: 'treble', measure: 4, beat: 1 },
  ];

  const handleNoteClick = (note: NoteData) => {
    if (!interactive) return;
    playNote(note.pitch, 0.5, 85);
    if (onSelectNote) {
      onSelectNote(note);
    }
  };

  return (
    <div className="w-full select-none overflow-x-auto">
      <svg className="w-full min-w-[800px] h-auto" viewBox="0 0 860 140" xmlns="http://www.w3.org/2000/svg">
        {/* Selection highlight for Measure 1 */}
        {selectedNoteId === 'note-treble-2' && (
          <rect fill="rgba(74, 158, 255, 0.08)" height="72" rx="4" width="180" x="70" y="24" />
        )}

        {/* 5 Staff Lines */}
        <line stroke={staffLineColor} strokeWidth="0.8" x1="10" x2="850" y1="36" y2="36" />
        <line stroke={staffLineColor} strokeWidth="0.8" x1="10" x2="850" y1="48" y2="48" />
        <line stroke={staffLineColor} strokeWidth="0.8" x1="10" x2="850" y1="60" y2="60" />
        <line stroke={staffLineColor} strokeWidth="0.8" x1="10" x2="850" y1="72" y2="72" />
        <line stroke={staffLineColor} strokeWidth="0.8" x1="10" x2="850" y1="84" y2="84" />

        {/* Barlines */}
        <line stroke={barLineColor} strokeWidth="1.2" x1="10" x2="10" y1="36" y2="84" />
        <line stroke={barLineColor} strokeWidth="1" x1="250" x2="250" y1="36" y2="84" />
        <line stroke={barLineColor} strokeWidth="1" x1="450" x2="450" y1="36" y2="84" />
        <line stroke={barLineColor} strokeWidth="1" x1="650" x2="650" y1="36" y2="84" />
        <line stroke={barLineColor} strokeWidth="2" x1="850" x2="850" y1="36" y2="84" />

        {/* G-Clef */}
        <text fill={clefColor} fontFamily="'Playfair Display', serif" fontSize="44" fontWeight="bold" x="24" y="76">
          𝄞
        </text>

        {/* Time Signature 4/4 */}
        <text fill={isDark ? '#E2DDD5' : '#1A1F2E'} fontFamily="'Inter', sans-serif" fontSize="16" fontWeight="700" x="56" y="56">
          4
        </text>
        <text fill={isDark ? '#E2DDD5' : '#1A1F2E'} fontFamily="'Inter', sans-serif" fontSize="16" fontWeight="700" x="56" y="78">
          4
        </text>

        {/* Static K.545 notes — hidden when importedNotes is active */}
        {!importedNotes && <>
        {/* MEASURE 1 */}
        {/* Note 1: C4 */}
        <g
          className={interactive ? "cursor-pointer group" : ""}
          onClick={() => handleNoteClick(notes[0])}
        >
          <line stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} strokeWidth="1" x1="90" x2="114" y1="96" y2="96" />
          <ellipse 
            cx="102" 
            cy="96" 
            fill={selectedNoteId === 'note-treble-1' ? selectedNoteColor : defaultNoteColor} 
            rx="6.5" 
            ry="4.5" 
            transform="rotate(-20 102 96)" 
          />
          <line 
            stroke={selectedNoteId === 'note-treble-1' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth="1.2" 
            x1="107" 
            x2="107" 
            y1="94" 
            y2="58" 
          />
        </g>

        {/* Note 2: D4 (Blanca, with Tenuto) */}
        <g 
          className={interactive ? "cursor-pointer group" : ""}
          onClick={() => handleNoteClick(notes[1])}
        >
          {selectedNoteId === 'note-treble-2' && (
            <circle cx="160" cy="90" fill="rgba(74, 158, 255, 0.18)" r="16" />
          )}
          <ellipse 
            cx="160" 
            cy="90" 
            fill={isDark ? '#131929' : '#FAFAF7'} 
            rx="6.8" 
            ry="4.8" 
            stroke={selectedNoteId === 'note-treble-2' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth={selectedNoteId === 'note-treble-2' ? "2.4" : "1.8"} 
            transform="rotate(-20 160 90)" 
          />
          <line 
            stroke={selectedNoteId === 'note-treble-2' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth={selectedNoteId === 'note-treble-2' ? "2" : "1.2"} 
            x1="165" 
            x2="165" 
            y1="88" 
            y2="50" 
          />
          {/* Tenuto line */}
          <line 
            stroke={selectedNoteId === 'note-treble-2' ? selectedNoteColor : defaultNoteColor} 
            strokeLinecap="round" 
            strokeWidth="1.8" 
            x1="154" 
            x2="166" 
            y1="102" 
            y2="102" 
          />
        </g>

        {/* Note 3: E4 */}
        <g 
          className={interactive ? "cursor-pointer group" : ""}
          onClick={() => handleNoteClick(notes[2])}
        >
          <ellipse 
            cx="215" 
            cy="84" 
            fill={selectedNoteId === 'note-treble-3' ? selectedNoteColor : defaultNoteColor} 
            rx="6.5" 
            ry="4.5" 
            transform="rotate(-20 215 84)" 
          />
          <line 
            stroke={selectedNoteId === 'note-treble-3' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth="1.2" 
            x1="220" 
            x2="220" 
            y1="82" 
            y2="44" 
          />
        </g>

        {/* MEASURE 2: Arpeggiated melody with slur */}
        <path d="M 292 26 Q 345 8 396 12" fill="transparent" stroke={isDark ? '#E2DDD5' : '#45464c'} strokeWidth="1.2" />

        {/* Note 4: G4 */}
        <g 
          className={interactive ? "cursor-pointer group" : ""}
          onClick={() => handleNoteClick(notes[3])}
        >
          <ellipse 
            cx="290" 
            cy="72" 
            fill={selectedNoteId === 'note-treble-4' ? selectedNoteColor : defaultNoteColor} 
            rx="6.5" 
            ry="4.5" 
            transform="rotate(-20 290 72)" 
          />
          <line 
            stroke={selectedNoteId === 'note-treble-4' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth="1.2" 
            x1="295" 
            x2="295" 
            y1="70" 
            y2="34" 
          />
        </g>

        {/* Note 5: B4 */}
        <g 
          className={interactive ? "cursor-pointer group" : ""}
          onClick={() => handleNoteClick(notes[4])}
        >
          <ellipse 
            cx="340" 
            cy="60" 
            fill={selectedNoteId === 'note-treble-5' ? selectedNoteColor : defaultNoteColor} 
            rx="6.5" 
            ry="4.5" 
            transform="rotate(-20 340 60)" 
          />
          <line 
            stroke={selectedNoteId === 'note-treble-5' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth="1.2" 
            x1="345" 
            x2="345" 
            y1="58" 
            y2="24" 
          />
        </g>

        {/* Note 6: C5 */}
        <g 
          className={interactive ? "cursor-pointer group" : ""}
          onClick={() => handleNoteClick(notes[5])}
        >
          <ellipse 
            cx="390" 
            cy="48" 
            fill={selectedNoteId === 'note-treble-6' ? selectedNoteColor : defaultNoteColor} 
            rx="6.5" 
            ry="4.5" 
            transform="rotate(-20 390 48)" 
          />
          <line 
            stroke={selectedNoteId === 'note-treble-6' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth="1.2" 
            x1="395" 
            x2="395" 
            y1="46" 
            y2="16" 
          />
        </g>

        {/* MEASURE 3: Beamed Eighth notes */}
        <polygon fill={defaultNoteColor} points="494,26 536,30 536,34 494,30" />
        <g 
          className={interactive ? "cursor-pointer group" : ""}
          onClick={() => handleNoteClick(notes[6])}
        >
          <ellipse 
            cx="490" 
            cy="60" 
            fill={selectedNoteId === 'note-treble-7' ? selectedNoteColor : defaultNoteColor} 
            rx="6" 
            ry="4" 
            transform="rotate(-20 490 60)" 
          />
          <line 
            stroke={selectedNoteId === 'note-treble-7' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth="1.2" 
            x1="495" 
            x2="495" 
            y1="58" 
            y2="26" 
          />
        </g>

        <g 
          className={interactive ? "cursor-pointer group" : ""}
          onClick={() => handleNoteClick(notes[7])}
        >
          <ellipse 
            cx="530" 
            cy="66" 
            fill={selectedNoteId === 'note-treble-8' ? selectedNoteColor : defaultNoteColor} 
            rx="6" 
            ry="4" 
            transform="rotate(-20 530 66)" 
          />
          <line 
            stroke={selectedNoteId === 'note-treble-8' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth="1.2" 
            x1="535" 
            x2="535" 
            y1="64" 
            y2="30" 
          />
        </g>

        <g 
          className={interactive ? "cursor-pointer group" : ""}
          onClick={() => handleNoteClick(notes[8])}
        >
          <ellipse 
            cx="580" 
            cy="72" 
            fill={selectedNoteId === 'note-treble-9' ? selectedNoteColor : defaultNoteColor} 
            rx="6.5" 
            ry="4.5" 
            transform="rotate(-20 580 72)" 
          />
          <line 
            stroke={selectedNoteId === 'note-treble-9' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth="1.2" 
            x1="585" 
            x2="585" 
            y1="70" 
            y2="34" 
          />
        </g>

        </>}
        {/* IMPORTED NOTES — dynamic rendering overrides static notes */}
        {importedNotes && importedNotes.length > 0 && (() => {
          const BEAT_PX = 42;
          const START_X = 84;
          const BEATS: Record<string, number> = { whole:4, half:2, quarter:1, eighth:0.5, sixteenth:0.25 };
          let cumX = START_X;
          return importedNotes.map((note, i) => {
            const cx = Math.min(cumX, 840);
            const cy = pitchToY(note.pitch);
            cumX += (BEATS[note.duration] ?? 1) * BEAT_PX;
            const isSelected = note.id === selectedNoteId;
            const col = isSelected ? selectedNoteColor : defaultNoteColor;
            const isOpen = note.duration === 'whole' || note.duration === 'half';
            const hasStem = note.duration !== 'whole';
            const stemUp = cy >= 60;
            const hasSharp = note.pitch.includes('#');
            const hasFlat = note.pitch.includes('b') && note.pitch.length > 2;
            // Ledger lines
            const ledgers: number[] = [];
            if (cy >= 90) ledgers.push(96);
            if (cy >= 102) ledgers.push(108);
            if (cy <= 30) ledgers.push(24);
            return (
              <g key={`imp-${i}`} className={interactive ? 'cursor-pointer' : ''} onClick={() => { if (interactive && onSelectNote) { playNote(note.pitch, 0.4, 80); onSelectNote(note); } }}>
                {isSelected && <circle cx={cx} cy={cy} r={14} fill="rgba(74,158,255,0.15)" />}
                {ledgers.map(ly => <line key={ly} x1={cx-10} x2={cx+10} y1={ly} y2={ly} stroke={col} strokeWidth="0.8" />)}
                {hasSharp && <text x={cx-14} y={cy+4} fontSize="10" fill={col} fontFamily="serif">♯</text>}
                {hasFlat && <text x={cx-14} y={cy+4} fontSize="10" fill={col} fontFamily="serif">♭</text>}
                <ellipse cx={cx} cy={cy} rx={6.5} ry={4.5}
                  transform={`rotate(-18 ${cx} ${cy})`}
                  fill={isOpen ? (isDark ? '#131929' : '#FAFAF7') : col}
                  stroke={col} strokeWidth={isOpen ? '1.8' : '0'}
                />
                {hasStem && (
                  <line
                    x1={stemUp ? cx+6 : cx-6} y1={stemUp ? cy-2 : cy+2}
                    x2={stemUp ? cx+6 : cx-6} y2={stemUp ? cy-34 : cy+34}
                    stroke={col} strokeWidth="1.2"
                  />
                )}
                {note.duration === 'eighth' && stemUp && <path d={`M ${cx+6} ${cy-36} Q ${cx+18} ${cy-24} ${cx+10} ${cy-18}`} fill="none" stroke={col} strokeWidth="1.2" />}
                {note.duration === 'eighth' && !stemUp && <path d={`M ${cx-6} ${cy+36} Q ${cx-18} ${cy+24} ${cx-10} ${cy+18}`} fill="none" stroke={col} strokeWidth="1.2" />}
              </g>
            );
          });
        })()}

        {/* MEASURE 4: Whole Note C5 — only shown when no imported notes */}
        {!importedNotes &&
        <g 
          className={interactive ? "cursor-pointer group" : ""}
          onClick={() => handleNoteClick(notes[9])}
        >
          <ellipse 
            cx="730" 
            cy="60" 
            fill={isDark ? '#131929' : '#FAFAF7'} 
            rx="7" 
            ry="5" 
            stroke={selectedNoteId === 'note-treble-10' ? selectedNoteColor : defaultNoteColor} 
            strokeWidth="1.8" 
            transform="rotate(-20 730 60)" 
          />
          <line
            stroke={selectedNoteId === 'note-treble-10' ? selectedNoteColor : defaultNoteColor}
            strokeWidth="1.2"
            x1="736"
            x2="736"
            y1="58"
            y2="24"
          />
        </g>}
      </svg>
    </div>
  );
};
