import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('mozart@archivio-salzburg.at');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="bg-[#0C1220] text-[#e5e2dc] min-h-screen flex font-sans selection:bg-[#C8A84B]/20 selection:text-[#E2C46A] overflow-hidden">

      {/* LEFT HALF — Hero / Brand */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center p-12 bg-[#080b14] border-r border-[#1A2235] overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C8A84B]/8 rounded-full blur-[80px] pointer-events-none" />

        {/* Musical staff decorative SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
          {[100, 130, 160, 190, 220, 320, 350, 380, 410, 440].map((y, i) => (
            <line key={i} x1="0" x2="400" y1={y} y2={y} stroke="#C8A84B" strokeWidth="1" />
          ))}
          <text x="20" y="200" fontSize="120" fill="#C8A84B" fontFamily="serif">𝄞</text>
          <text x="20" y="430" fontSize="120" fill="#C8A84B" fontFamily="serif">𝄢</text>
        </svg>

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-[#C8A84B] text-[#0C1220] flex items-center justify-center font-bold text-4xl shadow-xl mb-6 select-none">
            𝄞
          </div>

          <h1 className="font-serif text-4xl font-bold text-[#C8A84B] tracking-tight">
            ProPartituras
          </h1>
          <p className="text-xs uppercase tracking-[3px] text-[#909096] font-semibold mt-2 mb-8">
            Estudio de Grabado Urtext
          </p>

          <blockquote className="font-serif text-lg italic text-[#e5e2dc]/80 leading-relaxed border-l-2 border-[#C8A84B]/50 pl-4 text-left">
            "La música no está en las notas, sino en el silencio entre ellas."
          </blockquote>
          <p className="mt-3 text-xs text-[#909096]">— Wolfgang Amadeus Mozart</p>

          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { value: '88', label: 'Notas MIDI' },
              { value: 'NSM', label: 'Estándar Urtext' },
              { value: '4K', label: 'Exportación DPI' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-serif text-2xl font-bold text-[#C8A84B]">{stat.value}</div>
                <div className="text-[10px] text-[#909096] uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT HALF — Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        <div className="absolute top-6 left-6 lg:hidden">
          <Link to="/" className="font-serif text-2xl text-[#C8A84B] hover:text-[#E2C46A] transition-colors">
            ProPartituras
          </Link>
        </div>

        <div className="w-full max-w-[420px] flex flex-col gap-6 mt-16 lg:mt-0">
          {/* Heading */}
          <div className="text-center lg:text-left">
            <h2 className="font-serif text-3xl text-[#e5e2dc] font-bold">Acceso al Taller</h2>
            <p className="text-xs text-[#c6c6cc] mt-2">
              Introduce tus credenciales de compositor o archivista
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-[#131929] rounded-xl p-8 shadow-2xl border border-white/5 flex flex-col gap-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#909096] uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[18px] text-[#909096]">mail</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="compositor@urtext.org"
                    className="w-full pl-10 pr-3 py-2.5 rounded bg-[#20201c] border border-white/5 text-[#e5e2dc] text-xs focus:border-[#4A9EFF] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#909096] uppercase tracking-wider">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Se ha enviado un enlace de recuperación a tu correo institucional.')}
                    className="text-[11px] text-[#C8A84B] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[18px] text-[#909096]">lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded bg-[#20201c] border border-white/5 text-[#e5e2dc] text-xs focus:border-[#4A9EFF] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="material-symbols-outlined absolute right-3 text-[18px] text-[#909096] hover:text-[#e5e2dc]"
                  >
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/10 bg-[#20201c] text-[#C8A84B] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="remember" className="text-xs text-[#c6c6cc] cursor-pointer">
                  Mantener sesión activa en este puesto de trabajo
                </label>
              </div>

              <button
                type="submit"
                className="mt-2 w-full py-2.5 rounded bg-[#C8A84B] text-[#0C1220] font-semibold text-xs hover:bg-[#E2C46A] shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">key</span>
                <span>Entrar al Atelier</span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-white/5"></div>
              <span className="absolute bg-[#131929] px-3 text-[10px] text-[#909096] uppercase tracking-wider font-semibold">
                O continúa mediante llave de archivo
              </span>
            </div>

            {/* SSO */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="py-2 px-3 rounded bg-[#212D44] hover:bg-[#1A2235] text-[#e5e2dc] text-xs font-medium transition-colors flex items-center justify-center gap-2 border border-white/5"
              >
                <span className="text-[14px]">🌐</span>
                <span>Google Workspace</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="py-2 px-3 rounded bg-[#212D44] hover:bg-[#1A2235] text-[#e5e2dc] text-xs font-medium transition-colors flex items-center justify-center gap-2 border border-white/5"
              >
                <span className="material-symbols-outlined text-[16px] text-[#C8A84B]">school</span>
                <span>EduID / Conservatorio</span>
              </button>
            </div>

            <div className="pt-2 border-t border-white/5 text-center text-xs text-[#c6c6cc]">
              ¿Aún no tienes licencia institucional?{' '}
              <Link to="/editor" className="text-[#C8A84B] font-semibold hover:underline">
                Solicitar cátedra de prueba
              </Link>
            </div>
          </div>

          {/* TLS badge */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-[#909096]">
            <span className="material-symbols-outlined text-[14px] text-[#2ECC71]">verified_user</span>
            <span>Conexión encriptada TLS 1.3 • Clave criptográfica de partitura verificada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
