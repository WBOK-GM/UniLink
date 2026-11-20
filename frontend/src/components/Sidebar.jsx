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
  PlusCircle,
  Compass,
  CloudUpload,
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-uptc-900 border-r border-uptc-800 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <Link to="/" onClick={onClose} className="flex items-center gap-3 group">
              {/* University Crest Vector Graphic */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-500 p-0.5 shadow-lg shadow-brand-600/30 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-uptc-900 rounded-[14px] flex items-center justify-center p-1.5">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                    {/* Stylized University Eagle / Falcon Crest */}
                    <path d="M50 8 C40 16 30 18 20 22 C22 36 26 48 34 58 C38 46 44 38 50 34 C56 38 62 46 66 58 C74 48 78 36 80 22 C70 18 60 16 50 8 Z" opacity="0.9" />
                    <circle cx="50" cy="22" r="5" />
                    <path d="M50 38 L38 60 C38 72 44 86 50 92 C56 86 62 72 62 60 Z" />
                    <line x1="30" y1="92" x2="70" y2="92" stroke="white" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-white">UniLink</span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-brand-500/30 text-brand-300 border border-brand-400/30">
                    UPTC
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Plataforma Académica</p>
              </div>
            </Link>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-uptc-800 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-none">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const active = isActive(item);

            if (item.type === 'audit') {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                    if (onOpenAudit) onOpenAudit();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-uptc-800/80 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
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
                  onClick={() => {
                    if (onClose) onClose();
                    if (onInstallApp) onInstallApp();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-500/20 transition-all text-left"
                >
                  <Icon className="w-4 h-4 text-purple-400" />
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={idx}
                to={item.to}
                onClick={onClose}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-uptc-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.to === '/profile' && pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Architectural Building Graphic Watermark */}
        <div className="p-4 pt-0 relative overflow-hidden pointer-events-none select-none">
          <div className="w-full h-32 flex items-end justify-center opacity-15">
            {/* SVG Architectural Silhouette of UPTC Central Building */}
            <svg viewBox="0 0 200 120" className="w-full h-full fill-current text-white">
              {/* Central Clock Tower */}
              <rect x="85" y="10" width="30" height="100" />
              <polygon points="100,0 80,15 120,15" />
              <circle cx="100" cy="30" r="6" fill="#0b1028" />
              <rect x="93" y="45" width="14" height="25" rx="7" fill="#0b1028" />
              <rect x="90" y="80" width="20" height="30" rx="3" fill="#0b1028" />
              {/* Left Wing */}
              <rect x="15" y="40" width="65" height="70" />
              <polygon points="10,40 85,40 50,28" />
              <rect x="25" y="52" width="12" height="18" fill="#0b1028" />
              <rect x="45" y="52" width="12" height="18" fill="#0b1028" />
              <rect x="65" y="52" width="12" height="18" fill="#0b1028" />
              <rect x="25" y="80" width="12" height="20" fill="#0b1028" />
              <rect x="45" y="80" width="12" height="20" fill="#0b1028" />
              <rect x="65" y="80" width="12" height="20" fill="#0b1028" />
              {/* Right Wing */}
              <rect x="120" y="40" width="65" height="70" />
              <polygon points="115,40 190,40 150,28" />
              <rect x="128" y="52" width="12" height="18" fill="#0b1028" />
              <rect x="148" y="52" width="12" height="18" fill="#0b1028" />
              <rect x="168" y="52" width="12" height="18" fill="#0b1028" />
              <rect x="128" y="80" width="12" height="20" fill="#0b1028" />
              <rect x="148" y="80" width="12" height="20" fill="#0b1028" />
              <rect x="168" y="80" width="12" height="20" fill="#0b1028" />
            </svg>
          </div>
          <p className="text-[10px] text-center text-slate-500 font-semibold mt-1">
            UPTC Tunja • Sede Central
          </p>
        </div>
      </aside>
    </>
  );
}
