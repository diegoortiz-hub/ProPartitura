import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  variant?: 'landing' | 'app';
  onSave?: () => void;
  onShare?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ variant = 'app', onSave, onShare }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [saveToast, setSaveToast] = useState(false);

  const handleSave = () => {
    if (onSave) onSave();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const navItems = [
    { label: 'Landing', path: '/' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Editor', path: '/editor' },
    { label: 'Exportar', path: '/export' },
  ];

  const isCurrent = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-[#131929] border-b border-[#1A2235] flex items-center justify-between px-6 select-none shadow-md">
      {/* Brand Logo */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-[6px] bg-[#C8A84B] text-[#0C1220] flex items-center justify-center font-bold text-xl shadow-sm leading-none select-none">
            𝄞
          </div>
          <span className="font-serif text-[22px] font-bold text-[#C8A84B] group-hover:text-[#E2C46A] transition-colors tracking-tight">
            ProPartituras
          </span>
        </Link>
      </div>

      {/* Screen Tabs */}
      <nav className="hidden md:flex items-center gap-1 bg-[#0C1220] p-1 rounded-lg border border-[#1A2235]">
        {navItems.map((item) => {
          const active = isCurrent(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-[#1A2235] text-[#C8A84B] font-semibold shadow-sm'
                  : 'text-[#7f8ea3] hover:text-white hover:bg-[#1A2235]/40'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0C1220] border border-[#1A2235]">
          <span className="w-2 h-2 rounded-full bg-[#2ECC71] animate-pulse"></span>
          <span className="text-[11px] font-medium text-[#7f8ea3] tracking-wider uppercase">
            DSP Ready
          </span>
        </div>

        {/* Save toast */}
        {saveToast && (
          <div className="absolute top-[68px] right-6 bg-[#1A2235] border border-[#2ECC71]/40 text-[#2ECC71] text-xs px-3 py-2 rounded-lg shadow-xl flex items-center gap-2 pointer-events-none z-[60]">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span className="font-medium">Partitura guardada</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="bg-[#1A2235] text-white px-4 py-1.5 rounded text-sm font-medium border border-slate-700 hover:bg-[#212D44] hover:border-slate-600 transition-colors shadow-sm"
        >
          Guardar
        </button>

        <button
          type="button"
          onClick={onShare}
          className="bg-[#C8A84B] text-[#0C1220] px-4 py-1.5 rounded text-sm font-bold hover:bg-[#E2C46A] transition-colors shadow-sm"
        >
          Compartir
        </button>

        <Link
          to="/login"
          className="w-8 h-8 rounded-full bg-[#1A2235] border border-slate-700 flex items-center justify-center text-[#a1b0c5] hover:text-white hover:border-[#C8A84B] transition-colors ml-1"
          title="Mi Cuenta"
        >
          <span className="material-symbols-outlined text-[18px]">person</span>
        </Link>
      </div>
    </header>
  );
};
