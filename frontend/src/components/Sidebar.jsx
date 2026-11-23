import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Users,
  Calendar,
  ShieldCheck,
  Download,
  Upload,
  LogIn,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function Sidebar({ onOpenAudit, onInstallApp, isInstallable }) {
  const location = useLocation();
  const { user } = useAuth();
  const { pendingCount } = useOfflineSync();

  const navItems = [
    { to: '/', label: 'Inicio', icon: Home },
    { to: '/?view=search&format=DOCUMENT', label: 'Recursos', icon: BookOpen },
    { to: '/create-post', label: 'Compartir', icon: Upload },
    { to: '/groups', label: 'Grupos', icon: Users },
    { to: '/meetings', label: 'Encuentros', icon: Calendar },
    ...(user?.role === 'ADMIN' ? [{ type: 'audit', label: 'Consola Servidor', icon: ShieldCheck, badge: 'A+' }] : []),
    ...(isInstallable ? [{ type: 'install', label: 'Instalar App', icon: Download }] : []),
    { to: user ? '/profile' : '/login', label: user ? 'Mi Perfil' : 'Ingresar', icon: user ? User : LogIn }
  ];

  const isActive = (item) => {
    if (item.type) return false;
    if (item.to === '/') return location.pathname === '/' && !location.search;
    if (item.to.includes('?')) return location.search.includes(item.to.split('?')[1]);
    return location.pathname === item.to;
  };

  return (
    <>
      {/* Sidebar Container: solo visible en escritorio */}
      <aside
        className="hidden lg:flex fixed top-0 bottom-0 left-0 z-50 w-56 flex-col justify-between"
        style={{ background: '#0b1028' }}
      >
        {/* Top: Logo Area with Academic Crest and Single Label */}
        <div className="w-full">
          <div className="w-full px-4 pt-7 pb-5 flex flex-col items-center justify-center relative text-center">
            <Link to="/" className="w-full flex flex-col items-center justify-center text-center group">
              <div className="w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform duration-200">
                <img
                  src="/images/uptc_eagle_crest.png"
                  alt="Emblema Académico UniLink"
                  className="w-full h-full object-contain filter drop-shadow-[0_4px_14px_rgba(255,255,255,0.2)] mx-auto"
                />
              </div>

              <h1 className="text-2xl font-black tracking-tight text-white leading-tight text-center">
                UniLink
              </h1>
              <span className="text-[11px] font-black text-indigo-300 tracking-[0.25em] uppercase text-center block mt-0.5">
                CAMPUS
              </span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1 mt-1">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const active = isActive(item);

              if (item.type === 'audit') {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { if (onOpenAudit) onOpenAudit(); }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left group"
                    style={{ color: '#94a3b8' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(52,211,153,0.18)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.35)' }}
                    >
                      {item.badge}
                    </span>
                  </button>
                );
              }

              if (item.type === 'install') {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { if (onInstallApp) onInstallApp(); }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left"
                    style={{ color: '#c4b5fd' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={idx}
                  to={item.to}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all"
                  style={
                    active
                      ? { background: '#5046e5', color: '#fff', boxShadow: '0 4px 14px rgba(80,70,229,0.4)' }
                      : { color: '#94a3b8' }
                  }
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; } }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.to === '/profile' && pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Crisp Native Vector SVG Architectural Watermark with matching app font */}
        <div className="px-5 pb-4 select-none pointer-events-none flex flex-col items-center">
          <div className="w-full text-indigo-300/35 dark:text-indigo-400/25">
            <svg
              viewBox="0 0 160 120"
              className="w-full h-auto max-h-[130px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Ground Hill Curve */}
              <path d="M 5,108 Q 80,95 155,108" strokeWidth="1.5" />

              {/* LEFT PAVILION / CHAPEL */}
              {/* Cross atop pediment */}
              <line x1="37.5" y1="18" x2="37.5" y2="25" />
              <line x1="34.5" y1="20" x2="40.5" y2="20" />

              {/* Pediment triangle */}
              <polyline points="15,42 37.5,25 60,42" />
              <line x1="15" y1="42" x2="60" y2="42" />
              <circle cx="37.5" cy="34" r="4.5" />

              {/* Left wall and floor dividers */}
              <line x1="15" y1="42" x2="15" y2="105" />
              <line x1="15" y1="68" x2="60" y2="68" />

              {/* Upper floor 3 arched windows */}
              <path d="M 20,62 L 20,50 Q 24,45 28,50 L 28,62 Z" />
              <path d="M 33.5,62 L 33.5,50 Q 37.5,45 41.5,50 L 41.5,62 Z" />
              <path d="M 47,62 L 47,50 Q 51,45 55,50 L 55,62 Z" />

              {/* Ground floor 3 arched portals */}
              <path d="M 20,95 L 20,78 Q 24,73 28,78 L 28,95" />
              <path d="M 33.5,95 L 33.5,76 Q 37.5,71 41.5,76 L 41.5,95" />
              <path d="M 47,95 L 47,78 Q 51,73 55,78 L 55,95" />

              {/* CENTER CONNECTOR WING */}
              <line x1="60" y1="38" x2="95" y2="38" />
              <line x1="60" y1="38" x2="60" y2="98" />
              <line x1="60" y1="68" x2="95" y2="68" />

              {/* Upper floor 2 windows */}
              <rect x="66" y="47" width="9" height="15" rx="1" />
              <line x1="70.5" y1="47" x2="70.5" y2="62" />
              <rect x="80" y="47" width="9" height="15" rx="1" />
              <line x1="84.5" y1="47" x2="84.5" y2="62" />

              {/* Ground floor 2 windows */}
              <rect x="66" y="76" width="9" height="16" rx="1" />
              <rect x="80" y="76" width="9" height="16" rx="1" />

              {/* RIGHT TOWER */}
              <line x1="95" y1="28" x2="95" y2="102" />
              <line x1="140" y1="28" x2="140" y2="105" />

              {/* Tower crown and cupola */}
              <line x1="92" y1="28" x2="143" y2="28" strokeWidth="1.5" />
              <rect x="95" y="18" width="45" height="10" rx="0.5" />
              <rect x="101" y="10" width="33" height="8" rx="1" />
              <line x1="117.5" y1="10" x2="117.5" y2="5" />

              {/* Belfry upper arched windows */}
              <path d="M 103,60 L 103,42 Q 108.5,35 114,42 L 114,60 Z" />
              <path d="M 121,60 L 121,42 Q 126.5,35 132,42 L 132,60 Z" />

              {/* Horizontal divider */}
              <line x1="95" y1="68" x2="140" y2="68" />

              {/* Tower middle windows */}
              <path d="M 104,95 L 104,78 Q 108.5,73 113,78 L 113,95 Z" />
              <path d="M 122,95 L 122,78 Q 126.5,73 131,78 L 131,95 Z" />
            </svg>
          </div>

          {/* Crisp HTML Typography with app font (Inter) */}
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-tight text-center mt-1">
            Campus Universitario • Comunidad Abierta
          </p>
        </div>
      </aside>
    </>
  );
}
