import { Link, useLocation } from 'react-router-dom'

const NAV = [
  { label: '♩ Editor', to: '/editor' },
  { label: '🎼 Instrumentos', to: '/instruments' },
  { label: '📤 Exportar', to: '/export' },
  { label: '🕒 Historial', to: '/history' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside style={{
      width: 200, background: '#080f1a', borderRight: '1px solid #C8A84B22',
      display: 'flex', flexDirection: 'column', padding: '16px 0', flexShrink: 0
    }}>
      {NAV.map((item) => {
        const active = location.pathname === item.to
        return (
          <Link
            key={item.to}
            to={item.to}
            style={{
              display: 'block', padding: '10px 20px', textDecoration: 'none',
              fontSize: 14, color: active ? '#C8A84B' : '#8898aa',
              background: active ? '#C8A84B11' : 'transparent',
              borderLeft: active ? '3px solid #C8A84B' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </aside>
  )
}
