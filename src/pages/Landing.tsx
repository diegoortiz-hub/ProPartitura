import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import StaffSVG from '../components/StaffSVG'
import { playNote } from '../utils/audio'

// K.545 Allegro, compás 1, mano derecha — secuencia real
// ♩ = negra = 0.5s a 120 BPM, ♪ = corchea = 0.25s
interface MozartNote {
  pitch: string
  duration: number  // seconds
  symbol: string
}

const mozartNotes: MozartNote[] = [
  { pitch: 'C5', duration: 0.5,  symbol: '♩' },
  { pitch: 'D5', duration: 0.25, symbol: '♪' },
  { pitch: 'E5', duration: 0.25, symbol: '♪' },
  { pitch: 'F5', duration: 0.25, symbol: '♪' },
  { pitch: 'G5', duration: 0.5,  symbol: '♩' },
  { pitch: 'A5', duration: 0.25, symbol: '♪' },
  { pitch: 'G5', duration: 0.25, symbol: '♪' },
  { pitch: 'F5', duration: 0.25, symbol: '♪' },
  { pitch: 'E5', duration: 0.5,  symbol: '♩' },
  { pitch: 'D5', duration: 0.25, symbol: '♪' },
  { pitch: 'C5', duration: 0.25, symbol: '♪' },
  { pitch: 'B4', duration: 0.25, symbol: '♪' },
  { pitch: 'C5', duration: 0.5,  symbol: '♩' },
]

const STAFF_X1 = 60
const STAFF_X2 = 820
const STAFF_WIDTH = STAFF_X2 - STAFF_X1

export default function Landing() {
  const [playing, setPlaying] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [playheadX, setPlayheadX] = useState(STAFF_X1)
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalDuration = mozartNotes.reduce((s, n) => s + n.duration, 0)

  function clearTimers() {
    if (schedulerRef.current) clearTimeout(schedulerRef.current)
    if (animRef.current) clearTimeout(animRef.current)
  }

  function stopPlayback() {
    clearTimers()
    setPlaying(false)
    setActiveIdx(-1)
    setPlayheadX(STAFF_X1)
  }

  function startPlayback() {
    setPlaying(true)
    setActiveIdx(0)

    let elapsed = 0
    let currentX = STAFF_X1

    mozartNotes.forEach((note, i) => {
      const startMs = elapsed * 1000
      const durationSec = note.duration

      schedulerRef.current = setTimeout(() => {
        playNote(note.pitch, durationSec, 90)
        setActiveIdx(i)

        // Move playhead proportionally to note duration
        const pixelsPerSecond = STAFF_WIDTH / totalDuration
        const targetX = STAFF_X1 + (elapsed + durationSec) * pixelsPerSecond
        currentX = targetX

        // Animate playhead smoothly during this note's duration
        const steps = 20
        const stepMs = (durationSec * 1000) / steps
        const startXForNote = STAFF_X1 + elapsed * pixelsPerSecond
        for (let s = 0; s <= steps; s++) {
          setTimeout(() => {
            setPlayheadX(startXForNote + (targetX - startXForNote) * (s / steps))
          }, s * stepMs)
        }
      }, startMs)

      elapsed += durationSec
    })

    // Stop after total duration
    setTimeout(() => {
      setPlaying(false)
      setActiveIdx(-1)
      setPlayheadX(STAFF_X1)
    }, totalDuration * 1000 + 200)
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#080f1a', color: '#e8e8e8', fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Hero */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 40px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 52, fontWeight: 700, color: '#C8A84B', margin: '0 0 16px' }}>
          ProPartituras
        </h1>
        <p style={{ fontSize: 20, color: '#aaa', margin: '0 0 8px' }}>
          El editor de partituras profesional para compositores y docentes.
        </p>
        <p style={{ fontSize: 15, color: '#667', margin: '0 0 40px' }}>
          Estándar NSM · Exportación MusicXML · Audio y MIDI en tiempo real
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/editor" style={{
            background: '#C8A84B', color: '#0C1220', padding: '14px 32px',
            borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 16
          }}>
            Abrir Editor
          </Link>
          <Link to="/login" style={{
            border: '1px solid #C8A84B44', color: '#C8A84B', padding: '14px 32px',
            borderRadius: 8, textDecoration: 'none', fontSize: 16
          }}>
            Ingresar
          </Link>
        </div>
      </section>

      {/* Demo musical interactivo */}
      <section style={{ maxWidth: 900, margin: '0 auto 60px', padding: '0 24px' }}>
        <div style={{ background: '#0C1220', border: '1px solid #C8A84B33', borderRadius: 12, padding: '24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: '"Playfair Display", serif', color: '#C8A84B', fontSize: 18, margin: 0 }}>
                Sonata facile en Do Mayor, K. 545 — Allegro (Pasaje demostrativo)
              </h2>
              <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>W.A. Mozart · 120 BPM</p>
            </div>
            <button
              onClick={playing ? stopPlayback : startPlayback}
              style={{
                background: playing ? '#1a2233' : '#C8A84B', color: playing ? '#C8A84B' : '#0C1220',
                border: playing ? '1px solid #C8A84B' : 'none',
                borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap'
              }}
            >
              {playing ? '⏹ Detener' : '▶ Reproducir'}
            </button>
          </div>

          {/* Notas activas */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {mozartNotes.map((n, i) => (
              <span
                key={i}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 13,
                  background: i === activeIdx ? '#C8A84B' : '#1a2233',
                  color: i === activeIdx ? '#0C1220' : '#667',
                  fontFamily: '"Playfair Display", serif',
                  transition: 'background 0.1s, color 0.1s',
                  fontWeight: i === activeIdx ? 700 : 400,
                }}
              >
                {n.pitch}{n.symbol}
              </span>
            ))}
          </div>

          {/* SVG Staff con playhead */}
          <div style={{ position: 'relative' }}>
            <StaffSVG theme="dark" />
            {/* Playhead overlay */}
            <svg
              viewBox="0 0 900 240"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none' }}
            >
              <line
                x1={playheadX} y1={75} x2={playheadX} y2={165}
                stroke="#4A9EFF" strokeWidth={2} opacity={playing ? 0.8 : 0}
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {[
            { icon: '🎼', title: 'Editor profesional', desc: 'Entrada por teclado MIDI, ratón o teclado. Soporte de dinámicas, articulaciones y ornamentos completos.' },
            { icon: '🔊', title: 'Audio en tiempo real', desc: 'Motor Web Audio con síntesis polifónica. Previsualiza tu obra al instante sin plugins.' },
            { icon: '📤', title: 'Exportación NSM', desc: 'MusicXML, PDF de prensa, MIDI y generación de partes por instrumento.' },
          ].map((f) => (
            <div key={f.title} style={{ background: '#0C1220', border: '1px solid #C8A84B22', borderRadius: 10, padding: 24 }}>
              <span style={{ fontSize: 32 }}>{f.icon}</span>
              <h3 style={{ fontFamily: '"Playfair Display", serif', color: '#C8A84B', margin: '12px 0 8px', fontSize: 17 }}>{f.title}</h3>
              <p style={{ color: '#889', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
