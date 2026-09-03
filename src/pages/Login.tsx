import { useState } from 'react'
import { Link } from 'react-router-dom'
import StaffSVG from '../components/StaffSVG'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // placeholder — no backend yet
    alert(`Login: ${email}`)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* COLUMNA IZQUIERDA */}
      <div style={{
        background: '#0C1220', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px 40px',
        borderRight: '1px solid #C8A84B22',
      }}
        className="login-left"
      >
        <div>
          <h1 style={{ fontFamily: '"Playfair Display", serif', color: '#C8A84B', fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>
            ProPartituras
          </h1>
          <p style={{ color: '#8898aa', fontSize: 13, margin: '0 0 40px' }}>NSM Standard</p>

          <h2 style={{ fontFamily: '"Playfair Display", serif', color: '#e8dfc8', fontSize: 26, margin: '0 0 16px', lineHeight: 1.3 }}>
            Tu música, en cualquier lugar
          </h2>
          <p style={{ color: '#8898aa', fontSize: 15, lineHeight: 1.7, margin: '0 0 40px', maxWidth: 360 }}>
            Crea, edita y exporta partituras profesionales desde el navegador. Estándar NSM, exportación MusicXML y audio en tiempo real.
          </p>

          {/* Staff decorativo semitransparente */}
          <div style={{ opacity: 0.4 }}>
            <StaffSVG theme="dark" />
          </div>
        </div>

        <footer style={{ color: '#445', fontSize: 12 }}>
          © 2026 ProPartituras · NSM Standard
        </footer>
      </div>

      {/* COLUMNA DERECHA */}
      <div style={{
        background: '#FAFAF7', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 40px',
      }}
        className="login-right"
      >
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontFamily: '"Playfair Display", serif', color: '#0C1220', fontSize: 26, margin: '0 0 8px' }}>
            Ingresar a tu cuenta
          </h2>
          <p style={{ color: '#667', fontSize: 14, margin: '0 0 32px' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: '#4A9EFF', textDecoration: 'none', fontWeight: 500 }}>
              Crear una gratis
            </Link>
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#445', fontWeight: 500, marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@correo.cl"
                required
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#445', fontWeight: 500, marginBottom: 6 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#889', fontSize: 16, padding: 0,
                  }}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Remember */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#445', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ accentColor: '#0C1220', width: 15, height: 15 }}
              />
              Mantener sesión activa
            </label>

            {/* Submit */}
            <button
              type="submit"
              style={{
                background: '#0C1220', color: '#C8A84B', border: 'none',
                borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', width: '100%', marginTop: 4,
              }}
            >
              Ingresar
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#ddd' }} />
            <span style={{ color: '#aaa', fontSize: 13 }}>o continúa con</span>
            <div style={{ flex: 1, height: 1, background: '#ddd' }} />
          </div>

          {/* OAuth buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button style={oauthBtnStyle}>
              <GoogleSVG />
              Continuar con Google
            </button>
            <button style={{ ...oauthBtnStyle, background: '#0C1220', color: '#C8A84B', borderColor: '#0C1220' }}>
              🎓 EduID / Conservatorio
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/forgot-password" style={{ color: '#889', fontSize: 13, textDecoration: 'none' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .login-left { display: none !important; }
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 14,
  border: '1px solid #ccc', borderRadius: 8, background: '#fff',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

const oauthBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '11px', border: '1px solid #ddd', borderRadius: 8,
  background: '#fff', color: '#333', cursor: 'pointer', fontSize: 14, fontWeight: 500, width: '100%',
}

function GoogleSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
