import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { label: 'Mi Proyecto', path: '/dashboard', icon: 'dashboard' },
    { label: 'Taller / Editor', path: '/editor', icon: 'edit_note' },
    { label: 'Instrumentos', path: '/instruments', icon: 'piano' },
    { label: 'Historial', path: '/history', icon: 'history' },
    { label: 'Exportación', path: '/export', icon: 'output' },
  ];

  return (
    <aside className="fixed left-0 top-[60px] h-[calc(100vh-60px)] w-[220px] bg-[#131929] z-40 flex flex-col justify-between border-r border-[#1A2235] select-none py-5">
      <div className="flex flex-col">
        {/* Navigation list */}
        <nav className="flex flex-col">
          {menuItems.map((item) => {
            const active = currentPath === item.path || (item.path === '/dashboard' && currentPath === '/');
            return (
              <Link
                key={item.path}
                to={item.path === '/instruments' || item.path === '/history' ? '/editor' : item.path}
                className={`px-6 py-3 flex items-center gap-3 text-sm transition-colors ${
                  active
                    ? 'bg-[rgba(200,168,75,0.1)] border-l-[3px] border-[#C8A84B] text-[#C8A84B] font-medium'
                    : 'text-[#a1b0c5] hover:bg-[#1A2235] hover:text-white border-l-[3px] border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Technical Score Status */}
        <div className="px-6 pt-6">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#7f8ea3] mb-2.5">
            Grabado Urtext
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between text-[#a1b0c5]">
              <span className="text-slate-500">Compás</span>
              <span className="font-medium text-white">4/4 (C)</span>
            </div>
            <div className="flex items-center justify-between text-[#a1b0c5]">
              <span className="text-slate-500">Armadura</span>
              <span className="font-medium text-white">Do Mayor</span>
            </div>
            <div className="flex items-center justify-between text-[#a1b0c5]">
              <span className="text-slate-500">Tempo</span>
              <span className="font-medium text-[#C8A84B]">♩ = 120</span>
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized Workspace Status (Sleek Theme Card) */}
      <div className="p-6 mt-auto">
        <div className="bg-[#131929] border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] uppercase text-slate-500 mb-2 font-semibold tracking-wider">
            Espacio de trabajo
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <div className="text-xs text-[#a1b0c5] font-medium">Sincronizado</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

