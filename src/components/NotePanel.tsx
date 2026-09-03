import type { NoteData, Articulation, Dynamic, Ornament } from '../utils/types'

interface NotePanelProps {
  note: NoteData | null
  onUpdateNote: (updated: NoteData) => void
}

const DYNAMICS_ROW1: Dynamic[] = ['ppp', 'pp', 'p', 'mp']
const DYNAMICS_ROW2: Dynamic[] = ['mf', 'f', 'ff', 'fff']
const DYNAMICS_ROW3: Dynamic[] = ['sfz', 'sfp', 'fp']

const ARTICULATIONS: { value: Articulation; label: string }[] = [
  { value: 'none', label: '—' },
  { value: 'staccato', label: '·' },
  { value: 'tenuto', label: '—' },
  { value: 'accent', label: '>' },
  { value: 'marcato', label: '^' },
  { value: 'staccatissimo', label: '▼' },
  { value: 'portato', label: '-·' },
]

const ORNAMENTS: { value: Ornament; label: string }[] = [
  { value: 'none', label: 'Ninguno' },
  { value: 'trill', label: 'Trino (tr)' },
  { value: 'trill-slow', label: 'Trino lento (tr~)' },
  { value: 'mordent', label: 'Mordente' },
  { value: 'mordent-inv', label: 'Mordente invertido' },
  { value: 'turn', label: 'Grupeto' },
  { value: 'appoggiatura', label: 'Apoyatura' },
  { value: 'acciaccatura', label: 'Acciaccatura' },
]

function DynBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 32, height: 32, border: active ? '2px solid #C8A84B' : '1px solid #334',
        background: active ? '#C8A84B22' : '#0C1220',
        color: active ? '#C8A84B' : '#aaa',
        borderRadius: 4, cursor: 'pointer',
        fontFamily: '"Playfair Display", serif', fontStyle: 'italic',
        fontSize: 11, padding: 0, lineHeight: 1,
      }}
    >
      {label}
    </button>
  )
}

export default function NotePanel({ note, onUpdateNote }: NotePanelProps) {
  if (!note) {
    return (
      <aside style={{ width: 220, padding: 20, borderLeft: '1px solid #C8A84B22', color: '#666', fontSize: 13 }}>
        <p>Selecciona una nota para editar sus propiedades.</p>
      </aside>
    )
  }

  function update(partial: Partial<NoteData>) {
    onUpdateNote({ ...note!, ...partial })
  }

  return (
    <aside style={{ width: 220, padding: 16, borderLeft: '1px solid #C8A84B22', overflowY: 'auto' }}>
      <h3 style={{ fontFamily: '"Playfair Display", serif', color: '#C8A84B', margin: '0 0 12px', fontSize: 15 }}>
        {note.pitch} — {note.duration}
      </h3>

      {/* Dynamics */}
      <section style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Dinámica</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 32px)', gap: 4, marginBottom: 4 }}>
          {DYNAMICS_ROW1.map((d) => (
            <DynBtn key={d} label={d} active={note.dynamic === d} onClick={() => update({ dynamic: d })} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 32px)', gap: 4, marginBottom: 4 }}>
          {DYNAMICS_ROW2.map((d) => (
            <DynBtn key={d} label={d} active={note.dynamic === d} onClick={() => update({ dynamic: d })} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 32px)', gap: 4 }}>
          {DYNAMICS_ROW3.map((d) => (
            <DynBtn key={d} label={d} active={note.dynamic === d} onClick={() => update({ dynamic: d })} />
          ))}
        </div>
      </section>

      {/* Articulation */}
      <section style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Articulación</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 32px)', gap: 4 }}>
          {ARTICULATIONS.map((a) => (
            <button
              key={a.value}
              onClick={() => update({ articulation: a.value })}
              title={a.value}
              style={{
                width: 32, height: 32, border: note.articulation === a.value ? '2px solid #4A9EFF' : '1px solid #334',
                background: note.articulation === a.value ? '#4A9EFF22' : '#0C1220',
                color: note.articulation === a.value ? '#4A9EFF' : '#aaa',
                borderRadius: 4, cursor: 'pointer', fontSize: 13, padding: 0,
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>

      {/* Ornament */}
      <section>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Ornamento</p>
        <select
          value={note.ornament}
          onChange={(e) => update({ ornament: e.target.value as Ornament })}
          style={{
            width: '100%', background: '#0C1220', border: '1px solid #334',
            color: '#e8e8e8', padding: '6px 8px', borderRadius: 4, fontSize: 13,
          }}
        >
          {ORNAMENTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </section>
    </aside>
  )
}
