import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import NotePanel from '../components/NotePanel'
import StaffSVG from '../components/StaffSVG'
import type { NoteData, ScoreData } from '../utils/types'
import { playNote } from '../utils/audio'

const INITIAL_SCORE: ScoreData = {
  title: 'Sin título',
  composer: 'Compositor',
  instrument: 'Piano',
  timeSignature: [4, 4],
  keySignature: 0,
  measures: [
    {
      id: 'm1',
      notes: [
        { id: 'n1', pitch: 'C5', octave: 5, duration: 'quarter', accidental: null, articulation: 'none', dynamic: 'mf', ornament: 'none', beat: 1, measure: 1 },
        { id: 'n2', pitch: 'E5', octave: 5, duration: 'quarter', accidental: null, articulation: 'none', dynamic: 'mf', ornament: 'none', beat: 2, measure: 1 },
        { id: 'n3', pitch: 'G5', octave: 5, duration: 'quarter', accidental: null, articulation: 'none', dynamic: 'mf', ornament: 'none', beat: 3, measure: 1 },
        { id: 'n4', pitch: 'E5', octave: 5, duration: 'quarter', accidental: null, articulation: 'none', dynamic: 'mf', ornament: 'none', beat: 4, measure: 1 },
      ]
    }
  ]
}

export default function Editor() {
  const [score, setScore] = useState<ScoreData>(INITIAL_SCORE)
  const [selectedNote, setSelectedNote] = useState<NoteData | null>(null)

  function handleSelectNote(note: NoteData) {
    setSelectedNote({
      ...note,
      articulation: note.articulation ?? 'none',
      dynamic: 'mf',
    })
    playNote(note.pitch, 0.5, 90)
  }

  function handleUpdateNote(updated: NoteData) {
    setSelectedNote(updated)
    setScore((prev) => ({
      ...prev,
      measures: prev.measures.map((m) => ({
        ...m,
        notes: m.notes.map((n) => n.id === updated.id ? updated : n)
      }))
    }))
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      <Sidebar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Title bar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #C8A84B22', display: 'flex', gap: 16, alignItems: 'center' }}>
          <input
            value={score.title}
            onChange={(e) => setScore({ ...score, title: e.target.value })}
            style={{ background: 'none', border: 'none', outline: 'none', fontFamily: '"Playfair Display", serif', fontSize: 18, color: '#C8A84B', width: 300 }}
          />
          <span style={{ color: '#556', fontSize: 13 }}>— {score.composer}</span>
        </div>

        {/* Score canvas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <div style={{ background: '#0C1220', border: '1px solid #C8A84B22', borderRadius: 8, padding: 24, maxWidth: 900 }}>
            <StaffSVG theme="dark" />
          </div>

          {/* Note grid placeholder */}
          <div style={{ marginTop: 24 }}>
            <p style={{ color: '#445', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Notas del compás 1 — click para seleccionar</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {score.measures[0].notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  style={{
                    padding: '8px 16px', border: selectedNote?.id === note.id ? '2px solid #C8A84B' : '1px solid #334',
                    borderRadius: 6, background: selectedNote?.id === note.id ? '#C8A84B22' : '#0C1220',
                    color: selectedNote?.id === note.id ? '#C8A84B' : '#aaa',
                    cursor: 'pointer', fontFamily: '"Playfair Display", serif', fontSize: 14,
                  }}
                >
                  {note.pitch} ({note.duration})
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <NotePanel note={selectedNote} onUpdateNote={handleUpdateNote} />
    </div>
  )
}
