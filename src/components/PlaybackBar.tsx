import React, { useState, useEffect, useRef } from 'react';
import { playNote } from '../utils/audio';

interface NoteData {
  pitch: string;
  duration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
  midi: number;
}

interface PlaybackBarProps {
  tempo?: number;
  totalSeconds?: number;
  importedNotes?: NoteData[];
  onNoteChange?: (idx: number) => void;
  timeSignature?: string;
}

// Quarter-lengths por duración
const DUR_QL: Record<string, number> = {
  whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25,
};

// Duración en segundos a un tempo dado
function noteSec(duration: string, tempo: number): number {
  const ql = DUR_QL[duration] ?? 1;
  return (ql * 60) / tempo;
}

const DEFAULT_MOTIF = ['C4','E4','G4','C5','E5','D5','C5','B4','A4','G4'];

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  tempo = 120,
  totalSeconds = 225,
  importedNotes,
  onNoteChange,
  timeSignature = '4/4',
}) => {
  // Quarter-lengths por compás según la cifra indicadora
  const [numStr, denStr] = timeSignature.split('/');
  const tsNum = parseInt(numStr) || 4;
  const tsDen = parseInt(denStr) || 4;
  const qlPerMeasure = tsNum * (4 / tsDen);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [volume, setVolume] = useState(80);
  const [measureCounter, setMeasureCounter] = useState('001.1.0');
  const timerRef    = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const noteIndexRef = useRef(0);

  const stopAll = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
  };

  const handleStop = () => {
    stopAll();
    setIsPlaying(false);
    setCurrentSeconds(0);
    setMeasureCounter('001.1.0');
    noteIndexRef.current = 0;
    onNoteChange?.(-1);
  };

  const playImportedSequence = (notes: NoteData[], vol: number) => {
    let elapsed = 0;
    let accumQL = 0; // quarter-lengths acumulados
    const ids: number[] = [];
    notes.forEach((n, i) => {
      const durSec = noteSec(n.duration, tempo);
      const ql     = DUR_QL[n.duration] ?? 1;
      const id = window.setTimeout(() => {
        playNote(n.pitch, durSec * 0.92, (vol / 100) * 90);
        noteIndexRef.current = i;
        onNoteChange?.(i);
        setCurrentSeconds(parseFloat(elapsed.toFixed(1)));
        // Compás y tiempo basado en cifra indicadora real
        const measure = Math.floor(accumQL / qlPerMeasure) + 1;
        const beatQL  = accumQL % qlPerMeasure;
        const beat    = Math.floor(beatQL) + 1;
        setMeasureCounter(`${measure.toString().padStart(3,'0')}.${beat}.0`);
        if (i === notes.length - 1) {
          setIsPlaying(false);
          noteIndexRef.current = 0;
          onNoteChange?.(-1);
        }
      }, elapsed * 1000);
      ids.push(id);
      elapsed  += durSec;
      accumQL  += ql;
    });
    timeoutsRef.current = ids;
  };

  useEffect(() => {
    if (isPlaying) {
      if (importedNotes?.length) {
        playImportedSequence(importedNotes, volume);
      } else {
        const intervalMs = (60 / tempo) * 500;
        timerRef.current = window.setInterval(() => {
          const note = DEFAULT_MOTIF[noteIndexRef.current % DEFAULT_MOTIF.length];
          playNote(note, 0.35, (volume / 100) * 90);
          noteIndexRef.current += 1;
          setCurrentSeconds(prev => {
            const next = prev + 1;
            const measure = Math.floor(next / 4) + 1;
            const beat    = (next % 4) + 1;
            setMeasureCounter(`${measure.toString().padStart(3,'0')}.${beat}.0`);
            if (next >= totalSeconds) { setIsPlaying(false); return 0; }
            return next;
          });
        }, intervalMs);
      }
    } else {
      stopAll();
    }
    return stopAll;
  }, [isPlaying, tempo, volume, totalSeconds, importedNotes]);

  // Duración total real en segundos (calculada desde las notas importadas)
  const actualTotal = importedNotes?.length
    ? importedNotes.reduce((sum, n) => sum + noteSec(n.duration, tempo), 0)
    : totalSeconds;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <footer className="h-[60px] bg-[#131929] border-t border-[#1A2235] flex items-center justify-between px-6 shrink-0 relative z-30 select-none shadow-lg">
      <div className="flex-1 flex items-center justify-center gap-6 sm:gap-8">
        <div className="text-slate-500 text-sm font-mono whitespace-nowrap">
          {formatTime(currentSeconds)} / {formatTime(actualTotal)}
        </div>

        <div className="flex items-center gap-3">
          {/* Rewind */}
          <button type="button" onClick={handleStop}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
            title="Detener y volver al inicio">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
            </svg>
          </button>

          {/* Stop button */}
          <button type="button" onClick={handleStop}
            className="w-8 h-8 rounded bg-[#1A2235] border border-slate-700 text-slate-400 hover:text-white hover:bg-[#252f47] transition-colors flex items-center justify-center cursor-pointer"
            title="Parar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="1" y="1" width="12" height="12" rx="1.5" />
            </svg>
          </button>

          {/* Play / Pause */}
          <button type="button" onClick={() => setIsPlaying(p => !p)}
            className="w-[44px] h-[44px] rounded-full bg-[#C8A84B] text-[#0C1220] border-none flex items-center justify-center cursor-pointer text-xl hover:bg-[#E2C46A] hover:scale-105 active:scale-95 transition-all shadow-md"
            title={isPlaying ? 'Pausar' : 'Reproducir'}>
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="translate-x-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Forward */}
          <button type="button" onClick={() => setCurrentSeconds(s => Math.min(totalSeconds, s + 10))}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
            title="Avanzar 10s">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
            </svg>
          </button>
        </div>

        <div className="font-mono bg-black text-[#00FF00] px-3 py-1 rounded text-base sm:text-lg border border-[#333] tracking-widest shadow-inner select-none">
          {measureCounter}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8A84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M5 12h14" />
          </svg>
          <span className="text-xs font-bold text-[#C8A84B] tracking-wider whitespace-nowrap">{tempo} BPM</span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 text-slate-400">
        <span className="material-symbols-outlined text-[18px]">volume_up</span>
        <input type="range" min="0" max="100" value={volume}
          onChange={e => setVolume(parseInt(e.target.value))}
          className="w-16 h-1.5 bg-[#0C1220] rounded-full appearance-none cursor-pointer accent-[#C8A84B]"
          title={`Volumen: ${volume}%`} />
      </div>
    </footer>
  );
};
