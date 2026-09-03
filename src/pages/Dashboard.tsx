import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { playNote } from '../utils/audio';

interface ScoreItem {
  id: string;
  title: string;
  composer: string;
  instrumentation: string;
  category: 'all' | 'piano' | 'cuarteto' | 'orquestal' | 'coro';
  key: string;
  timeSignature: string;
  measures: number;
  lastEdited: string;
  status: 'En Edición' | 'Urtext Definitivo' | 'Borrador de Trabajo' | 'Revisión Crítica';
  samplePitch: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'piano' | 'cuarteto' | 'orquestal' | 'coro'>('all');
  const [sortOrder, setSortOrder] = useState('recent');

  const scores: ScoreItem[] = [
    {
      id: 'k545',
      title: 'Sonata facile en Do Mayor, K. 545',
      composer: 'W. A. Mozart',
      instrumentation: 'Piano Solo',
      category: 'piano',
      key: 'Do Mayor',
      timeSignature: '4/4',
      measures: 74,
      lastEdited: 'Hace 12 min',
      status: 'En Edición',
      samplePitch: 'C5',
    },
    {
      id: 'bwv1004',
      title: 'Chaconne en Re Menor (BWV 1004)',
      composer: 'J. S. Bach',
      instrumentation: 'Violín Solo',
      category: 'cuarteto',
      key: 'Re Menor',
      timeSignature: '3/4',
      measures: 256,
      lastEdited: 'Ayer',
      status: 'Urtext Definitivo',
      samplePitch: 'D4',
    },
    {
      id: 'op55',
      title: "Sinfonía No. 3 'Eroica' Op. 55",
      composer: 'L. v. Beethoven',
      instrumentation: 'Gran Orquesta',
      category: 'orquestal',
      key: 'Mi♭ Mayor',
      timeSignature: '3/4',
      measures: 691,
      lastEdited: 'Hace 3 días',
      status: 'Borrador de Trabajo',
      samplePitch: 'E4',
    },
    {
      id: 'bwv590',
      title: 'Pastorale en Fa Mayor (BWV 590)',
      composer: 'J. S. Bach',
      instrumentation: 'Órgano con pedal',
      category: 'piano',
      key: 'Fa Mayor',
      timeSignature: '6/8',
      measures: 112,
      lastEdited: 'Hace 1 semana',
      status: 'Revisión Crítica',
      samplePitch: 'F4',
    },
    {
      id: 'op132',
      title: 'Cuarteto de Cuerdas en La Menor Op. 132',
      composer: 'L. v. Beethoven',
      instrumentation: '2 Violines, Viola, Cello',
      category: 'cuarteto',
      key: 'La Menor',
      timeSignature: '4/4',
      measures: 310,
      lastEdited: 'Hace 2 semanas',
      status: 'Urtext Definitivo',
      samplePitch: 'A4',
    },
    {
      id: 'aveverum',
      title: 'Ave Verum Corpus, K. 618',
      composer: 'W. A. Mozart',
      instrumentation: 'Coro SATB y Cuerdas',
      category: 'coro',
      key: 'Re Mayor',
      timeSignature: '4/4',
      measures: 46,
      lastEdited: 'Hace 3 semanas',
      status: 'Urtext Definitivo',
      samplePitch: 'D5',
    },
  ];

  const filteredScores = scores.filter((score) => {
    const matchesCategory = activeCategory === 'all' || score.category === activeCategory;
    const matchesSearch =
      score.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      score.composer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      score.instrumentation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePreviewTone = (pitch: string) => {
    playNote(pitch, 0.4, 90);
  };

  const getStatusColor = (status: ScoreItem['status']) => {
    switch (status) {
      case 'En Edición':
        return 'bg-[#4A9EFF]/15 text-[#4A9EFF] border-[#4A9EFF]/30';
      case 'Urtext Definitivo':
        return 'bg-[#C8A84B]/15 text-[#C8A84B] border-[#C8A84B]/30';
      case 'Borrador de Trabajo':
        return 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30';
      case 'Revisión Crítica':
        return 'bg-[#2ECC71]/15 text-[#2ECC71] border-[#2ECC71]/30';
    }
  };

  return (
    <div className="bg-[#0C1220] text-[#e5e2dc] min-h-screen flex flex-col font-sans selection:bg-[#C8A84B]/20 selection:text-[#E2C46A]">
      <Navbar />
      <Sidebar />

      {/* Main Content Area indented by Sidebar */}
      <main className="pl-0 lg:pl-[220px] pt-16 flex-1 flex flex-col">
        <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#C8A84B] font-semibold">
                Estudio de Grabado • Catálogo
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#e5e2dc] mt-1">
                Archivo de Partituras
              </h1>
              <p className="text-xs text-[#c6c6cc] mt-1">
                Catálogo de ediciones críticas, autógrafos y cuadernos de composición
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => alert('Selector de archivo MusicXML 4.0 / Finale abierto. Elige un archivo .musicxml o .mxl.')}
                className="flex items-center gap-2 px-4 py-2 rounded bg-[#212D44] text-[#e5e2dc] text-xs font-medium hover:bg-[#1A2235] transition-colors border border-white/5"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Importar XML</span>
              </button>

              <Link
                to="/editor"
                className="flex items-center gap-2 px-4 py-2 rounded bg-[#C8A84B] text-[#0C1220] text-xs font-semibold hover:bg-[#E2C46A] transition-all shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Nueva Partitura</span>
              </Link>
            </div>
          </div>

          {/* Search, Filter Pills & Sort Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#131929] p-4 rounded-xl border border-white/5 shadow-md">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#909096]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, opus, compositor o instrumentación..."
                className="w-full pl-10 pr-4 py-2 rounded bg-[#20201c] border border-white/5 text-[#e5e2dc] text-xs focus:border-[#4A9EFF] focus:outline-none transition-colors"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'piano', label: 'Piano Solo' },
                  { id: 'cuarteto', label: 'Cuartetos' },
                  { id: 'orquestal', label: 'Orquestal' },
                  { id: 'coro', label: 'Coro' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-[#C8A84B] text-[#0C1220] font-semibold'
                      : 'bg-[#20201c] text-[#c6c6cc] hover:bg-[#1A2235]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 rounded bg-[#20201c] border border-white/5 text-[#e5e2dc] text-xs appearance-none pr-8 cursor-pointer focus:border-[#4A9EFF] focus:outline-none"
              >
                <option value="recent">Recientes primero</option>
                <option value="title">Por título (A-Z)</option>
                <option value="measures">Por compases</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-2 text-[16px] pointer-events-none text-[#909096]">
                expand_more
              </span>
            </div>
          </div>

          {/* Scores Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredScores.map((score) => (
              <div
                key={score.id}
                className="bg-[#131929] hover:border-[#C8A84B]/40 transition-all rounded-xl p-5 border border-white/5 shadow-md flex flex-col justify-between group"
              >
                <div>
                  {/* Top Meta Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(
                        score.status
                      )}`}
                    >
                      {score.status}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-[#909096] font-mono">
                      <span>{score.key}</span>
                      <span>•</span>
                      <span>{score.timeSignature}</span>
                    </div>
                  </div>

                  {/* Visual Score Miniature Preview Card */}
                  <div
                    onClick={() => {
                      handlePreviewTone(score.samplePitch);
                      navigate('/editor');
                    }}
                    className="w-full h-28 rounded-lg bg-[#FAFAF7] p-3 flex flex-col justify-center relative cursor-pointer overflow-hidden group-hover:shadow-lg transition-shadow border border-[#E2DDD5]"
                    title="Click para abrir en el Editor"
                  >
                    {/* Urtext Paper Texture lines */}
                    <div className="flex flex-col gap-1.5 opacity-60">
                      <div className="w-full h-[1px] bg-[#1A1F2E]"></div>
                      <div className="w-full h-[1px] bg-[#1A1F2E]"></div>
                      <div className="w-full h-[1px] bg-[#1A1F2E]"></div>
                      <div className="w-full h-[1px] bg-[#1A1F2E]"></div>
                      <div className="w-full h-[1px] bg-[#1A1F2E]"></div>
                    </div>
                    {/* Decorative Clef & Notes */}
                    <div className="absolute left-4 top-5 font-serif text-2xl text-[#1A1F2E] opacity-80">
                      𝄞
                    </div>
                    <div className="absolute left-16 top-7 text-xs font-serif text-[#1A1F2E]">
                      ♩ ♪ ♫ 𝅗𝅥
                    </div>
                    <div className="absolute right-4 bottom-2 text-[10px] font-mono text-[#8899BB] bg-[#FAFAF7]/90 px-1 rounded">
                      {score.measures} cc.
                    </div>
                    {/* Hover Play icon overlay */}
                    <div className="absolute inset-0 bg-[#0C1220]/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="w-10 h-10 rounded-full bg-[#C8A84B] text-[#0C1220] flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-[22px]">play_arrow</span>
                      </span>
                    </div>
                  </div>

                  {/* Title & Composer */}
                  <div className="mt-4">
                    <h3 className="font-serif text-lg text-[#e5e2dc] group-hover:text-[#C8A84B] transition-colors line-clamp-1">
                      {score.title}
                    </h3>
                    <p className="text-xs text-[#c6c6cc] mt-0.5">
                      {score.composer} •{' '}
                      <span className="text-[#8899BB]">{score.instrumentation}</span>
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-[#909096]">{score.lastEdited}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/export"
                      className="p-1.5 rounded hover:bg-[#212D44] text-[#c6c6cc] hover:text-[#e5e2dc] transition-colors"
                      title="Exportar Partitura"
                    >
                      <span className="material-symbols-outlined text-[18px]">output</span>
                    </Link>
                    <Link
                      to="/editor"
                      className="px-3 py-1.5 rounded bg-[#212D44] text-[#C8A84B] hover:bg-[#C8A84B] hover:text-[#0C1220] font-semibold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Editar</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats Bar */}
          <div className="mt-4 bg-[#131929] rounded-xl p-4 border border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#c6c6cc]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C8A84B] text-[18px]">
                library_music
              </span>
              <span>
                Total partituras:{' '}
                <strong className="text-[#e5e2dc] font-semibold">18 activas</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4A9EFF] text-[18px]">font_download</span>
              <span>
                Tipografía de Grabado:{' '}
                <strong className="text-[#e5e2dc] font-semibold">Finale Maestro Urtext</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2ECC71]"></span>
              <span>
                Sincronización Cloud:{' '}
                <strong className="text-[#e5e2dc] font-semibold">Tiempo Real (OK)</strong>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
