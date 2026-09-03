import React, { useState } from 'react';
import { NoteData } from './StaffSVG';
import { playNote } from '../utils/audio';

interface NotePanelProps {
  note: NoteData;
  onUpdateNote?: (updated: Partial<NoteData>) => void;
}

const DYNAMICS = [
  { label: 'ppp', velocity: 16 },
  { label: 'pp',  velocity: 33 },
  { label: 'p',   velocity: 50 },
  { label: 'mp',  velocity: 64 },
  { label: 'mf',  velocity: 80 },
  { label: 'f',   velocity: 96 },
  { label: 'ff',  velocity: 112 },
  { label: 'fff', velocity: 127 },
  { label: 'sfz', velocity: 120 },
  { label: 'sfp', velocity: 110 },
  { label: 'fp',  velocity: 105 },
];

const ARTICULATIONS = [
  { type: 'staccato',     symbol: '•',  title: 'Staccato' },
  { type: 'staccatissimo', symbol: '▪', title: 'Staccatissimo' },
  { type: 'accent',       symbol: '>',  title: 'Acento (>)' },
  { type: 'marcato',      symbol: '^',  title: 'Marcato (^)' },
  { type: 'tenuto',       symbol: '_',  title: 'Tenuto (_)' },
  { type: 'fermata',      symbol: '𝄐', title: 'Calderón / Fermata' },
  { type: 'portato',      symbol: '–•', title: 'Portato' },
];

export const NotePanel: React.FC<NotePanelProps> = ({ note, onUpdateNote }) => {
  const [articulation, setArticulation] = useState<string>(note.articulation || '');
  const [dynamic, setDynamic]     = useState<string>('mf');
  const [velocity, setVelocity]   = useState<number>(80);
  const [ornament, setOrnament]   = useState<string>('ninguno');

  const handleArticulationClick = (type: string) => {
    const next = articulation === type ? '' : type;
    setArticulation(next);
    if (onUpdateNote) onUpdateNote({ articulation: next as NoteData['articulation'] });
  };

  const handleDynamicClick = (d: { label: string; velocity: number }) => {
    setDynamic(d.label);
    setVelocity(d.velocity);
    playNote(note.pitch, 0.3, d.velocity);
  };

  return (
    <aside className="w-full lg:w-[260px] shrink-0 bg-[#131929] border-l border-[#1A2235] p-5 flex flex-col overflow-y-auto select-none text-[13px] gap-5">

      {/* PROPIEDADES DE NOTA */}
      <div>
        <h3 className="text-[11px] uppercase tracking-[1px] text-[#C8A84B] font-bold mb-3">
          Propiedades de Nota
        </h3>
        <div className="flex flex-col gap-2.5">
          {[
            { label: 'Pitch',    value: note.name.split(' ')[0] || note.name },
            { label: 'Duración', value: note.duration === 'whole' ? '1/1' : note.duration === 'half' ? '1/2' : note.duration === 'quarter' ? '1/4' : note.duration === 'eighth' ? '1/8' : '1/16' },
            { label: 'Velocity', value: String(velocity), mono: true },
            { label: 'MIDI Key', value: String(note.midi), gold: true, mono: true },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center text-[13px] text-[#a1b0c5]">
              <span>{row.label}</span>
              <span className={`px-2 py-0.5 rounded min-w-[56px] text-center text-xs border border-slate-700/50 bg-[#1A2235] ${row.gold ? 'text-[#C8A84B]' : 'text-white'} ${row.mono ? 'font-mono' : 'font-medium'}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ARTICULACIÓN */}
      <div>
        <h3 className="text-[11px] uppercase tracking-[1px] text-[#C8A84B] font-bold mb-3">
          Articulación
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {ARTICULATIONS.map(({ type, symbol, title }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleArticulationClick(type)}
              className={`w-10 h-10 rounded flex items-center justify-center cursor-pointer transition-all border text-base ${
                articulation === type
                  ? 'bg-[#C8A84B]/20 text-[#C8A84B] border-[#C8A84B] shadow-sm'
                  : 'bg-[#1A2235] text-white border-slate-700 hover:border-[#C8A84B]'
              }`}
              title={title}
            >
              <span className="font-bold leading-none">{symbol}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CANAL MIDI */}
      <div>
        <h3 className="text-[11px] uppercase tracking-[1px] text-[#C8A84B] font-bold mb-3">
          Canal MIDI
        </h3>
        <div className="bg-[#1A2235] p-3 rounded border border-slate-700 text-xs">
          <div className="flex justify-between mb-2 text-[#a1b0c5] opacity-80">
            <span>Ch. 1</span>
            <span>Piano Steinway</span>
          </div>
          <div className="h-1 bg-[#0C1220] rounded overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(velocity / 127) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* DINÁMICA COMPLETA */}
      <div>
        <h3 className="text-[11px] uppercase tracking-[1px] text-[#C8A84B] font-bold mb-2">
          Dinámica &amp; Modulación
        </h3>

        <div className="flex items-center justify-between text-xs text-[#a1b0c5] mb-2">
          <span>Curva Dinámica</span>
          <span className="text-[#C8A84B] font-serif font-bold italic text-sm">{dynamic}</span>
        </div>

        {/* Full dynamics grid */}
        <div className="grid grid-cols-4 gap-1 mb-3">
          {DYNAMICS.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => handleDynamicClick(d)}
              className={`py-1 rounded text-[10px] font-serif font-bold italic transition-colors border ${
                dynamic === d.label
                  ? 'bg-[#C8A84B] text-[#0C1220] border-[#C8A84B]'
                  : 'bg-[#1A2235] text-[#a1b0c5] border-slate-700/60 hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-[#a1b0c5] mb-1.5">
          <span>Control Velocity</span>
          <span className="font-mono text-[#C8A84B]">{velocity} / 127</span>
        </div>
        <input
          type="range"
          min="1"
          max="127"
          value={velocity}
          onChange={(e) => setVelocity(parseInt(e.target.value))}
          className="w-full h-1.5 bg-[#0C1220] rounded-lg appearance-none cursor-pointer accent-[#C8A84B]"
        />
      </div>

      {/* ORNAMENTOS */}
      <div className="pt-4 border-t border-[#1A2235]">
        <h3 className="text-[11px] uppercase tracking-[1px] text-[#C8A84B] font-bold mb-3">
          Ornamento
        </h3>
        <select
          value={ornament}
          onChange={(e) => setOrnament(e.target.value)}
          className="w-full h-8 px-2 rounded bg-[#1A2235] border border-slate-700 text-white text-xs appearance-none cursor-pointer focus:border-[#4A9EFF] focus:outline-none"
        >
          <option value="ninguno">Ninguno</option>
          <option value="trino">Trino (tr)</option>
          <option value="mordente-sup">Mordente Superior</option>
          <option value="mordente-inf">Mordente Inferior</option>
          <option value="grupeto">Grupeto (∞)</option>
          <option value="appoggiatura">Appoggiatura</option>
          <option value="acciaccatura">Acciaccatura</option>
          <option value="arpegio">Arpegio (↑)</option>
        </select>
      </div>
    </aside>
  );
};
