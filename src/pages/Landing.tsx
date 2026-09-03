import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { playNote } from '../utils/audio';

export const Landing: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(60);
  const intervalRef = useRef<number | null>(null);

  // Mozart K. 545 theme notes for playback demo
  const mozartNotes = [
    { pitch: 'C5', dur: 0.8 },
    { pitch: 'E5', dur: 0.4 },
    { pitch: 'G5', dur: 0.4 },
    { pitch: 'B4', dur: 0.6 },
    { pitch: 'C5', dur: 0.2 },
    { pitch: 'D5', dur: 0.2 },
    { pitch: 'C5', dur: 0.8 },
    { pitch: 'A4', dur: 0.2 },
    { pitch: 'B4', dur: 0.2 },
    { pitch: 'C5', dur: 0.2 },
    { pitch: 'D5', dur: 0.2 },
    { pitch: 'E5', dur: 0.2 },
    { pitch: 'F5', dur: 0.2 },
    { pitch: 'G5', dur: 0.4 },
  ];

  const togglePlayback = () => {
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      let step = 0;
      let pos = 60;
      intervalRef.current = window.setInterval(() => {
        pos += 6;
        if (pos > 820) {
          pos = 60;
          step = 0;
        }
        setPlayheadPos(pos);

        if (step < mozartNotes.length && pos % 40 < 8) {
          const n = mozartNotes[step % mozartNotes.length];
          playNote(n.pitch, n.dur, 90);
          step++;
        }
      }, 70);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="bg-[#0C1220] text-[#e5e2dc] min-h-screen flex flex-col font-sans selection:bg-[#C8A84B]/20 selection:text-[#E2C46A]">
      <Navbar variant="landing" />

      <main className="w-full pt-16 flex-1">
        {/* Secondary Sub-Navbar / Breadcrumb Header */}
        <section className="w-full bg-[#0C1220] px-6 sm:px-8 py-4 border-b border-white/5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-baseline text-2xl tracking-tight font-serif">
                <span className="text-[#C8A84B]">Pro</span>
                <span className="text-[#e5e2dc]">Partituras</span>
              </Link>
              <div className="hidden lg:flex items-center gap-6 text-xs font-medium text-[#c6c6cc]">
                <a href="#features" className="hover:text-[#C8A84B] transition-colors">
                  Características
                </a>
                <a href="#precios" className="hover:text-[#C8A84B] transition-colors">
                  Precios
                </a>
                <a href="#docs" className="hover:text-[#C8A84B] transition-colors">
                  Docs
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 rounded bg-[#212D44] text-[#e5e2dc] hover:bg-[#1A2235] text-xs font-medium transition-colors"
              >
                Ingresar
              </Link>
              <Link
                to="/editor"
                className="px-5 py-2 rounded bg-[#C8A84B] text-[#0C1220] text-xs font-semibold hover:bg-[#E2C46A] shadow-md transition-all active:scale-95"
              >
                Empezar gratis
              </Link>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="relative w-full bg-[#0C1220] px-6 sm:px-8 pt-10 pb-16 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C8A84B]/15 text-[#C8A84B] text-[11px] uppercase tracking-widest font-semibold shadow-sm border border-[#C8A84B]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8A84B] animate-ping"></span>
              <span>Editor Musical Urtext</span>
            </div>

            {/* Headline */}
            <h1 className="mt-6 max-w-4xl font-serif text-4xl sm:text-5xl lg:text-[52px] leading-tight sm:leading-[58px] tracking-tight text-[#e5e2dc]">
              Escribe, edita y exporta{' '}
              <span className="text-[#C8A84B] italic">partituras</span> con precisión
            </h1>

            {/* Subtitle */}
            <p className="mt-5 max-w-2xl text-sm sm:text-base text-[#c6c6cc] leading-relaxed">
              Editor profesional con el estándar de notación NSM/Finale. Exporta a MusicXML y MIDI con un clic.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/editor"
                className="inline-flex items-center gap-2 px-6 py-3 rounded bg-[#C8A84B] text-[#0C1220] text-sm font-semibold hover:bg-[#E2C46A] shadow-md transition-all active:scale-95"
              >
                <span>Crear cuenta gratis</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <a
                href="#interactive-staff"
                className="inline-flex items-center gap-2 px-6 py-3 rounded bg-[#212D44] text-[#e5e2dc] hover:bg-[#1A2235] text-sm font-medium shadow-sm transition-colors border border-white/5"
              >
                <span className="material-symbols-outlined text-[18px] text-[#C8A84B]">play_circle</span>
                <span>Ver demo</span>
              </a>
            </div>

            {/* Interactive Staff Illustration: Mozart Sonata in C Major (K. 545) */}
            <div
              id="interactive-staff"
              className="mt-12 w-full max-w-5xl bg-[#131929] rounded-xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 border border-white/5 text-left"
            >
              {/* Score Title Bar inside Urtext Board */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#C8A84B] font-semibold">
                    Urtext Edition • Archivio Digitale
                  </div>
                  <div className="font-serif text-xl sm:text-[22px] text-[#e5e2dc] mt-0.5">
                    Sonata facile in C Major, K. 545 — Allegro
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={togglePlayback}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#C8A84B] text-[#0C1220] text-xs font-semibold hover:bg-[#E2C46A] transition-all shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{isPlaying ? 'Pausar' : 'Reproducir Pasaje'}</span>
                  </button>
                  <div className="px-2.5 py-1.5 rounded bg-[#212D44] text-[#8899BB] text-[10px] font-medium border border-white/5">
                    <span>W. A. Mozart</span>
                  </div>
                </div>
              </div>

              {/* SVG Staff Rendering with Precision Hairline Rulers and Vectors */}
              <div className="relative w-full overflow-x-auto rounded bg-[#0C1220]/80 p-6 shadow-inner border border-white/5">
                {/* Moving Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-[#4A9EFF] shadow-[0_0_8px_rgba(74,158,255,0.8)] pointer-events-none transition-all duration-75 z-10"
                  style={{ left: `${playheadPos}px` }}
                />

                <svg
                  className="w-full min-w-[760px] h-[190px] select-none"
                  viewBox="0 0 880 200"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="staff-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke="#212D44"
                        strokeWidth="0.5"
                        strokeOpacity="0.4"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#staff-grid)" opacity="0.3" />

                  {/* Grand Staff Clef & Brackets */}
                  <path d="M 28 32 L 28 168" stroke="#E2DDD5" strokeWidth="2.5" />
                  <path d="M 33 32 L 33 168" stroke="#E2DDD5" strokeWidth="0.75" />
                  <path d="M 28 32 Q 22 100 28 168" fill="none" stroke="#E2DDD5" strokeWidth="1.2" />

                  {/* System 1: Treble Staves (5 Hairlines, 0.75px) */}
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="33" x2="860" y1="32" y2="32" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="33" x2="860" y1="42" y2="42" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="33" x2="860" y1="52" y2="52" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="33" x2="860" y1="62" y2="62" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="33" x2="860" y1="72" y2="72" />

                  {/* System 2: Bass Staves (5 Hairlines, 0.75px) */}
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="33" x2="860" y1="128" y2="128" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="33" x2="860" y1="138" y2="138" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="33" x2="860" y1="148" y2="148" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="33" x2="860" y1="158" y2="158" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="33" x2="860" y1="168" y2="168" />

                  {/* Bar lines (Compases) */}
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="280" x2="280" y1="32" y2="72" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="280" x2="280" y1="128" y2="168" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="580" x2="580" y1="32" y2="72" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="580" x2="580" y1="128" y2="168" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="855" x2="855" y1="32" y2="72" />
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="855" x2="855" y1="128" y2="168" />
                  <line stroke="#E2DDD5" strokeWidth="2.5" x1="860" x2="860" y1="32" y2="72" />
                  <line stroke="#E2DDD5" strokeWidth="2.5" x1="860" x2="860" y1="128" y2="168" />

                  {/* Treble Clef Glyph (G Clef) */}
                  <text fill="#E5C363" fontFamily="'Playfair Display', serif" fontSize="44" fontWeight="700" x="42" y="68">
                    𝄞
                  </text>
                  {/* Bass Clef Glyph (F Clef) */}
                  <text fill="#E5C363" fontFamily="'Playfair Display', serif" fontSize="34" fontWeight="700" x="42" y="156">
                    𝄢
                  </text>

                  {/* Time Signature 4/4 Treble */}
                  <text fill="#F7F4EE" fontFamily="'Inter', sans-serif" fontSize="20" fontWeight="700" x="82" y="50">
                    4
                  </text>
                  <text fill="#F7F4EE" fontFamily="'Inter', sans-serif" fontSize="20" fontWeight="700" x="82" y="70">
                    4
                  </text>
                  {/* Time Signature 4/4 Bass */}
                  <text fill="#F7F4EE" fontFamily="'Inter', sans-serif" fontSize="20" fontWeight="700" x="82" y="146">
                    4
                  </text>
                  <text fill="#F7F4EE" fontFamily="'Inter', sans-serif" fontSize="20" fontWeight="700" x="82" y="166">
                    4
                  </text>

                  {/* Dynamic Marking */}
                  <text fill="#E5C363" fontFamily="'Playfair Display', serif" fontSize="16" fontStyle="italic" fontWeight="600" x="110" y="98">
                    p
                  </text>

                  {/* MEASURE 1: Treble Theme C5 (Half Note), E5, G5 */}
                  <ellipse cx="140" cy="52" fill="none" rx="5.5" ry="4.2" stroke="#F7F4EE" strokeWidth="2" transform="rotate(-20 140 52)" />
                  <line stroke="#F7F4EE" strokeWidth="1.3" x1="145" x2="145" y1="52" y2="24" />

                  <ellipse cx="195" cy="42" fill="#F7F4EE" rx="5.5" ry="4.2" transform="rotate(-20 195 42)" />
                  <line stroke="#F7F4EE" strokeWidth="1.3" x1="200" x2="200" y1="42" y2="16" />

                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="238" x2="256" y1="32" y2="32" />
                  <ellipse cx="247" cy="32" fill="#F7F4EE" rx="5.5" ry="4.2" transform="rotate(-20 247 32)" />
                  <line stroke="#F7F4EE" strokeWidth="1.3" x1="252" x2="252" y1="32" y2="8" />

                  {/* MEASURE 1: Bass Alberti Figuration C-G-E-G */}
                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="112" x2="128" y1="178" y2="178" />
                  <ellipse cx="120" cy="178" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 120 178)" />
                  <line stroke="#F7F4EE" strokeWidth="1.2" x1="124" x2="124" y1="178" y2="152" />
                  <ellipse cx="145" cy="138" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 145 138)" />
                  <line stroke="#F7F4EE" strokeWidth="1.2" x1="149" x2="149" y1="138" y2="152" />
                  <ellipse cx="170" cy="158" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 170 158)" />
                  <line stroke="#F7F4EE" strokeWidth="1.2" x1="174" x2="174" y1="158" y2="152" />
                  <ellipse cx="195" cy="138" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 195 138)" />
                  <line stroke="#F7F4EE" strokeWidth="1.2" x1="199" x2="199" y1="138" y2="152" />
                  <line stroke="#F7F4EE" strokeWidth="2.5" x1="124" x2="199" y1="152" y2="152" />

                  <line stroke="#E2DDD5" strokeWidth="0.75" x1="212" x2="228" y1="178" y2="178" />
                  <ellipse cx="220" cy="178" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 220 178)" />
                  <line stroke="#F7F4EE" strokeWidth="1.2" x1="224" x2="224" y1="178" y2="152" />
                  <ellipse cx="240" cy="138" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 240 138)" />
                  <line stroke="#F7F4EE" strokeWidth="1.2" x1="244" x2="244" y1="138" y2="152" />
                  <ellipse cx="260" cy="158" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 260 158)" />
                  <line stroke="#F7F4EE" strokeWidth="1.2" x1="264" x2="264" y1="158" y2="152" />
                  <line stroke="#F7F4EE" strokeWidth="2.5" x1="224" x2="264" y1="152" y2="152" />

                  {/* MEASURE 2: Treble Descending Step */}
                  <ellipse cx="320" cy="52" fill="#F7F4EE" rx="5.5" ry="4.2" transform="rotate(-20 320 52)" />
                  <circle cx="330" cy="52" fill="#E5C363" r="1.5" />
                  <line stroke="#F7F4EE" strokeWidth="1.3" x1="325" x2="325" y1="52" y2="24" />

                  <ellipse cx="360" cy="47" fill="#F7F4EE" rx="5" ry="3.8" transform="rotate(-20 360 47)" />
                  <line stroke="#F7F4EE" strokeWidth="1.3" x1="364" x2="364" y1="47" y2="24" />
                  <ellipse cx="385" cy="42" fill="#F7F4EE" rx="5" ry="3.8" transform="rotate(-20 385 42)" />
                  <line stroke="#F7F4EE" strokeWidth="1.3" x1="389" x2="389" y1="42" y2="24" />
                  <line stroke="#F7F4EE" strokeWidth="2" x1="364" x2="389" y1="24" y2="24" />
                  <line stroke="#F7F4EE" strokeWidth="1.5" x1="364" x2="389" y1="28" y2="28" />

                  {/* Half note with trill */}
                  <ellipse cx="450" cy="52" fill="none" rx="5.5" ry="4.2" stroke="#F7F4EE" strokeWidth="2" transform="rotate(-20 450 52)" />
                  <line stroke="#F7F4EE" strokeWidth="1.3" x1="455" x2="455" y1="52" y2="26" />
                  <text fill="#E5C363" fontFamily="'Playfair Display', serif" fontSize="14" fontStyle="italic" fontWeight="700" x="444" y="22">
                    tr
                  </text>

                  {/* MEASURE 2 Bass Continuation */}
                  <ellipse cx="320" cy="148" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 320 148)" />
                  <ellipse cx="350" cy="138" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 350 138)" />
                  <ellipse cx="380" cy="158" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 380 158)" />
                  <ellipse cx="410" cy="138" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 410 138)" />
                  <ellipse cx="440" cy="178" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 440 178)" />
                  <ellipse cx="470" cy="138" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 470 138)" />
                  <ellipse cx="500" cy="158" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 500 158)" />
                  <ellipse cx="530" cy="138" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 530 138)" />

                  {/* MEASURE 3: Cadential Run */}
                  <ellipse cx="610" cy="62" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 610 62)" />
                  <ellipse cx="635" cy="57" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 635 57)" />
                  <ellipse cx="660" cy="52" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 660 52)" />
                  <ellipse cx="685" cy="47" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 685 47)" />
                  <ellipse cx="710" cy="42" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 710 42)" />
                  <ellipse cx="735" cy="37" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 735 37)" />
                  <ellipse cx="760" cy="32" fill="#F7F4EE" rx="4.5" ry="3.5" transform="rotate(-20 760 32)" />
                  <ellipse cx="795" cy="27" fill="#E5C363" rx="5.5" ry="4.2" transform="rotate(-20 795 27)" />
                  <circle cx="795" cy="18" fill="#E5C363" r="1.5" />
                  <line stroke="#F7F4EE" strokeWidth="2" x1="614" x2="764" y1="40" y2="10" />
                  <line stroke="#F7F4EE" strokeWidth="1.5" x1="614" x2="764" y1="44" y2="14" />

                  {/* Bass Pedal */}
                  <ellipse cx="620" cy="178" fill="none" rx="6" ry="4.5" stroke="#F7F4EE" strokeWidth="2" transform="rotate(-20 620 178)" />
                  <ellipse cx="750" cy="178" fill="none" rx="6" ry="4.5" stroke="#F7F4EE" strokeWidth="2" transform="rotate(-20 750 178)" />
                </svg>
              </div>

              {/* Metadata Bar with Gold Bullets */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-[#c6c6cc] text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C8A84B]"></span>
                  <span>
                    Tempo: <strong className="text-[#e5e2dc] font-semibold">120 BPM</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C8A84B]"></span>
                  <span>
                    Armadura: <strong className="text-[#e5e2dc] font-semibold">C Mayor (0♭ / 0♯)</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C8A84B]"></span>
                  <span>
                    Compás: <strong className="text-[#e5e2dc] font-semibold">4/4 Cuaternario</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C8A84B]"></span>
                  <span>
                    Extensión: <strong className="text-[#e5e2dc] font-semibold">12 compases cargados</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Studio Demonstration Banner (3 Cards) */}
        <section className="w-full bg-[#0e0e0b] px-6 sm:px-8 py-12 border-t border-b border-white/5">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative overflow-hidden rounded-xl bg-[#20201c] p-6 shadow-md flex flex-col justify-between h-72 group border border-white/5">
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[10px] text-[#C8A84B] tracking-widest uppercase font-semibold">
                  Canon de Leipzig
                </span>
                <span className="material-symbols-outlined text-[#c6c6cc]">history_edu</span>
              </div>
              <div className="relative z-10">
                <h4 className="font-serif text-2xl text-[#e5e2dc] font-semibold">Grabado de Placas</h4>
                <p className="mt-2 text-xs text-[#c6c6cc] leading-relaxed">
                  Proporciones visuales derivadas de ediciones históricas Breitkopf y Henle.
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-[#20201c] p-6 shadow-md flex flex-col justify-between h-72 group border border-white/5">
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[10px] text-[#C8A84B] tracking-widest uppercase font-semibold">
                  Motor Acústico
                </span>
                <span className="material-symbols-outlined text-[#c6c6cc]">graphic_eq</span>
              </div>
              <div className="relative z-10">
                <h4 className="font-serif text-2xl text-[#e5e2dc] font-semibold">Sampleado de Estudio</h4>
                <p className="mt-2 text-xs text-[#c6c6cc] leading-relaxed">
                  Respuesta tímbrica articulada con modelado de resonancia simpática.
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-[#20201c] p-6 shadow-md flex flex-col justify-between h-72 group border border-white/5">
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[10px] text-[#C8A84B] tracking-widest uppercase font-semibold">
                  Interoperabilidad
                </span>
                <span className="material-symbols-outlined text-[#c6c6cc]">folder_zip</span>
              </div>
              <div className="relative z-10">
                <h4 className="font-serif text-2xl text-[#e5e2dc] font-semibold">MusicXML 4.0 Nativo</h4>
                <p className="mt-2 text-xs text-[#c6c6cc] leading-relaxed">
                  Compatibilidad transparente con Sibelius, Dorico, MuseScore y Finale.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full bg-[#0C1220] px-6 sm:px-8 py-16" id="features">
          <div className="max-w-7xl mx-auto flex flex-col gap-12">
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
              <span className="text-[11px] font-semibold text-[#C8A84B] uppercase tracking-widest">
                Herramientas de Precisión
              </span>
              <h2 className="mt-2 font-serif text-3xl sm:text-4xl text-[#e5e2dc]">
                Diseñado para la composición sin compromisos
              </h2>
              <p className="mt-3 text-sm text-[#c6c6cc] leading-relaxed">
                Cada ligadura, plica y cabeza de nota responde a directrices tipográficas rigurosas aprobadas por orquestas y copistas profesionales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1: Notación profesional */}
              <div className="bg-[#212D44]/40 hover:bg-[#212D44] transition-colors rounded-xl p-8 shadow-md flex flex-col gap-4 border border-white/5 group">
                <div className="w-12 h-12 rounded-lg bg-[#1A2235] flex items-center justify-center text-[#C8A84B] text-3xl font-serif">
                  𝄞
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#e5e2dc]">Notación profesional</h3>
                  <p className="mt-2 text-sm text-[#c6c6cc] leading-relaxed">
                    Estándar NSM con fuente Finale Maestro. Exporta MusicXML 4.0 listo para imprimir.
                  </p>
                </div>
                <Link
                  to="/editor"
                  className="mt-auto pt-4 flex items-center gap-2 text-[#C8A84B] text-xs font-semibold group-hover:underline"
                >
                  <span>Ver muestras tipográficas</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </Link>
              </div>

              {/* Feature 2: Playback real */}
              <div className="bg-[#212D44]/40 hover:bg-[#212D44] transition-colors rounded-xl p-8 shadow-md flex flex-col gap-4 border border-white/5 group">
                <div className="w-12 h-12 rounded-lg bg-[#1A2235] flex items-center justify-center text-[#C8A84B] text-2xl">
                  🎹
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#e5e2dc]">Playback real</h3>
                  <p className="mt-2 text-sm text-[#c6c6cc] leading-relaxed">
                    Escucha tu partitura con articulaciones correctas. Staccato, tenuto, dinámicas.
                  </p>
                </div>
                <Link
                  to="/editor"
                  className="mt-auto pt-4 flex items-center gap-2 text-[#C8A84B] text-xs font-semibold group-hover:underline"
                >
                  <span>Explorar motor DSP</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </Link>
              </div>

              {/* Feature 3: Múltiples instrumentos */}
              <div className="bg-[#212D44]/40 hover:bg-[#212D44] transition-colors rounded-xl p-8 shadow-md flex flex-col gap-4 border border-white/5 group">
                <div className="w-12 h-12 rounded-lg bg-[#1A2235] flex items-center justify-center text-[#C8A84B] text-2xl">
                  📐
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#e5e2dc]">Múltiples instrumentos</h3>
                  <p className="mt-2 text-sm text-[#c6c6cc] leading-relaxed">
                    25 instrumentos con transposición automática. Piano, cuerdas, vientos y voces.
                  </p>
                </div>
                <Link
                  to="/dashboard"
                  className="mt-auto pt-4 flex items-center gap-2 text-[#C8A84B] text-xs font-semibold group-hover:underline"
                >
                  <span>Consultar banco orquestal</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Specs Matrix */}
        <section className="w-full bg-[#20201c] px-6 sm:px-8 py-12 border-t border-b border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col gap-2 max-w-md">
              <span className="text-[11px] font-semibold text-[#C8A84B] uppercase tracking-widest">
                Estándares Urtext
              </span>
              <h3 className="font-serif text-2xl text-[#e5e2dc]">
                Compatibilidad sin pérdida de formato
              </h3>
              <p className="text-xs text-[#c6c6cc] leading-relaxed">
                Exportación pura sin alteraciones de compases, fuentes vectoriales embebidas y compatibilidad MIDI 2.0 de micro-afinación.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
              <div className="bg-[#1c1c18] p-4 rounded-lg text-center shadow-sm border border-white/5">
                <div className="text-2xl font-bold text-[#C8A84B]">
                  0.75<span className="text-xs text-[#c6c6cc] font-normal">px</span>
                </div>
                <div className="text-[10px] text-[#c6c6cc] uppercase mt-1">Líneas de pentagrama</div>
              </div>
              <div className="bg-[#1c1c18] p-4 rounded-lg text-center shadow-sm border border-white/5">
                <div className="text-2xl font-bold text-[#C8A84B]">25+</div>
                <div className="text-[10px] text-[#c6c6cc] uppercase mt-1">Instrumentos nativos</div>
              </div>
              <div className="bg-[#1c1c18] p-4 rounded-lg text-center shadow-sm border border-white/5">
                <div className="text-2xl font-bold text-[#C8A84B]">4.0</div>
                <div className="text-[10px] text-[#c6c6cc] uppercase mt-1">MusicXML Spec</div>
              </div>
              <div className="bg-[#1c1c18] p-4 rounded-lg text-center shadow-sm border border-white/5">
                <div className="text-2xl font-bold text-[#C8A84B]">
                  &lt; 1<span className="text-xs text-[#c6c6cc] font-normal">ms</span>
                </div>
                <div className="text-[10px] text-[#c6c6cc] uppercase mt-1">Latencia de entrada</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="w-full bg-[#0C1220] px-6 sm:px-8 py-16 text-center">
          <div className="max-w-4xl mx-auto bg-[#212D44]/50 p-8 sm:p-12 rounded-xl shadow-xl flex flex-col items-center gap-5 border border-white/5">
            <span className="font-serif text-xl text-[#C8A84B]">Da vida a tus composiciones</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#e5e2dc]">
              Comienza a escribir con rigor tipográfico hoy
            </h2>
            <p className="max-w-xl text-sm text-[#c6c6cc] leading-relaxed">
              Accede instantáneamente desde cualquier navegador web moderno sin instalaciones complejas ni licencias restrictivas.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <Link
                to="/editor"
                className="px-6 py-3 rounded bg-[#C8A84B] text-[#0C1220] text-sm font-semibold hover:bg-[#E2C46A] shadow-md transition-all active:scale-95"
              >
                Abrir Editor en Blanco
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#0e0e0b] border-t border-white/5 mt-auto">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col gap-1">
            <div className="font-serif text-xl text-[#C8A84B]">ProPartituras</div>
            <p className="text-[11px] text-[#909096]">
              Edición tipográfica musical según cánones clásicos de grabado de placas europeas.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#909096]">
            <Link to="/" className="hover:text-[#e5e2dc] transition-colors">
              Inicio
            </Link>
            <Link to="/dashboard" className="hover:text-[#e5e2dc] transition-colors">
              Mis Proyectos
            </Link>
            <Link to="/export" className="hover:text-[#e5e2dc] transition-colors">
              Centro de Exportación
            </Link>
          </div>
          <div className="text-[10px] text-[#909096] text-center md:text-right">
            © 2026 ProPartituras Technologies GmbH. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};
