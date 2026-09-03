import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';

interface RevisionEntry {
  id: string;
  version: string;
  timestamp: string;
  author: string;
  status: 'Urtext Definitivo' | 'Revisión Crítica' | 'Borrador de Trabajo' | 'Edición Autógrafa';
  measuresCount: number;
  changesSummary: string;
  editorialNotes: string;
}

const INITIAL_REVISIONS: RevisionEntry[] = [
  {
    id: 'rev-04',
    version: 'v2.4 (Actual)',
    timestamp: 'Hoy, hace 14 minutos',
    author: 'Diego Ortiz (Editor Principal)',
    status: 'Revisión Crítica',
    measuresCount: 74,
    changesSummary: 'Ajuste de ligaduras de expresión en compases 1-4 y dinámica mf en sistema II.',
    editorialNotes: 'Corregido según el manuscrito original autógrafo de Salzburgo (K. 545).',
  },
  {
    id: 'rev-03',
    version: 'v2.3',
    timestamp: 'Ayer a las 18:42',
    author: 'Archivo Urtext Leipzig',
    status: 'Urtext Definitivo',
    measuresCount: 74,
    changesSummary: 'Verificación de armadura (Do Mayor) y bajo de Alberti en compases 5 a 8.',
    editorialNotes: 'Confrontado con la primera edición impresa de Artaria (Viena, 1788).',
  },
  {
    id: 'rev-02',
    version: 'v2.1',
    timestamp: '28 de Agosto, 2026',
    author: 'Comité de Edición',
    status: 'Borrador de Trabajo',
    measuresCount: 68,
    changesSummary: 'Transcripción del primer movimiento Allegro con spirito (♩ = 120).',
    editorialNotes: 'Revisión preliminar de alturas y colocación de silencios.',
  },
  {
    id: 'rev-01',
    version: 'v1.0',
    timestamp: '20 de Agosto, 2026',
    author: 'Digitalización Autógrafa',
    status: 'Edición Autógrafa',
    measuresCount: 74,
    changesSummary: 'Creación inicial del proyecto a partir del facsímil de la Biblioteca Nacional.',
    editorialNotes: 'Edición crítica de referencia para sonatas para pianoforte.',
  },
];

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [revisions, setRevisions] = useState<RevisionEntry[]>(INITIAL_REVISIONS);
  const [selectedRevision, setSelectedRevision] = useState<RevisionEntry>(INITIAL_REVISIONS[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleRestore = (rev: RevisionEntry) => {
    setSelectedRevision(rev);
    showToast(`Versión ${rev.version} restaurada como copia de trabajo activa.`);
  };

  return (
    <div className="bg-[#0C1220] text-white min-h-screen flex flex-col font-sans selection:bg-[#C8A84B]/20 selection:text-[#E2C46A]">
      <Navbar
        onSave={() => showToast('Historial sincronizado con el archivo de partituras.')}
        onShare={() => showToast('Enlace de auditoría copiado.')}
      />
      <Sidebar />

      {/* Main container */}
      <main className="pl-0 lg:pl-[220px] pt-[60px] flex-1 flex flex-col">
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-[#1A2235] border border-[#C8A84B] text-white text-xs px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[#C8A84B] text-[18px]">check_circle</span>
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1A2235]">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#C8A84B] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#C8A84B]"></span>
                Control de Versiones y Auditoría
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-white mt-1 font-bold tracking-tight">
                Historial de Ediciones Críticas
              </h1>
              <p className="text-xs sm:text-sm text-[#a1b0c5] mt-1 max-w-2xl">
                Registro inmutable de revisiones, cotejo de variantes autógrafas y puntos de restauración
                para la Sonata en Do Mayor K. 545.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/editor')}
              className="flex items-center gap-2 px-5 py-2 rounded bg-[#C8A84B] hover:bg-[#E2C46A] text-[#0C1220] text-xs font-bold transition-all shadow-md cursor-pointer self-start sm:self-center"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              <span>Regresar al Editor</span>
            </button>
          </div>

          {/* Grid Layout: Timeline + Revision Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline of Revisions */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Línea de Tiempo de Revisiones ({revisions.length})
              </div>

              {revisions.map((rev) => {
                const isSelected = selectedRevision.id === rev.id;
                return (
                  <div
                    key={rev.id}
                    onClick={() => setSelectedRevision(rev)}
                    className={`bg-[#131929] border rounded-lg p-5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#C8A84B] shadow-lg bg-[#161e31]'
                        : 'border-[#1A2235] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-[#0C1220] border border-slate-800 text-[#C8A84B] flex items-center justify-center font-mono font-bold text-xs">
                          {rev.version.split(' ')[0]}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{rev.version}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A2235] text-[#4A9EFF] border border-slate-700/60 font-medium">
                              {rev.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{rev.timestamp}</span>
                            <span>•</span>
                            <span>{rev.author}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-mono text-[#C8A84B]">
                        {rev.measuresCount} compases
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-300 leading-relaxed bg-[#0C1220] p-3 rounded border border-slate-800/80">
                      {rev.changesSummary}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Revision Inspector Detail */}
            <div className="flex flex-col gap-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Detalles de Edición Urtext
              </div>

              <div className="bg-[#131929] border border-[#1A2235] rounded-lg p-5 flex flex-col gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#C8A84B] font-bold">
                    Revisión Seleccionada
                  </div>
                  <h3 className="font-serif text-xl font-bold text-white mt-1">
                    {selectedRevision.version}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedRevision.timestamp}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 flex flex-col gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Editor Crítico</span>
                    <span className="font-medium text-white">{selectedRevision.author}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Estado de Publicación</span>
                    <span className="font-medium text-[#4A9EFF]">{selectedRevision.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Compases Registrados</span>
                    <span className="font-mono text-white">{selectedRevision.measuresCount} compases</span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <span className="text-slate-500 block text-[11px] mb-1">Criterio Crítico / Notas Autógrafas</span>
                  <p className="text-xs text-slate-300 italic leading-relaxed bg-[#0C1220] p-3 rounded border border-slate-800">
                    "{selectedRevision.editorialNotes}"
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRestore(selectedRevision)}
                  className="w-full mt-2 py-2.5 rounded bg-[#C8A84B] hover:bg-[#E2C46A] text-[#0C1220] text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">restore</span>
                  <span>Restaurar Esta Versión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
