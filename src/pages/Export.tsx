import { useState } from 'react'
import StaffSVG from '../components/StaffSVG'
import Sidebar from '../components/Sidebar'

type ExportFormat = 'musicxml' | 'pdf' | 'audio' | 'parts'

const FORMAT_LABELS: Record<ExportFormat, string> = {
  musicxml: 'Descargar MusicXML (.mxl)',
  pdf: 'Generar PDF de Prensa',
  audio: 'Exportar Audio y MIDI',
  parts: 'Generar Lote de Partes',
}

const FORMATS: { id: ExportFormat; icon: string; label: string; desc: string }[] = [
  { id: 'musicxml', icon: '🎼', label: 'MusicXML', desc: 'Compatible con Finale, Sibelius, MuseScore' },
  { id: 'pdf', icon: '📄', label: 'PDF', desc: 'Resolución de prensa, tipografía Bravura' },
  { id: 'audio', icon: '🔊', label: 'Audio + MIDI', desc: 'WAV 48kHz + MIDI tipo 1' },
  { id: 'parts', icon: '📦', label: 'Partes', desc: 'Una parte por instrumento en ZIP' },
]

export default function Export() {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('musicxml')

  function handleExport() {
    alert(`Exportando: ${FORMAT_LABELS[selectedFormat]}`)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* IZQUIERDA — Preview 55% */}
        <div style={{ width: '55%', padding: 32, overflowY: 'auto', borderRight: '1px solid #C8A84B22' }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #ddd',
            borderRadius: 8, padding: '32px 40px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          }}>
            <h1 style={{ fontFamily: '"Playfair Display", serif', color: '#1a1a1a', fontSize: 22, margin: '0 0 4px', textAlign: 'center' }}>
              Sin título
            </h1>
            <p style={{ fontFamily: '"Inter", sans-serif', fontStyle: 'italic', color: '#555', fontSize: 14, textAlign: 'center', margin: '0 0 24px' }}>
              Compositor
            </p>

            <StaffSVG theme="paper" />

            {/* Metadata chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20, justifyContent: 'center' }}>
              {['4 compases', '~30s', 'Piano', '4/4 · Do Mayor'].map((chip) => (
                <span key={chip} style={{
                  padding: '4px 12px', background: '#f0f0ec', border: '1px solid #ddd',
                  borderRadius: 20, fontSize: 12, color: '#556',
                }}>
                  {chip}
                </span>
              ))}
            </div>

            <p style={{ textAlign: 'center', color: '#bbb', fontSize: 11, marginTop: 24 }}>
              © 2026 ProPartituras · NSM Standard
            </p>
          </div>
        </div>

        {/* DERECHA — Opciones 45% */}
        <div style={{ width: '45%', padding: 32, overflowY: 'auto' }}>
          <h2 style={{ fontFamily: '"Playfair Display", serif', color: '#C8A84B', fontSize: 20, margin: '0 0 24px' }}>
            Opciones de exportación
          </h2>

          {/* Format selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFormat(f.id)}
                style={{
                  padding: '14px 12px', border: selectedFormat === f.id ? '2px solid #C8A84B' : '1px solid #334',
                  borderRadius: 8, background: selectedFormat === f.id ? '#C8A84B11' : '#0C1220',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{f.icon}</div>
                <div style={{ color: selectedFormat === f.id ? '#C8A84B' : '#ccc', fontWeight: 600, fontSize: 13 }}>{f.label}</div>
                <div style={{ color: '#667', fontSize: 11, marginTop: 2 }}>{f.desc}</div>
              </button>
            ))}
          </div>

          {/* Options per format */}
          <div style={{ background: '#0C1220', border: '1px solid #C8A84B22', borderRadius: 8, padding: 20, marginBottom: 24 }}>
            <p style={{ color: '#889', fontSize: 13, margin: 0 }}>
              {selectedFormat === 'musicxml' && 'Exporta la partitura completa en formato MusicXML 4.0, compatible con todos los editores profesionales.'}
              {selectedFormat === 'pdf' && 'Genera un PDF listo para imprimir con tipografía Bravura y resolución de prensa (300 dpi).'}
              {selectedFormat === 'audio' && 'Renderiza el audio con el motor de síntesis interno y exporta MIDI tipo 1 compatible con DAWs.'}
              {selectedFormat === 'parts' && 'Genera una parte individual por cada instrumento de la partitura, empaquetadas en un ZIP.'}
            </p>
          </div>

          {/* Main CTA */}
          <button
            onClick={handleExport}
            style={{
              width: '100%', padding: '14px', background: '#C8A84B', color: '#0C1220',
              border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', marginBottom: 12,
            }}
          >
            {FORMAT_LABELS[selectedFormat]}
          </button>

          <button style={{
            width: '100%', padding: '12px', background: 'none', color: '#667',
            border: '1px solid #334', borderRadius: 8, fontSize: 14, cursor: 'pointer',
          }}>
            Vista previa en nueva pestaña
          </button>
        </div>
      </div>
    </div>
  )
}
