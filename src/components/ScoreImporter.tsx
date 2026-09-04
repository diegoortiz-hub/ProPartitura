import React, { useState, useRef } from 'react';
import { imageToScore, ImportedNote } from '../utils/imageToScore';
import { audioFileToScore } from '../utils/audioToScore';

interface ScoreImporterProps {
  onImport: (notes: ImportedNote[]) => void;
  onClose: () => void;
}

type Mode = 'image' | 'audio';
type State = 'idle' | 'analyzing' | 'done' | 'error';

const DURATION_ICON: Record<string, string> = {
  whole: '𝅝', half: '𝅗', quarter: '♩', eighth: '♪', sixteenth: '♬',
};

export const ScoreImporter: React.FC<ScoreImporterProps> = ({ onImport, onClose }) => {
  const [mode, setMode]     = useState<Mode>('image');
  const [status, setStatus] = useState<State>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [notes, setNotes]   = useState<ImportedNote[]>([]);
  const [dragOver, setDrag] = useState(false);
  const [fileName, setFile] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = (newMode?: Mode) => {
    if (newMode) setMode(newMode);
    setStatus('idle');
    setNotes([]);
    setErrMsg('');
    setFile('');
  };

  const processFile = async (file: File) => {
    setFile(file.name);
    setStatus('analyzing');
    setErrMsg('');
    try {
      let result: ImportedNote[];
      if (mode === 'image') {
        result = await imageToScore(file);
      } else {
        result = await audioFileToScore(file, 120);
      }

      if (!result.length) {
        setErrMsg('No se detectaron notas. Prueba con una imagen más clara o un audio más limpio.');
        setStatus('error');
        return;
      }
      setNotes(result);
      setStatus('done');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Error desconocido.');
      setStatus('error');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#131929] border border-[#1A2235] rounded-xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1A2235] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C8A84B] text-[#0C1220] flex items-center justify-center text-xl font-bold select-none">
              𝄞
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Importar Partitura</h3>
              <p className="text-xs text-slate-400">Sube una imagen o audio para transcribir automáticamente</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#1A2235] cursor-pointer">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Mode toggle */}
          <div className="flex bg-[#0C1220] rounded-lg p-1 gap-1 border border-[#1A2235]">
            {(['image', 'audio'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => reset(m)}
                className={`flex-1 py-2 rounded-[6px] text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  mode === m ? 'bg-[#1A2235] text-[#C8A84B]' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {m === 'image' ? 'add_photo_alternate' : 'audiotrack'}
                </span>
                {m === 'image' ? 'Imagen de partitura' : 'Canción / audio'}
              </button>
            ))}
          </div>

          {/* Drop zone — show when idle or error */}
          {(status === 'idle' || status === 'error') && (
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                dragOver
                  ? 'border-[#C8A84B] bg-[#C8A84B]/5'
                  : 'border-slate-700 hover:border-slate-500 bg-[#0C1220]/50'
              }`}
            >
              <span className={`material-symbols-outlined text-[44px] ${dragOver ? 'text-[#C8A84B]' : 'text-slate-500'}`}>
                {mode === 'image' ? 'add_photo_alternate' : 'audio_file'}
              </span>
              <div className="text-center">
                <p className="text-sm font-medium text-white">
                  {mode === 'image' ? 'Arrastra la foto de la partitura aquí' : 'Arrastra la canción aquí'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {mode === 'image'
                    ? 'PNG, JPG, WEBP — foto o escaneo de partitura impresa'
                    : 'MP3, WAV, M4A, OGG — melodía monofónica o canción'}
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={mode === 'image'
                  ? 'image/png,image/jpeg,image/webp,image/gif'
                  : 'audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/*'}
                onChange={onFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Analyzing */}
          {status === 'analyzing' && (
            <div className="flex flex-col items-center justify-center gap-4 py-10 bg-[#0C1220] rounded-xl border border-slate-800">
              <span className="material-symbols-outlined text-[48px] text-[#C8A84B] animate-spin" style={{ animationDuration: '1.5s' }}>
                progress_activity
              </span>
              <div className="text-center">
                <p className="text-sm font-medium text-white">
                  {mode === 'image' ? 'Audiveris está reconociendo la partitura...' : 'Basic-Pitch está transcribiendo el audio...'}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{fileName}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-start gap-2 text-red-400">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <div>
                  <div className="text-xs font-bold mb-1">Error al analizar</div>
                  <div className="text-xs text-red-300 leading-relaxed">{errMsg}</div>
                </div>
              </div>
              <button type="button" onClick={() => setStatus('idle')} className="self-start text-xs text-[#C8A84B] hover:underline mt-1">
                ← Intentar de nuevo
              </button>
            </div>
          )}

          {/* Results */}
          {status === 'done' && notes.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#2ECC71]">check_circle</span>
                  <span className="text-xs font-bold text-white">{notes.length} notas detectadas</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{fileName}</span>
              </div>

              <div className="bg-[#0C1220] rounded-lg p-3 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border border-slate-800">
                {notes.map((n, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded bg-[#1A2235] text-xs font-mono text-white border border-slate-700/50 flex items-center gap-1"
                    title={`${n.duration} — MIDI ${n.midi}`}
                  >
                    <span>{n.pitch}</span>
                    <span className="text-[10px] text-slate-400">{DURATION_ICON[n.duration]}</span>
                  </span>
                ))}
              </div>

              <p className="text-[11px] text-slate-400">
                Las notas se cargarán en el primer sistema del editor. Puedes editarlas una vez cargadas.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1A2235] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#1A2235] hover:bg-[#212D44] text-white text-xs font-medium cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          {status === 'done' && (
            <button
              type="button"
              onClick={() => { onImport(notes); onClose(); }}
              className="px-5 py-2 rounded bg-[#C8A84B] hover:bg-[#E2C46A] text-[#0C1220] text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              Cargar en partitura
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
