import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { StaffSVG, NoteData } from '../components/StaffSVG';
import { NotePanel } from '../components/NotePanel';
import { PlaybackBar } from '../components/PlaybackBar';
import { ScoreImporter } from '../components/ScoreImporter';
import { playNote } from '../utils/audio';
import type { ImportedNote } from '../utils/imageToScore';

export const Editor: React.FC = () => {
  const [selectedNote, setSelectedNote] = useState<NoteData>({
    id: 'note-treble-2',
    pitch: 'D4',
    name: 'D4 (Re 4)',
    duration: 'half',
    durationLabel: 'Blanca (1/2)',
    midi: 62,
    system: 'treble',
    measure: 1,
    beat: 2,
    articulation: 'tenuto',
  });

  const [activeTool, setActiveTool] = useState<'select' | 'note' | 'eraser' | 'slur' | 'beam'>('select');
  const [selectedDuration, setSelectedDuration] = useState<'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth'>('half');
  const [selectedAccidental, setSelectedAccidental] = useState<'none' | 'sharp' | 'flat' | 'natural'>('none');
  const [scoreTheme, setScoreTheme] = useState<'paper' | 'dark'>('dark');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showImporter, setShowImporter] = useState(false);
  const [importedNotes, setImportedNotes] = useState<NoteData[] | undefined>(undefined);

  const handleSelectNote = (note: NoteData) => {
    setSelectedNote(note);
  };

  const handleUpdateNote = (updated: Partial<NoteData>) => {
    setSelectedNote((prev) => ({ ...prev, ...updated }));
  };

  const handleDurationClick = (dur: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth') => {
    setSelectedDuration(dur);
    playNote('C4', 0.2, 70);
  };

  const handleImport = (raw: ImportedNote[], _voice?: string) => {
    const asNoteData: NoteData[] = raw.map((n, i) => ({
      id: `imported-${i}`,
      pitch: n.pitch,
      name: `${n.pitch}`,
      duration: n.duration,
      durationLabel: n.duration,
      midi: n.midi,
      system: 'treble' as const,
      measure: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
    }));
    setImportedNotes(asNoteData);
    if (asNoteData[0]) setSelectedNote(asNoteData[0]);
  };

  return (
    <div className="bg-[#0C1220] text-[#e5e2dc] min-h-screen flex flex-col font-sans selection:bg-[#C8A84B]/20 selection:text-[#E2C46A] overflow-hidden">
      <Navbar />
      <Sidebar />

      {/* Main Container indented by Sidebar */}
      <div className="pl-0 lg:pl-[220px] pt-[60px] flex-1 flex flex-col h-[calc(100vh-60px)]">
        {/* Central Workspace: Editor Container + Right Property Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Editor Container (#080b14 background) */}
          <div className="flex-1 bg-[#080b14] flex flex-col p-4 gap-4 overflow-y-auto">
            {/* Sleek Toolbar */}
            <div className="h-[50px] bg-[#131929] rounded-lg border border-[#1A2235] flex items-center px-4 gap-5 shrink-0 overflow-x-auto select-none">
              {/* Tool Group 1: Durations */}
              <div className="flex items-center gap-2 pr-5 border-r border-[#1A2235] shrink-0">
                <button
                  type="button"
                  onClick={() => handleDurationClick('quarter')}
                  className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-colors cursor-pointer border border-transparent ${
                    selectedDuration === 'quarter'
                      ? 'bg-[#4A9EFF] text-white font-bold'
                      : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white'
                  }`}
                  title="Negra (1/4)"
                >
                  ♩
                </button>
                <button
                  type="button"
                  onClick={() => handleDurationClick('eighth')}
                  className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-colors cursor-pointer border border-transparent ${
                    selectedDuration === 'eighth'
                      ? 'bg-[#4A9EFF] text-white font-bold'
                      : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white'
                  }`}
                  title="Corchea (1/8)"
                >
                  ♪
                </button>
                <button
                  type="button"
                  onClick={() => handleDurationClick('sixteenth')}
                  className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-colors cursor-pointer border border-transparent ${
                    selectedDuration === 'sixteenth'
                      ? 'bg-[#4A9EFF] text-white font-bold'
                      : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white'
                  }`}
                  title="Semicorchea (1/16)"
                >
                  ♫
                </button>
                <button
                  type="button"
                  onClick={() => handleDurationClick('half')}
                  className={`w-8 h-8 rounded flex items-center justify-center text-base font-serif transition-colors cursor-pointer border border-transparent ${
                    selectedDuration === 'half'
                      ? 'bg-[#4A9EFF] text-white font-bold'
                      : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white'
                  }`}
                  title="Silencio / Blanca"
                >
                  𝄽
                </button>
              </div>

              {/* Tool Group 2: Accidentals */}
              <div className="flex items-center gap-2 pr-5 border-r border-[#1A2235] shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedAccidental(selectedAccidental === 'flat' ? 'none' : 'flat')}
                  className={`w-8 h-8 rounded flex items-center justify-center text-base font-serif transition-colors cursor-pointer border border-transparent ${
                    selectedAccidental === 'flat'
                      ? 'bg-[#4A9EFF] text-white font-bold'
                      : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white'
                  }`}
                  title="Bemol ♭"
                >
                  ♭
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAccidental(selectedAccidental === 'natural' ? 'none' : 'natural')}
                  className={`w-8 h-8 rounded flex items-center justify-center text-base font-serif transition-colors cursor-pointer border border-transparent ${
                    selectedAccidental === 'natural'
                      ? 'bg-[#4A9EFF] text-white font-bold'
                      : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white'
                  }`}
                  title="Becuadro ♮"
                >
                  ♮
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAccidental(selectedAccidental === 'sharp' ? 'none' : 'sharp')}
                  className={`w-8 h-8 rounded flex items-center justify-center text-base font-serif transition-colors cursor-pointer border border-transparent ${
                    selectedAccidental === 'sharp'
                      ? 'bg-[#4A9EFF] text-white font-bold'
                      : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white'
                  }`}
                  title="Sostenido ♯"
                >
                  ♯
                </button>
              </div>

              {/* Tool Group 3: Dinámicas */}
              <div className="flex items-center gap-2 pr-5 border-r border-[#1A2235] shrink-0">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline mr-1">
                  Dinámicas
                </span>
                <button
                  type="button"
                  onClick={() => playNote('C4', 0.2, 50)}
                  className="w-8 h-8 rounded flex items-center justify-center font-serif italic text-base text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white transition-colors cursor-pointer"
                  title="Piano (p)"
                >
                  p
                </button>
                <button
                  type="button"
                  onClick={() => playNote('C4', 0.2, 110)}
                  className="w-8 h-8 rounded flex items-center justify-center font-serif italic font-bold text-base text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white transition-colors cursor-pointer"
                  title="Forte (f)"
                >
                  f
                </button>
              </div>

              {/* Tool Group 4: Notation Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTool('select')}
                  className={`w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
                    activeTool === 'select'
                      ? 'bg-[#C8A84B] text-[#0C1220] font-bold shadow-sm'
                      : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white'
                  }`}
                  title="Herramienta de Selección (V)"
                >
                  <span className="material-symbols-outlined text-[18px]">near_me</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('note')}
                  className={`w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
                    activeTool === 'note'
                      ? 'bg-[#C8A84B] text-[#0C1220] font-bold shadow-sm'
                      : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white'
                  }`}
                  title="Insertar Notas (N)"
                >
                  <span className="material-symbols-outlined text-[18px]">music_note</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('eraser')}
                  className={`w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
                    activeTool === 'eraser'
                      ? 'bg-[#C8A84B] text-[#0C1220] font-bold shadow-sm'
                      : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white'
                  }`}
                  title="Borrador"
                >
                  <span className="material-symbols-outlined text-[18px]">backspace</span>
                </button>
              </div>

              {/* Import Button */}
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowImporter(true)}
                  className="px-2.5 py-1 rounded bg-[#C8A84B]/15 text-[#C8A84B] hover:bg-[#C8A84B]/25 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#C8A84B]/30"
                  title="Importar partitura desde imagen o audio"
                >
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  <span className="hidden sm:inline">Importar</span>
                </button>
                {importedNotes && (
                  <button
                    type="button"
                    onClick={() => setImportedNotes(undefined)}
                    className="px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs border border-red-500/20 flex items-center gap-1"
                    title="Limpiar notas importadas"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    <span className="hidden sm:inline">Limpiar</span>
                  </button>
                )}
              </div>

              {/* Theme toggle & Zoom */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setScoreTheme(scoreTheme === 'paper' ? 'dark' : 'paper')}
                  className="px-2.5 py-1 rounded bg-[#1A2235] text-[#a1b0c5] hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                  title="Alternar Papel Urtext / Modo Oscuro"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {scoreTheme === 'paper' ? 'dark_mode' : 'light_mode'}
                  </span>
                  <span className="hidden sm:inline">
                    {scoreTheme === 'paper' ? 'Oscuro' : 'Papel'}
                  </span>
                </button>
                <div className="flex items-center bg-[#1A2235] border border-slate-700 rounded text-xs text-[#a1b0c5]">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                    className="w-6 h-6 flex items-center justify-center hover:text-white"
                  >
                    -
                  </button>
                  <span className="px-1 font-mono text-[11px] text-white">{zoomLevel}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                    className="w-6 h-6 flex items-center justify-center hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Score Paper */}
            <div
              className={`rounded-[4px] shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-8 sm:p-12 transition-all flex flex-col items-center relative overflow-hidden ${
                scoreTheme === 'paper'
                  ? 'bg-[#FAFAF7] text-[#222222] border border-[#E2DDD5]'
                  : 'bg-[#131929] text-[#e5e2dc] border border-[#1A2235]'
              }`}
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              {/* Score Header */}
              <div className="text-center mb-8 w-full">
                <h1 className="font-serif text-[32px] sm:text-[36px] font-bold tracking-tight text-current">
                  Sonata facile en Do Mayor, K. 545
                </h1>
                <p className="text-sm text-slate-500 italic mt-1">
                  Allegro — Revisión de Edición Urtext
                </p>
                <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-current/10 opacity-70">
                  <span className="font-semibold text-[#C8A84B]">Allegro (♩ = 120)</span>
                  <span className="font-serif italic">Wolfgang Amadeus Mozart</span>
                </div>
              </div>

              {/* Staff System 1 */}
              <div className="w-full mb-8">
                <div className="text-[11px] font-semibold text-[#C8A84B] uppercase tracking-wider flex items-center justify-between mb-2">
                  <span>I. Sistema Principal (Piano Forte)</span>
                  <span className="text-[10px] opacity-60">Compases 1 - 4</span>
                </div>
                <StaffSVG
                  selectedNoteId={selectedNote.id}
                  onSelectNote={handleSelectNote}
                  theme={scoreTheme}
                  importedNotes={importedNotes}
                />
              </div>

              {/* Staff System 2 */}
              <div className="w-full mb-6">
                <div className="text-[11px] font-semibold text-[#C8A84B] uppercase tracking-wider flex items-center justify-between mb-2">
                  <span>II. Desarrollo Temático</span>
                  <span className="text-[10px] opacity-60">Compases 5 - 8</span>
                </div>
                <StaffSVG
                  selectedNoteId={selectedNote.id}
                  onSelectNote={handleSelectNote}
                  theme={scoreTheme}
                />
              </div>

              {/* Footer text */}
              <div className="w-full mt-6 pt-3 border-t border-current/10 flex items-center justify-between text-[11px] opacity-60">
                <span>© ProPartituras Archivio • Grabado con el estándar Urtext Leipzig</span>
                <span>Página 1 de 2</span>
              </div>
            </div>
          </div>

          {/* Right Property Panel (260px) */}
          <NotePanel note={selectedNote} onUpdateNote={handleUpdateNote} />
        </div>

        {/* Bottom Playback Bar */}
        <PlaybackBar tempo={120} totalSeconds={225} importedNotes={importedNotes} />
      </div>

      {showImporter && (
        <ScoreImporter
          onImport={handleImport}
          onClose={() => setShowImporter(false)}
        />
      )}
    </div>
  );
};
