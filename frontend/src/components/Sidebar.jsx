import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Users,
  Calendar,
  ShieldCheck,
  Download,
  Share2,
  LogIn,
  User,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function Sidebar({ isOpen, onClose, onOpenAudit, onInstallApp, isInstallable }) {
  const location = useLocation();
  const { user } = useAuth();
  const { pendingCount } = useOfflineSync();

  const navItems = [
    { to: '/', label: 'Inicio', icon: Home },
    { to: '/?format=DOCUMENT', label: 'Recursos', icon: BookOpen },
    { to: '/groups', label: 'Grupos', icon: Users },
    { to: '/meetings', label: 'Encuentros', icon: Calendar },
    { type: 'audit', label: 'Auditoría PWA', icon: ShieldCheck, badge: 'A+' },
    ...(isInstallable ? [{ type: 'install', label: 'Instalar App', icon: Download }] : []),
    { to: '/create-post', label: 'Compartir', icon: Share2 },
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
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#0b1028' }}
      >
        {/* Top: Logo Area */}
        <div>
          <div className="px-6 pt-7 pb-5 flex items-center justify-between">
            <Link to="/" onClick={onClose} className="flex items-center gap-3 group">
              {/* UPTC Eagle Crest — larger, more prominent */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
              >
                <svg viewBox="0 0 80 80" className="w-8 h-8" fill="white">
                  {/* Eagle body */}
                  <ellipse cx="40" cy="46" rx="12" ry="18" opacity="0.95" />
                  {/* Head */}
                  <circle cx="40" cy="24" r="8" />
                  {/* Beak */}
                  <path d="M44 26 L52 29 L45 32 Z" />
                  {/* Left wing spread */}
                  <path d="M28 42 C18 34 6 36 4 42 C10 38 20 44 28 48 Z" opacity="0.9" />
                  {/* Right wing spread */}
                  <path d="M52 42 C62 34 74 36 76 42 C70 38 60 44 52 48 Z" opacity="0.9" />
                  {/* Tail feathers */}
                  <path d="M34 62 L40 74 L46 62 Q40 68 34 62 Z" />
                  {/* Feet */}
                  <line x1="36" y1="64" x2="32" y2="72" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="44" y1="64" x2="48" y2="72" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="32" y1="72" x2="28" y2="75" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="32" y1="72" x2="33" y2="76" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="48" y1="72" x2="52" y2="75" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="48" y1="72" x2="47" y2="76" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>

              <div>
                <div className="text-xl font-black tracking-tight text-white leading-none">UniLink</div>
                <div className="text-[11px] font-semibold mt-0.5" style={{ color: '#a5b4fc' }}>UPTC</div>
              </div>
            </Link>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white lg:hidden transition"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="px-3 space-y-0.5">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const active = isActive(item);

              if (item.type === 'audit') {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { if (onClose) onClose(); if (onOpenAudit) onOpenAudit(); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left group"
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
                      style={{ background: 'rgba(52,211,153,0.15)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.3)' }}
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
                    onClick={() => { if (onClose) onClose(); if (onInstallApp) onInstallApp(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
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
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={
                    active
                      ? { background: '#4f46e5', color: '#fff' }
                      : { color: '#94a3b8' }
                  }
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; } }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
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

        {/* Bottom: Architectural Building Watermark */}
        <div className="px-4 pb-4 select-none pointer-events-none">
          <div className="relative overflow-hidden rounded-2xl" style={{ height: '120px' }}>
            {/* Tower silhouette watermark */}
            <svg viewBox="0 0 200 130" className="w-full h-full" style={{ opacity: 0.12 }}>
              {/* Church-like tower */}
              <rect x="80" y="8" width="40" height="110" fill="white" />
              {/* Tower spire */}
              <polygon points="100,0 76,12 124,12" fill="white" />
              {/* Clock circle */}
              <circle cx="100" cy="30" r="9" fill="#0b1028" />
              {/* Bell window */}
              <rect x="88" y="48" width="24" height="30" rx="12" fill="#0b1028" />
              {/* Door */}
              <rect x="90" y="90" width="20" height="28" rx="4" fill="#0b1028" />
              {/* Left colonnade */}
              <rect x="10" y="45" width="65" height="73" fill="white" />
              <rect x="20" y="55" width="8" height="50" fill="#0b1028" />
              <rect x="34" y="55" width="8" height="50" fill="#0b1028" />
              <rect x="48" y="55" width="8" height="50" fill="#0b1028" />
              <rect x="62" y="55" width="8" height="50" fill="#0b1028" />
              {/* Right colonnade */}
              <rect x="125" y="45" width="65" height="73" fill="white" />
              <rect x="130" y="55" width="8" height="50" fill="#0b1028" />
              <rect x="144" y="55" width="8" height="50" fill="#0b1028" />
              <rect x="158" y="55" width="8" height="50" fill="#0b1028" />
              <rect x="172" y="55" width="8" height="50" fill="#0b1028" />
            </svg>
          </div>
          <p className="text-center text-[10px] font-semibold mt-1" style={{ color: '#475569' }}>
            UPTC Tunja • Sede Central
          </p>
        </div>
      </aside>
    </>
  );
}
