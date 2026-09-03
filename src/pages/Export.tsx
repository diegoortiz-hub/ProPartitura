import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { playNote } from '../utils/audio';

export const Export: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'xml' | 'audio' | 'parts'>('pdf');
  const [paperSize, setPaperSize] = useState('a4');
  const [includeCover, setIncludeCover] = useState(true);
  const [includeBarNumbers, setIncludeBarNumbers] = useState(true);
  const [audioFormat, setAudioFormat] = useState('wav');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState<string | null>(null);

  const handleExport = (type: string) => {
    setIsExporting(true);
    setExportComplete(null);
    playNote('C5', 0.3, 80);

    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(type);
      playNote('G5', 0.5, 90);
      setTimeout(() => setExportComplete(null), 4000);
    }, 1200);
  };

  return (
    <div className="bg-[#0C1220] text-[#e5e2dc] min-h-screen flex flex-col font-sans selection:bg-[#C8A84B]/20 selection:text-[#E2C46A]">
      <Navbar />
      <Sidebar />

      {/* Main Container indented by Sidebar */}
      <main className="pl-0 lg:pl-[220px] pt-16 flex-1 flex flex-col">
        <div className="p-6 sm:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#C8A84B] font-semibold">
                Centro de Distribución
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#e5e2dc] mt-1">
                Exportación Urtext
              </h1>
              <p className="text-xs text-[#c6c6cc] mt-1">
                Generación de formatos de imprenta de alta resolución, codificación MusicXML y stems de audio
              </p>
            </div>

            <Link
              to="/editor"
              className="flex items-center gap-2 px-4 py-2 rounded bg-[#212D44] text-[#e5e2dc] text-xs font-medium hover:bg-[#1A2235] transition-colors border border-white/5 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Regresar al Editor</span>
            </Link>
          </div>

          {/* Active Score Target Banner */}
          <div className="bg-[#131929] rounded-xl p-5 border border-white/5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#20201c] flex items-center justify-center font-serif text-2xl text-[#C8A84B] border border-white/5">
                𝄞
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#C8A84B] font-bold">
                  Partitura Seleccionada
                </span>
                <h2 className="font-serif text-lg text-[#e5e2dc]">
                  Sonata facile en Do Mayor, K. 545 — Allegro
                </h2>
                <div className="text-xs text-[#909096]">
                  W. A. Mozart • Piano Solo • 74 compases • Estado: Urtext Verificado
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#2ECC71]/15 text-[#2ECC71] text-xs font-medium border border-[#2ECC71]/30">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Apto para Prensa Tipográfica</span>
            </div>
          </div>

          {/* Success Toast */}
          {exportComplete && (
            <div className="p-4 rounded-xl bg-[#2ECC71]/20 border border-[#2ECC71]/40 text-[#2ECC71] text-xs font-semibold flex items-center gap-3 animate-fade-in">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>
                ¡Exportación de <strong>{exportComplete}</strong> completada con éxito! El archivo está listo en tu bandeja de descargas.
              </span>
            </div>
          )}

          {/* Export Options Grid (4 Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: PDF Imprenta Vectorial */}
            <div
              className={`rounded-xl p-6 transition-all border flex flex-col justify-between ${
                selectedFormat === 'pdf'
                  ? 'bg-[#131929] border-[#C8A84B] shadow-xl'
                  : 'bg-[#131929]/70 border-white/5 hover:border-white/20'
              }`}
              onClick={() => setSelectedFormat('pdf')}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#C8A84B]/20 text-[#C8A84B] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#C8A84B]/15 text-[#C8A84B]">
                    Vectorial 1200 DPI
                  </span>
                </div>

                <h3 className="font-serif text-xl text-[#e5e2dc]">PDF Imprenta Vectorial</h3>
                <p className="text-xs text-[#c6c6cc] mt-1.5 leading-relaxed">
                  Calidad tipográfica pura con fuentes Finale Maestro incrustadas, apto para impresión directa en papel pautado o encuadernación.
                </p>

                {/* PDF Options */}
                <div className="mt-5 flex flex-col gap-2.5 pt-4 border-t border-white/5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#909096]">Formato de Pliego:</span>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value)}
                      className="px-2 py-1 rounded bg-[#20201c] border border-white/5 text-[#e5e2dc] text-xs focus:outline-none"
                    >
                      <option value="a4">A4 Europeo (210 x 297 mm)</option>
                      <option value="letter">Carta US (8.5 x 11 in)</option>
                      <option value="b4">B4 Concert Urtext (250 x 353 mm)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-[#c6c6cc]">
                    <input
                      type="checkbox"
                      checked={includeCover}
                      onChange={(e) => setIncludeCover(e.target.checked)}
                      className="rounded bg-[#20201c] text-[#C8A84B] border-white/10"
                    />
                    <span>Incluir portada editorial Urtext con grabado histórico</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[#c6c6cc]">
                    <input
                      type="checkbox"
                      checked={includeBarNumbers}
                      onChange={(e) => setIncludeBarNumbers(e.target.checked)}
                      className="rounded bg-[#20201c] text-[#C8A84B] border-white/10"
                    />
                    <span>Numeración de compases en cada sistema</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExport('PDF Vectorial Urtext')}
                className="mt-6 w-full py-2.5 rounded bg-[#C8A84B] text-[#0C1220] font-semibold text-xs hover:bg-[#E2C46A] transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>{isExporting ? 'Procesando Pliegos...' : 'Generar PDF de Prensa'}</span>
              </button>
            </div>

            {/* Card 2: MusicXML 4.0 */}
            <div
              className={`rounded-xl p-6 transition-all border flex flex-col justify-between ${
                selectedFormat === 'xml'
                  ? 'bg-[#131929] border-[#C8A84B] shadow-xl'
                  : 'bg-[#131929]/70 border-white/5 hover:border-white/20'
              }`}
              onClick={() => setSelectedFormat('xml')}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#4A9EFF]/20 text-[#4A9EFF] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">terminal</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#4A9EFF]/15 text-[#4A9EFF]">
                    W3C Standard
                  </span>
                </div>

                <h3 className="font-serif text-xl text-[#e5e2dc]">MusicXML 4.0 Nativo</h3>
                <p className="text-xs text-[#c6c6cc] mt-1.5 leading-relaxed">
                  Interoperabilidad absoluta y sin pérdida. Abre esta partitura en Finale, Sibelius, Dorico, MuseScore o Logic Pro.
                </p>

                <div className="mt-5 flex flex-col gap-2 pt-4 border-t border-white/5 text-xs text-[#c6c6cc]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#2ECC71]">check</span>
                    <span>Conserva ligaduras, dinámicas y articulaciones micro-temporales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#2ECC71]">check</span>
                    <span>Estructura polifónica y voces independientes en capas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#2ECC71]">check</span>
                    <span>Exportación empaquetada como archivo comprimido (.mxl)</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExport('MusicXML 4.0 (.musicxml)')}
                className="mt-6 w-full py-2.5 rounded bg-[#212D44] text-[#e5e2dc] font-semibold text-xs hover:bg-[#1A2235] hover:text-[#C8A84B] transition-all border border-white/5 shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">code</span>
                <span>{isExporting ? 'Codificando XML...' : 'Descargar MusicXML (.mxl)'}</span>
              </button>
            </div>

            {/* Card 3: MIDI 2.0 & Audio Master */}
            <div
              className={`rounded-xl p-6 transition-all border flex flex-col justify-between ${
                selectedFormat === 'audio'
                  ? 'bg-[#131929] border-[#C8A84B] shadow-xl'
                  : 'bg-[#131929]/70 border-white/5 hover:border-white/20'
              }`}
              onClick={() => setSelectedFormat('audio')}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#E2C46A]/20 text-[#E2C46A] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">graphic_eq</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#E2C46A]/15 text-[#E2C46A]">
                    24-Bit / 96 kHz
                  </span>
                </div>

                <h3 className="font-serif text-xl text-[#e5e2dc]">Audio Master &amp; MIDI 2.0</h3>
                <p className="text-xs text-[#c6c6cc] mt-1.5 leading-relaxed">
                  Renderizado de estudio con muestreo de piano de cola vienés y pista de claqueta con curva de tempo continua.
                </p>

                <div className="mt-5 flex flex-col gap-2.5 pt-4 border-t border-white/5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#909096]">Formato de Audio:</span>
                    <select
                      value={audioFormat}
                      onChange={(e) => setAudioFormat(e.target.value)}
                      className="px-2 py-1 rounded bg-[#20201c] border border-white/5 text-[#e5e2dc] text-xs focus:outline-none"
                    >
                      <option value="wav">WAV Lossless (24-bit PCM)</option>
                      <option value="mp3">MP3 Master (320 kbps)</option>
                      <option value="midi">Standard MIDI File (Type 1)</option>
                    </select>
                  </div>
                  <div className="text-[11px] text-[#8899BB]">
                    Incluye información de velocidad por tecla y curva de pedal de resonancia damper.
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExport(`Audio ${audioFormat.toUpperCase()} & MIDI`)}
                className="mt-6 w-full py-2.5 rounded bg-[#212D44] text-[#e5e2dc] font-semibold text-xs hover:bg-[#1A2235] hover:text-[#C8A84B] transition-all border border-white/5 shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">audiotrack</span>
                <span>{isExporting ? 'Renderizando Audio...' : 'Exportar Pistas de Audio'}</span>
              </button>
            </div>

            {/* Card 4: Partes Orquestales Separadas */}
            <div
              className={`rounded-xl p-6 transition-all border flex flex-col justify-between ${
                selectedFormat === 'parts'
                  ? 'bg-[#131929] border-[#C8A84B] shadow-xl'
                  : 'bg-[#131929]/70 border-white/5 hover:border-white/20'
              }`}
              onClick={() => setSelectedFormat('parts')}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#2ECC71]/20 text-[#2ECC71] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">view_column</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#2ECC71]/15 text-[#2ECC71]">
                    Extracción Automática
                  </span>
                </div>

                <h3 className="font-serif text-xl text-[#e5e2dc]">Particellas Separadas</h3>
                <p className="text-xs text-[#c6c6cc] mt-1.5 leading-relaxed">
                  Generación de fascículos individuales para atril con pausas de compás múltiple optimizadas para vuelta de página.
                </p>

                <div className="mt-5 flex flex-col gap-2 pt-4 border-t border-white/5 text-xs text-[#c6c6cc]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#C8A84B]">check</span>
                    <span>Mano Derecha (Soprano / Melodía Principal)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#C8A84B]">check</span>
                    <span>Mano Izquierda (Bajo Alberti)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#C8A84B]">check</span>
                    <span>Guía armónica con cifrado barroco continuo opcional</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExport('Fascículo de Particellas')}
                className="mt-6 w-full py-2.5 rounded bg-[#212D44] text-[#e5e2dc] font-semibold text-xs hover:bg-[#1A2235] hover:text-[#C8A84B] transition-all border border-white/5 shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">library_books</span>
                <span>{isExporting ? 'Extrayendo Partes...' : 'Generar Lote de Partes'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
