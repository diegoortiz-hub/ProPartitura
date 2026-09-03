import Sidebar from '../components/Sidebar'

interface ComingSoonProps {
  section: string
}

export default function ComingSoon({ section }: ComingSoonProps) {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <span style={{ fontSize: 56 }}>🎵</span>
        <h2 style={{ fontFamily: '"Playfair Display", serif', color: '#C8A84B', margin: 0, fontSize: 22 }}>
          {section}
        </h2>
        <p style={{ color: '#667', fontSize: 15, margin: 0 }}>
          Esta sección estará disponible próximamente.
        </p>
      </main>
    </div>
  )
}
