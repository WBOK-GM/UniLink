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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-56 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#0b1028' }}
      >
        {/* Top: Logo Area with Authentic UPTC Crest and Single Label */}
        <div>
          <div className="px-5 pt-6 pb-4 flex flex-col items-center relative text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white lg:hidden transition"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <X className="w-4 h-4" />
            </button>

            <Link to="/" onClick={onClose} className="flex flex-col items-center group">
              <div className="w-14 h-12 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                <img
                  src="/images/uptc_eagle_crest.png"
                  alt="Escudo Oficial UPTC"
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              </div>

              <h1 className="text-xl font-black tracking-tight text-white leading-none">
                UniLink
              </h1>
              <span className="text-[10px] font-extrabold text-slate-300 tracking-widest mt-1 uppercase">
                UPTC
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
                    onClick={() => { if (onClose) onClose(); if (onOpenAudit) onOpenAudit(); }}
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
                    onClick={() => { if (onClose) onClose(); if (onInstallApp) onInstallApp(); }}
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
                  onClick={onClose}
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

        {/* Bottom: Clean Transparent Architectural Watermark */}
        <div className="px-4 pb-4 select-none pointer-events-none flex flex-col items-center">
          <img
            src="/images/uptc_blueprint_clean.png"
            alt="UPTC Tunja • Sede Central"
            className="w-full h-auto max-h-[145px] object-contain opacity-75"
          />
        </div>
      </aside>
    </>
  );
}
