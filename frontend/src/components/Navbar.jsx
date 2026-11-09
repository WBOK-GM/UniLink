import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Compass,
  Users,
  Calendar,
  PlusCircle,
  Wifi,
  WifiOff,
  CloudUpload,
  User,
  LogOut,
  Bell,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, syncOfflinePosts } = useOfflineSync();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navLinks = [
    { to: '/', label: 'Recursos', icon: Layers },
    { to: '/map', label: 'Mapa de Grupos', icon: Compass },
    { to: '/groups', label: 'Grupos', icon: Users },
    { to: '/meetings', label: 'Encuentros', icon: Calendar },
    { to: '/offline-queue', label: 'Cola Offline', icon: CloudUpload, badge: pendingCount }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold bg-gradient-to-r from-white via-indigo-200 to-brand-400 bg-clip-text text-transparent">
                  UniLink
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/30">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Comunidad Académica</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-brand-400' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                  {link.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-amber-500 text-slate-950 animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Online / Offline Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-950/40 text-amber-400 border-amber-500/30 animate-pulse'
              }`}
              title={isOnline ? 'Conexión a internet activa' : 'Modo sin conexión'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">En línea</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Offline {pendingCount > 0 && `(${pendingCount})`}</span>
                </>
              )}
            </div>

            {/* Quick Post Button */}
            <Link
              to="/create-post"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-md shadow-brand-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Publicar</span>
            </Link>

            {/* User Profile / Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
                    {user.profile?.full_name ? user.profile.full_name.charAt(0) : 'U'}
                  </div>
                  <span className="text-xs font-medium text-slate-200 hidden lg:inline max-w-[120px] truncate">
                    {user.profile?.full_name || user.email}
                  </span>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl glass-panel shadow-2xl py-2 z-50 border border-slate-700/80">
                    <div className="px-4 py-2 border-b border-slate-700/60">
                      <p className="text-sm font-semibold text-white truncate">{user.profile?.full_name || 'Estudiante'}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      <p className="text-[10px] text-brand-400 mt-1 font-medium">{user.profile?.academic_program || 'Ingeniería'}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Mi Perfil y Ubicación</span>
                    </Link>

                    <Link
                      to="/offline-queue"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition"
                    >
                      <CloudUpload className="w-4 h-4 text-slate-400" />
                      <span>Cola Offline ({pendingCount})</span>
                    </Link>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-400 hover:bg-rose-950/30 transition text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
