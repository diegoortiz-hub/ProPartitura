import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const [toast, setToast] = useState(false)

  function handleSave() {
    setToast(true)
    setTimeout(() => setToast(false), 2000)
  }

  const isEditor = location.pathname === '/editor'

  return (
    <header style={{ background: '#0C1220', borderBottom: '1px solid #C8A84B33', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontFamily: '"Playfair Display", serif', color: '#C8A84B', fontSize: 20, fontWeight: 700 }}>
          ProPartituras
        </span>
      </Link>

      <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <Link to="/editor" style={{ color: location.pathname === '/editor' ? '#C8A84B' : '#aaa', textDecoration: 'none', fontSize: 14 }}>Editor</Link>
        <Link to="/export" style={{ color: location.pathname === '/export' ? '#C8A84B' : '#aaa', textDecoration: 'none', fontSize: 14 }}>Exportar</Link>
        {isEditor && (
          <button
            onClick={handleSave}
            style={{ background: '#C8A84B', color: '#0C1220', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            Guardar
          </button>
        )}
        <Link to="/login" style={{ color: '#4A9EFF', textDecoration: 'none', fontSize: 14 }}>Ingresar</Link>
      </nav>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: '#1a2a1a', border: '1px solid #4caf50',
          color: '#4caf50', padding: '10px 20px', borderRadius: 8, fontSize: 14, zIndex: 9999,
          animation: 'fadein 0.2s ease'
        }}>
          ✓ Partitura guardada localmente
        </div>
      )}
    </header>
  )
}
