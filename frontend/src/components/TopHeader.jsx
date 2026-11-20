import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  MapPin,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  LogIn,
  User,
  LogOut,
  GraduationCap,
  CloudUpload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useTheme } from '../context/ThemeContext';

export default function TopHeader({ onToggleSidebar, onOpenAudit }) {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount } = useOfflineSync();
  const { isDark, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#f4f6fb]/90 dark:bg-[#090d1f]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
      
      {/* Left: Mobile Menu Trigger + UPTC Campus Tag */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 lg:hidden transition"
          title="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* University Location Pill Tag (Matches Reference Image) */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white leading-tight block">
              Comunidad Académica UPTC
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              <span>Tunja, Boyacá</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls: Online status, Theme toggle & Auth */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Status: En línea con punto verde pulsante (Matches Reference Image) */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-bold border shadow-2xs ${
            isOnline
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 animate-pulse'
          }`}
          title={isOnline ? 'Conexión a internet activa' : 'Modo offline'}
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-xs font-bold">{isOnline ? 'En línea' : `Offline (${pendingCount})`}</span>
        </div>

        {/* Theme Toggle Button (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-amber-400 transition shadow-2xs"
          title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* Auth CTA: Ingresar or Profile Menu (Matches Reference Image) */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/25 transition"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 text-white font-black flex items-center justify-center text-xs">
                {user.profile?.full_name ? user.profile.full_name.charAt(0) : 'U'}
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate">
                {user.profile?.full_name?.split(' ')[0] || 'Perfil'}
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl py-2 z-50 border border-slate-200 dark:border-slate-800 animate-fadeIn">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user.profile?.full_name || 'Estudiante'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mi Perfil Universitario</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs shadow-md shadow-brand-600/25 transition hover:scale-[1.02]"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Ingresar</span>
          </Link>
        )}

      </div>
    </header>
  );
}
