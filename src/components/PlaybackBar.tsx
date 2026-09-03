import React, { useState, useEffect, useRef } from 'react';
import { playNote } from '../utils/audio';

interface PlaybackBarProps {
  tempo?: number;
  totalSeconds?: number;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  tempo = 120,
  totalSeconds = 225, // 03:45
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(12);
  const [volume, setVolume] = useState(80);
  const [measureCounter, setMeasureCounter] = useState('004.1.0');
  const timerRef = useRef<number | null>(null);
  const noteIndexRef = useRef(0);

  // Sonata Facsimile notes to play along during playback
  const playbackMotif = ['C4', 'E4', 'G4', 'B4', 'C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', 'G4'];

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = (60 / tempo) * 500; // 8th note speed
      timerRef.current = window.setInterval(() => {
        // Play audio note
        const note = playbackMotif[noteIndexRef.current % playbackMotif.length];
        playNote(note, 0.35, (volume / 100) * 90);
        noteIndexRef.current += 1;

        setCurrentSeconds((prev) => {
          const next = prev + 1;
          const measure = Math.floor(next / 4) + 1;
          const beat = (next % 4) + 1;
          const formattedM = measure.toString().padStart(3, '0');
          setMeasureCounter(`${formattedM}.${beat}.0`);
          if (next >= totalSeconds) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, tempo, volume, totalSeconds]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRewind = () => {
    setCurrentSeconds(0);
    setMeasureCounter('001.1.0');
    noteIndexRef.current = 0;
  };

  const handleForward = () => {
    setCurrentSeconds((s) => Math.min(totalSeconds, s + 10));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <footer className="h-[60px] bg-[#131929] border-t border-[#1A2235] flex items-center justify-between px-6 shrink-0 relative z-30 select-none shadow-lg">
      {/* Centered Controls in Sleek Pattern */}
      <div className="flex-1 flex items-center justify-center gap-6 sm:gap-8">
        {/* Timestamp */}
        <div className="text-slate-500 text-sm font-mono whitespace-nowrap">
          {formatTime(currentSeconds)} / {formatTime(totalSeconds)}
        </div>

        {/* Transport Buttons */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleRewind}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
            title="Rebobinar al inicio"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
            </svg>
          </button>

          {/* Master Round Gold Button */}
          <button
            type="button"
            onClick={handlePlayPause}
            className="w-[44px] h-[44px] rounded-full bg-[#C8A84B] text-[#0C1220] border-none flex items-center justify-center cursor-pointer text-xl hover:bg-[#E2C46A] hover:scale-105 active:scale-95 transition-all shadow-md"
            title={isPlaying ? "Pausar" : "Reproducir (Espacio)"}
          >
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

          <button
            type="button"
            onClick={handleForward}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
            title="Avanzar 10s"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
            </svg>
          </button>
        </div>

        {/* Measure Counter Box */}
        <div className="font-mono bg-black text-[#00FF00] px-3 py-1 rounded text-base sm:text-lg border border-[#333] tracking-widest shadow-inner select-none">
          {measureCounter}
        </div>

        {/* Metronome / BPM indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8A84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M5 12h14" />
          </svg>
          <span className="text-xs font-bold text-[#C8A84B] tracking-wider whitespace-nowrap">
            {tempo} BPM
          </span>
        </div>
      </div>

      {/* Volume slider on the right */}
      <div className="hidden lg:flex items-center gap-2 text-slate-400">
        <span className="material-symbols-outlined text-[18px]">volume_up</span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
          className="w-16 h-1.5 bg-[#0C1220] rounded-full appearance-none cursor-pointer accent-[#C8A84B]"
          title={`Volumen: ${volume}%`}
        />
      </div>
    </footer>
  );
};

