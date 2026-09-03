import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { playNote } from '../utils/audio';

export interface InstrumentEntry {
  id: string;
  name: string;
  family: 'keyboards' | 'strings' | 'woodwinds' | 'brass' | 'voices' | 'percussion';
  clef: 'treble' | 'bass' | 'alto' | 'tenor';
  clefGlyph: string;
  transposition: string;
  midiChannel: number;
  soundPatch: string;
  volume: number;
  pan: number; // -50 (Left) to +50 (Right)
  isMuted: boolean;
  isSolo: boolean;
  samplePitch: string;
  stavesCount: 1 | 2;
  abbreviation: string;
}

export interface LibraryInstrument {
  id: string;
  name: string;
  family: 'keyboards' | 'strings' | 'woodwinds' | 'brass' | 'voices' | 'percussion';
  clef: 'treble' | 'bass' | 'alto' | 'tenor';
  clefGlyph: string;
  transposition: string;
  soundPatch: string;
  range: string;
  samplePitch: string;
  stavesCount: 1 | 2;
  abbreviation: string;
  description: string;
}

const DEFAULT_SCORE_INSTRUMENTS: InstrumentEntry[] = [
  {
    id: 'inst-piano',
    name: 'Piano de Cola Steinway D',
    family: 'keyboards',
    clef: 'treble',
    clefGlyph: '𝄞 + 𝄢',
    transposition: 'Do (En concierto)',
    midiChannel: 1,
    soundPatch: 'Steinway Concert Grand Piano (24-bit Urtext)',
    volume: 90,
    pan: 0,
    isMuted: false,
    isSolo: false,
    samplePitch: 'C4',
    stavesCount: 2,
    abbreviation: 'Pno.',
  },
  {
    id: 'inst-violin1',
    name: 'Violín I (Solista / Tutti)',
    family: 'strings',
    clef: 'treble',
    clefGlyph: '𝄞',
    transposition: 'Do (En concierto)',
    midiChannel: 2,
    soundPatch: 'Stradivarius Solo Violin Legato',
    volume: 85,
    pan: -25,
    isMuted: false,
    isSolo: false,
    samplePitch: 'A4',
    stavesCount: 1,
    abbreviation: 'Vln. I',
  },
  {
    id: 'inst-cello',
    name: 'Violonchelo',
    family: 'strings',
    clef: 'bass',
    clefGlyph: '𝄢',
    transposition: 'Do (En concierto)',
    midiChannel: 3,
    soundPatch: 'Montagnana Master Cello',
    volume: 88,
    pan: 25,
    isMuted: false,
    isSolo: false,
    samplePitch: 'C3',
    stavesCount: 1,
    abbreviation: 'Vc.',
  },
  {
    id: 'inst-flute',
    name: 'Flauta Travesera en Do',
    family: 'woodwinds',
    clef: 'treble',
    clefGlyph: '𝄞',
    transposition: 'Do (En concierto)',
    midiChannel: 4,
    soundPatch: 'Concert Flute Vibrato',
    volume: 80,
    pan: -35,
    isMuted: false,
    isSolo: false,
    samplePitch: 'G5',
    stavesCount: 1,
    abbreviation: 'Fl.',
  },
];

const ORCHESTRAL_LIBRARY: LibraryInstrument[] = [
  // Teclados
  {
    id: 'lib-harpsichord',
    name: 'Clavecín Flamenco (Ruckers)',
    family: 'keyboards',
    clef: 'treble',
    clefGlyph: '𝄞 + 𝄢',
    transposition: 'Do (8\' + 4\')',
    soundPatch: 'Antwerp Double Manual Harpsichord',
    range: 'F1 - F6',
    samplePitch: 'C5',
    stavesCount: 2,
    abbreviation: 'Clav.',
    description: 'Timbre articulado e incisivo para bajo continuo y polifonía barroca.',
  },
  {
    id: 'lib-organ',
    name: 'Órgano de Tubos de Iglesia',
    family: 'keyboards',
    clef: 'treble',
    clefGlyph: '𝄞 + 𝄢',
    transposition: 'Do (Pedalier opcional)',
    soundPatch: 'Silbermann Baroque Pipe Organ',
    range: 'C1 - C7',
    samplePitch: 'E4',
    stavesCount: 2,
    abbreviation: 'Org.',
    description: 'Plenos con mixturas brillantes y pedales de 16 pies.',
  },
  {
    id: 'lib-celesta',
    name: 'Celesta',
    family: 'keyboards',
    clef: 'treble',
    clefGlyph: '𝄞 + 𝄢',
    transposition: 'Suena 8va alta (+12)',
    soundPatch: 'Mustel Paris Steel Plate Celesta',
    range: 'C3 - C7',
    samplePitch: 'C5',
    stavesCount: 2,
    abbreviation: 'Cel.',
    description: 'Sonido cristalino percutido por martillos en placas de acero.',
  },

  // Cuerdas
  {
    id: 'lib-violin2',
    name: 'Violín II',
    family: 'strings',
    clef: 'treble',
    clefGlyph: '𝄞',
    transposition: 'Do (En concierto)',
    soundPatch: 'Ensemble Studio Violins II',
    range: 'G3 - E7',
    samplePitch: 'E4',
    stavesCount: 1,
    abbreviation: 'Vln. II',
    description: 'Voz intermedia armónica para cuarteto y orquesta sinfónica.',
  },
  {
    id: 'lib-viola',
    name: 'Viola de Concierto',
    family: 'strings',
    clef: 'alto',
    clefGlyph: '𝄡',
    transposition: 'Do (Clave de Do en 3ª)',
    soundPatch: 'Warm Italian Viola Solo',
    range: 'C3 - A6',
    samplePitch: 'D4',
    stavesCount: 1,
    abbreviation: 'Vla.',
    description: 'Cálida sonoridad aterciopelada entre el violín y el violonchelo.',
  },
  {
    id: 'lib-doublebass',
    name: 'Contrabajo Orquestal',
    family: 'strings',
    clef: 'bass',
    clefGlyph: '𝄢',
    transposition: 'Suena 8va baja (-12)',
    soundPatch: 'Deep Orchestral Double Basses',
    range: 'C1 - G4',
    samplePitch: 'C3',
    stavesCount: 1,
    abbreviation: 'Cb.',
    description: 'Cimientos y resonancia de la sección de cuerda orquestal.',
  },

  // Maderas
  {
    id: 'lib-oboe',
    name: 'Oboe Francés en Do',
    family: 'woodwinds',
    clef: 'treble',
    clefGlyph: '𝄞',
    transposition: 'Do (En concierto)',
    soundPatch: 'Conservatoire Paris Oboe',
    range: 'Bb3 - G6',
    samplePitch: 'A4',
    stavesCount: 1,
    abbreviation: 'Ob.',
    description: 'Doble lengüeta penetrante, afinador orquestal canónico.',
  },
  {
    id: 'lib-clarinet',
    name: 'Clarinete en Si♭',
    family: 'woodwinds',
    clef: 'treble',
    clefGlyph: '𝄞',
    transposition: 'Si♭ (Transporta 1 tono abajo)',
    soundPatch: 'Boehm Bb Clarinet Expressivo',
    range: 'D3 - F6',
    samplePitch: 'C4',
    stavesCount: 1,
    abbreviation: 'Cl. (Bb)',
    description: 'Timbre flexible con registros chalumeau, clarín y sobreagudo.',
  },
  {
    id: 'lib-bassoon',
    name: 'Fagot Clásico en Do',
    family: 'woodwinds',
    clef: 'bass',
    clefGlyph: '𝄢',
    transposition: 'Do (En concierto)',
    soundPatch: 'Heckel Germany Concert Bassoon',
    range: 'Bb1 - Eb5',
    samplePitch: 'F3',
    stavesCount: 1,
    abbreviation: 'Fg.',
    description: 'Bajo de las maderas con carácter noble, ágil y resonante.',
  },

  // Metales
  {
    id: 'lib-horn',
    name: 'Trompa Francesa en Fa',
    family: 'brass',
    clef: 'treble',
    clefGlyph: '𝄞',
    transposition: 'Fa (Transporta 5ª justa abajo)',
    soundPatch: 'Alexander German F Horn',
    range: 'F2 - C6',
    samplePitch: 'F4',
    stavesCount: 1,
    abbreviation: 'Cor. (F)',
    description: 'Noble puente tonal entre maderas y metales.',
  },
  {
    id: 'lib-trumpet',
    name: 'Trompeta en Si♭',
    family: 'brass',
    clef: 'treble',
    clefGlyph: '𝄞',
    transposition: 'Si♭ (Transporta 1 tono abajo)',
    soundPatch: 'Bach Stradivarius Bb Trumpet',
    range: 'E3 - C6',
    samplePitch: 'C5',
    stavesCount: 1,
    abbreviation: 'Tpt. (Bb)',
    description: 'Brillantez heráldica, fanfarrias y líneas melódicas incisivas.',
  },
  {
    id: 'lib-trombone',
    name: 'Trombón Tenor',
    family: 'brass',
    clef: 'bass',
    clefGlyph: '𝄢',
    transposition: 'Do (En concierto)',
    soundPatch: 'Conn 88H Tenor Trombone',
    range: 'E2 - F5',
    samplePitch: 'D3',
    stavesCount: 1,
    abbreviation: 'Tbn.',
    description: 'Proyección pura de vara para acordes corales y polifonía sacra.',
  },

  // Voces
  {
    id: 'lib-soprano',
    name: 'Soprano (Voz Solista / Coro)',
    family: 'voices',
    clef: 'treble',
    clefGlyph: '𝄞',
    transposition: 'Do (En concierto)',
    soundPatch: 'Classical Bel Canto Soprano',
    range: 'C4 - C6',
    samplePitch: 'E5',
    stavesCount: 1,
    abbreviation: 'S.',
    description: 'Registro agudo lírico y virtuoso en la escritura vocal.',
  },
  {
    id: 'lib-tenor',
    name: 'Tenor Lírico',
    family: 'voices',
    clef: 'treble',
    clefGlyph: '𝄞 (8va)',
    transposition: 'Suena 8va baja (-12)',
    soundPatch: 'Concert Choral Tenor Vocal',
    range: 'C3 - A4',
    samplePitch: 'G4',
    stavesCount: 1,
    abbreviation: 'T.',
    description: 'Voz masculina aguda grabada con clave de Sol octavada.',
  },

  // Percusión
  {
    id: 'lib-timpani',
    name: 'Timbales Sinfónicos (4 Calderas)',
    family: 'percussion',
    clef: 'bass',
    clefGlyph: '𝄢',
    transposition: 'Do (Afinación cromática)',
    soundPatch: 'Ludwig Symphonic Calf Timpani',
    range: 'D2 - A3',
    samplePitch: 'D3',
    stavesCount: 1,
    abbreviation: 'Timp.',
    description: 'Acentos dramáticos y redobles de pedal con resonancia orquestal.',
  },
];

export const Instruments: React.FC = () => {
  const navigate = useNavigate();

  // Load persisted instruments or fallback to default
  const [activeInstruments, setActiveInstruments] = useState<InstrumentEntry[]>(() => {
    try {
      const saved = localStorage.getItem('propartituras_instruments');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return DEFAULT_SCORE_INSTRUMENTS;
  });

  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Score Engraving Master Properties
  const [tuningStandard, setTuningStandard] = useState<string>('440');
  const [bracketStyle, setBracketStyle] = useState<string>('orchestral');
  const [nameDisplayMode, setNameDisplayMode] = useState<string>('fullFirstShortLater');

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('propartituras_instruments', JSON.stringify(activeInstruments));
    } catch {
      // ignore
    }
  }, [activeInstruments]);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 2800);
  };

  const handleAudition = (instrumentId: string, pitch: string, volume: number = 85) => {
    setPreviewingId(instrumentId);
    playNote(pitch, 0.55, volume);
    setTimeout(() => {
      setPreviewingId(null);
    }, 600);
  };

  const handleVolumeChange = (id: string, newVolume: number) => {
    setActiveInstruments((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, volume: newVolume } : inst))
    );
  };

  const handlePanChange = (id: string, newPan: number) => {
    setActiveInstruments((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, pan: newPan } : inst))
    );
  };

  const handleToggleMute = (id: string) => {
    setActiveInstruments((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, isMuted: !inst.isMuted } : inst))
    );
  };

  const handleToggleSolo = (id: string) => {
    setActiveInstruments((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, isSolo: !inst.isSolo } : inst))
    );
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === activeInstruments.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const nextList = [...activeInstruments];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIndex, 0, moved);
    setActiveInstruments(nextList);
  };

  const handleRemoveInstrument = (id: string) => {
    if (activeInstruments.length <= 1) {
      showNotification('La partitura requiere al menos un instrumento en el sistema.');
      return;
    }
    const removed = activeInstruments.find((i) => i.id === id);
    setActiveInstruments((prev) => prev.filter((i) => i.id !== id));
    if (removed) {
      showNotification(`${removed.name} eliminado de la partitura.`);
    }
  };

  const handleAddFromLibrary = (item: LibraryInstrument) => {
    const newEntry: InstrumentEntry = {
      id: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: item.name,
      family: item.family,
      clef: item.clef,
      clefGlyph: item.clefGlyph,
      transposition: item.transposition,
      midiChannel: Math.min(16, activeInstruments.length + 1),
      soundPatch: item.soundPatch,
      volume: 85,
      pan: 0,
      isMuted: false,
      isSolo: false,
      samplePitch: item.samplePitch,
      stavesCount: item.stavesCount,
      abbreviation: item.abbreviation,
    };

    setActiveInstruments((prev) => [...prev, newEntry]);
    showNotification(`Se añadió ${item.name} a la partitura.`);
    setShowAddModal(false);
  };

  // Quick Preset Templates
  const handleApplyPreset = (presetKey: string) => {
    if (presetKey === 'piano') {
      setActiveInstruments([DEFAULT_SCORE_INSTRUMENTS[0]]);
      showNotification('Plantilla cargada: Piano Solo (Urtext Clásico)');
    } else if (presetKey === 'stringQuartet') {
      setActiveInstruments([
        DEFAULT_SCORE_INSTRUMENTS[1], // Vln I
        {
          id: 'inst-vln2-preset',
          name: 'Violín II',
          family: 'strings',
          clef: 'treble',
          clefGlyph: '𝄞',
          transposition: 'Do (En concierto)',
          midiChannel: 2,
          soundPatch: 'Ensemble Violins II',
          volume: 82,
          pan: -15,
          isMuted: false,
          isSolo: false,
          samplePitch: 'E4',
          stavesCount: 1,
          abbreviation: 'Vln. II',
        },
        {
          id: 'inst-vla-preset',
          name: 'Viola',
          family: 'strings',
          clef: 'alto',
          clefGlyph: '𝄡',
          transposition: 'Do (Clave de Do)',
          midiChannel: 3,
          soundPatch: 'Warm Viola Solo',
          volume: 84,
          pan: 15,
          isMuted: false,
          isSolo: false,
          samplePitch: 'D4',
          stavesCount: 1,
          abbreviation: 'Vla.',
        },
        DEFAULT_SCORE_INSTRUMENTS[2], // Cello
      ]);
      showNotification('Plantilla cargada: Cuarteto de Cuerdas Clásico');
    } else if (presetKey === 'chamber') {
      setActiveInstruments([
        DEFAULT_SCORE_INSTRUMENTS[3], // Flute
        {
          id: 'inst-oboe-preset',
          name: 'Oboe',
          family: 'woodwinds',
          clef: 'treble',
          clefGlyph: '𝄞',
          transposition: 'Do (En concierto)',
          midiChannel: 5,
          soundPatch: 'Oboe Solo',
          volume: 82,
          pan: -10,
          isMuted: false,
          isSolo: false,
          samplePitch: 'A4',
          stavesCount: 1,
          abbreviation: 'Ob.',
        },
        DEFAULT_SCORE_INSTRUMENTS[1], // Vln I
        DEFAULT_SCORE_INSTRUMENTS[2], // Cello
        DEFAULT_SCORE_INSTRUMENTS[0], // Harpsichord/Piano
      ]);
      showNotification('Plantilla cargada: Ensamble de Cámara Clásico');
    } else if (presetKey === 'choir') {
      setActiveInstruments([
        {
          id: 'inst-soprano',
          name: 'Soprano',
          family: 'voices',
          clef: 'treble',
          clefGlyph: '𝄞',
          transposition: 'Do (En concierto)',
          midiChannel: 1,
          soundPatch: 'Soprano Choral Voice',
          volume: 88,
          pan: -30,
          isMuted: false,
          isSolo: false,
          samplePitch: 'E5',
          stavesCount: 1,
          abbreviation: 'S.',
        },
        {
          id: 'inst-alto',
          name: 'Contralto',
          family: 'voices',
          clef: 'treble',
          clefGlyph: '𝄞',
          transposition: 'Do (En concierto)',
          midiChannel: 2,
          soundPatch: 'Alto Choral Voice',
          volume: 86,
          pan: -10,
          isMuted: false,
          isSolo: false,
          samplePitch: 'A4',
          stavesCount: 1,
          abbreviation: 'A.',
        },
        {
          id: 'inst-tenor',
          name: 'Tenor',
          family: 'voices',
          clef: 'treble',
          clefGlyph: '𝄞 (8va)',
          transposition: 'Suena 8va baja (-12)',
          midiChannel: 3,
          soundPatch: 'Tenor Choral Voice',
          volume: 85,
          pan: 10,
          isMuted: false,
          isSolo: false,
          samplePitch: 'E4',
          stavesCount: 1,
          abbreviation: 'T.',
        },
        {
          id: 'inst-bass',
          name: 'Bajo',
          family: 'voices',
          clef: 'bass',
          clefGlyph: '𝄢',
          transposition: 'Do (En concierto)',
          midiChannel: 4,
          soundPatch: 'Basso Profundo Choral Voice',
          volume: 90,
          pan: 30,
          isMuted: false,
          isSolo: false,
          samplePitch: 'C3',
          stavesCount: 1,
          abbreviation: 'B.',
        },
      ]);
      showNotification('Plantilla cargada: Coro Mixto SATB');
    }
  };

  const filteredLibrary = ORCHESTRAL_LIBRARY.filter((item) => {
    const matchesFamily = selectedFamilyFilter === 'all' || item.family === selectedFamilyFilter;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.soundPatch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.abbreviation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFamily && matchesSearch;
  });

  return (
    <div className="bg-[#0C1220] text-white min-h-screen flex flex-col font-sans selection:bg-[#C8A84B]/20 selection:text-[#E2C46A]">
      <Navbar
        onSave={() => showNotification('Orquestación e instrumentos guardados.')}
        onShare={() => showNotification('Enlace de orquestación copiado al portapapeles.')}
      />
      <Sidebar />

      {/* Main Container indented by Sidebar */}
      <main className="pl-0 lg:pl-[220px] pt-[60px] flex-1 flex flex-col">
        {/* Toast Notification */}
        {successToast && (
          <div className="fixed top-20 right-8 z-50 bg-[#1A2235] border border-[#C8A84B] text-white text-xs px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
            <span className="material-symbols-outlined text-[#C8A84B] text-[18px]">check_circle</span>
            <span className="font-medium">{successToast}</span>
          </div>
        )}

        <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* Header Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1A2235]">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#C8A84B] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#C8A84B]"></span>
                Orquestación &amp; Grabado Urtext
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-white mt-1 font-bold tracking-tight">
                Instrumentación de la Partitura
              </h1>
              <p className="text-xs sm:text-sm text-[#a1b0c5] mt-1 max-w-2xl">
                Configure las familias instrumentales, claves, transposición acústica, canales MIDI
                y balance estéreo para el Nocturno en Do Mayor y los sistemas del editor.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded bg-[#1A2235] border border-slate-700 hover:bg-[#212D44] hover:border-[#C8A84B] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-[#4A9EFF]">add_circle</span>
                <span>Añadir Instrumento</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/editor')}
                className="flex items-center gap-2 px-5 py-2 rounded bg-[#C8A84B] hover:bg-[#E2C46A] text-[#0C1220] text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                <span>Aplicar y Volver al Editor</span>
              </button>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="bg-[#131929] border border-[#1A2235] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C8A84B] text-[20px]">auto_awesome</span>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  Plantillas Orquestales Rápidas
                </div>
                <div className="text-[11px] text-slate-400">
                  Aplica una formación canónica estándar con un clic
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('piano')}
                className="px-3 py-1.5 rounded bg-[#1A2235] hover:bg-[#212D44] border border-slate-700/60 text-xs font-medium text-[#a1b0c5] hover:text-white transition-colors"
              >
                🎹 Piano Solo
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('stringQuartet')}
                className="px-3 py-1.5 rounded bg-[#1A2235] hover:bg-[#212D44] border border-slate-700/60 text-xs font-medium text-[#a1b0c5] hover:text-white transition-colors"
              >
                🎻 Cuarteto de Cuerdas
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('chamber')}
                className="px-3 py-1.5 rounded bg-[#1A2235] hover:bg-[#212D44] border border-slate-700/60 text-xs font-medium text-[#a1b0c5] hover:text-white transition-colors"
              >
                🎼 Cámara Clásica
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('choir')}
                className="px-3 py-1.5 rounded bg-[#1A2235] hover:bg-[#212D44] border border-slate-700/60 text-xs font-medium text-[#a1b0c5] hover:text-white transition-colors"
              >
                👥 Coro SATB
              </button>
            </div>
          </div>

          {/* Active Instruments Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4A9EFF] text-[20px]">queue_music</span>
                <h2 className="font-serif text-xl font-bold text-white">
                  Instrumentos Activos en la Partitura ({activeInstruments.length})
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Orden de arriba a abajo tal como se imprime en los pentagramas
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {activeInstruments.map((inst, index) => {
                const isPlaying = previewingId === inst.id;
                return (
                  <div
                    key={inst.id}
                    className={`bg-[#131929] border rounded-lg p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                      inst.isMuted
                        ? 'border-slate-800 opacity-60'
                        : 'border-[#1A2235] hover:border-slate-700 shadow-md'
                    }`}
                  >
                    {/* Left: Clef Badge & Info */}
                    <div className="flex items-center gap-4 min-w-[280px]">
                      {/* Clef Circle / Glyph */}
                      <div className="w-12 h-12 rounded-lg bg-[#0C1220] border border-slate-800 flex items-center justify-center font-serif text-2xl text-[#C8A84B] shrink-0 select-none shadow-inner">
                        {inst.clefGlyph}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm sm:text-base text-white">
                            {inst.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A2235] text-[#4A9EFF] border border-slate-700/50 font-mono">
                            {inst.abbreviation}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                          <span>{inst.transposition}</span>
                          <span>•</span>
                          <span className="font-mono text-[#C8A84B]">Ch. {inst.midiChannel}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-xs">
                          {inst.soundPatch}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Controls (Solo, Mute, Volume, Pan, Audition) */}
                    <div className="flex flex-wrap items-center gap-5 sm:gap-6">
                      {/* Solo & Mute */}
                      <div className="flex items-center gap-1.5 bg-[#0C1220] p-1 rounded border border-[#1A2235]">
                        <button
                          type="button"
                          onClick={() => handleToggleSolo(inst.id)}
                          className={`w-7 h-7 rounded text-xs font-bold transition-colors cursor-pointer ${
                            inst.isSolo
                              ? 'bg-[#C8A84B] text-[#0C1220]'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Solo"
                        >
                          S
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMute(inst.id)}
                          className={`w-7 h-7 rounded text-xs font-bold transition-colors cursor-pointer ${
                            inst.isMuted
                              ? 'bg-rose-500 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Mute"
                        >
                          M
                        </button>
                      </div>

                      {/* Audition Button with real audio */}
                      <button
                        type="button"
                        onClick={() => handleAudition(inst.id, inst.samplePitch, inst.volume)}
                        className={`px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer border ${
                          isPlaying
                            ? 'bg-[#4A9EFF] text-white border-[#4A9EFF] scale-95 shadow-md'
                            : 'bg-[#1A2235] text-[#a1b0c5] border-slate-700 hover:text-white hover:border-[#4A9EFF]'
                        }`}
                        title={`Probar tono (${inst.samplePitch})`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isPlaying ? 'graphic_eq' : 'volume_up'}
                        </span>
                        <span>{isPlaying ? 'Sonando...' : 'Probar'}</span>
                      </button>

                      {/* Volume Slider */}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-12 text-right">Vol {inst.volume}%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={inst.volume}
                          onChange={(e) => handleVolumeChange(inst.id, parseInt(e.target.value))}
                          className="w-20 sm:w-24 h-1.5 bg-[#0C1220] rounded appearance-none cursor-pointer accent-[#C8A84B]"
                        />
                      </div>

                      {/* Pan Slider */}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-14 text-right">
                          {inst.pan === 0
                            ? 'Pan C'
                            : inst.pan < 0
                            ? `L${Math.abs(inst.pan)}`
                            : `R${inst.pan}`}
                        </span>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          value={inst.pan}
                          onChange={(e) => handlePanChange(inst.id, parseInt(e.target.value))}
                          className="w-16 sm:w-20 h-1.5 bg-[#0C1220] rounded appearance-none cursor-pointer accent-[#4A9EFF]"
                        />
                      </div>
                    </div>

                    {/* Right: Order & Remove buttons */}
                    <div className="flex items-center gap-1.5 border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-800 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveOrder(index, 'up')}
                        className="w-8 h-8 rounded bg-[#1A2235] border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Mover arriba en el sistema"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        disabled={index === activeInstruments.length - 1}
                        onClick={() => handleMoveOrder(index, 'down')}
                        className="w-8 h-8 rounded bg-[#1A2235] border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Mover abajo en el sistema"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveInstrument(inst.id)}
                        className="w-8 h-8 rounded bg-[#1A2235] border border-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:border-rose-500/50 transition-colors cursor-pointer ml-1"
                        title="Eliminar de la partitura"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Master Score Engraving & Tuning Config */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Tuning Reference */}
            <div className="bg-[#131929] border border-[#1A2235] rounded-lg p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8A84B] mb-2">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Afinación de Referencia Master
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Calibración del diapasón para la orquesta y síntesis acústica DSP.
              </p>
              <select
                value={tuningStandard}
                onChange={(e) => {
                  setTuningStandard(e.target.value);
                  showNotification(`Afinación master fijada en ${e.target.value} Hz.`);
                }}
                className="w-full bg-[#0C1220] border border-slate-700 text-white rounded px-3 py-2 text-xs cursor-pointer focus:border-[#C8A84B] focus:outline-none"
              >
                <option value="440">La4 = 440 Hz (Estándar de Concierto ISO 16)</option>
                <option value="442">La4 = 442 Hz (Filarmónica de Viena / Berlín)</option>
                <option value="432">La4 = 432 Hz (Afinación Científica / Verdi)</option>
                <option value="415">La4 = 415 Hz (Barroco Auténtico Urtext)</option>
              </select>
            </div>

            {/* Bracket / System Grouping */}
            <div className="bg-[#131929] border border-[#1A2235] rounded-lg p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8A84B] mb-2">
                <span className="material-symbols-outlined text-[18px]">account_tree</span>
                Agrupación de Llaves y Corchetes
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Reglas de grabado Urtext para unión de sistemas con barras de compás.
              </p>
              <select
                value={bracketStyle}
                onChange={(e) => {
                  setBracketStyle(e.target.value);
                  showNotification('Estilo de llaves orquestales actualizado.');
                }}
                className="w-full bg-[#0C1220] border border-slate-700 text-white rounded px-3 py-2 text-xs cursor-pointer focus:border-[#C8A84B] focus:outline-none"
              >
                <option value="orchestral">Corchete Orquestal Recto [ ] + Llaves { }</option>
                <option value="pianoCurved">Llave Curva de Piano Exclusiva { }</option>
                <option value="choirBracket">Llaves Corales SATB con Barra Continua</option>
              </select>
            </div>

            {/* Name Display Mode */}
            <div className="bg-[#131929] border border-[#1A2235] rounded-lg p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8A84B] mb-2">
                <span className="material-symbols-outlined text-[18px]">format_shapes</span>
                Nomenclatura en la Impresión
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Formato de visualización de nombres de instrumento al margen izquierdo.
              </p>
              <select
                value={nameDisplayMode}
                onChange={(e) => {
                  setNameDisplayMode(e.target.value);
                  showNotification('Formato de nombres en el margen actualizado.');
                }}
                className="w-full bg-[#0C1220] border border-slate-700 text-white rounded px-3 py-2 text-xs cursor-pointer focus:border-[#C8A84B] focus:outline-none"
              >
                <option value="fullFirstShortLater">Nombre Completo en Pág. 1, Abreviado después</option>
                <option value="alwaysFull">Siempre Nombre Completo en todos los sistemas</option>
                <option value="alwaysAbbr">Siempre Abreviado (Ej. Pno., Vln., Vc.)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal: Add Instrument from Orchestral Library */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#131929] border border-[#1A2235] rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#1A2235] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C8A84B] text-[#0C1220] flex items-center justify-center font-bold text-lg">
                    𝄞
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-white">
                      Biblioteca de Instrumentos Orquestales
                    </h3>
                    <p className="text-xs text-slate-400">
                      Seleccione un instrumento para agregarlo como pentagrama a la partitura
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#1A2235] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>

              {/* Filters & Search */}
              <div className="p-4 border-b border-[#1A2235] bg-[#0C1220]/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[18px] text-slate-500">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar instrumento..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#131929] border border-slate-700 text-white rounded text-xs focus:border-[#C8A84B] focus:outline-none"
                  />
                </div>

                {/* Family Tabs */}
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'keyboards', label: 'Teclados' },
                    { id: 'strings', label: 'Cuerdas' },
                    { id: 'woodwinds', label: 'Maderas' },
                    { id: 'brass', label: 'Metales' },
                    { id: 'voices', label: 'Voces' },
                    { id: 'percussion', label: 'Percusión' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedFamilyFilter(tab.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        selectedFamilyFilter === tab.id
                          ? 'bg-[#C8A84B] text-[#0C1220] font-semibold'
                          : 'bg-[#1A2235] text-slate-300 hover:text-white hover:bg-[#212D44]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instruments Catalog Grid */}
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredLibrary.map((item) => {
                  const isAuditioning = previewingId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="bg-[#0C1220] border border-slate-800 hover:border-slate-600 rounded-lg p-4 flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded bg-[#131929] text-[#C8A84B] flex items-center justify-center font-serif text-base border border-slate-800">
                              {item.clefGlyph.split(' ')[0]}
                            </span>
                            <span className="font-semibold text-sm text-white">{item.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono bg-[#1A2235] px-1.5 py-0.5 rounded">
                            {item.abbreviation}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-3">
                          <span>Tesitura: {item.range}</span>
                          <span>{item.transposition}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleAudition(item.id, item.samplePitch, 80)}
                          className="px-2.5 py-1.5 rounded bg-[#1A2235] hover:bg-[#212D44] text-[#a1b0c5] hover:text-white border border-slate-700 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {isAuditioning ? 'graphic_eq' : 'volume_up'}
                          </span>
                          <span>{isAuditioning ? 'Sonando' : 'Audicionar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddFromLibrary(item)}
                          className="flex-1 py-1.5 rounded bg-[#C8A84B] hover:bg-[#E2C46A] text-[#0C1220] text-xs font-bold transition-colors text-center cursor-pointer shadow-sm"
                        >
                          + Añadir a Partitura
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-[#1A2235] bg-[#0C1220]/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 rounded bg-[#1A2235] hover:bg-[#212D44] text-white text-xs font-medium cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
