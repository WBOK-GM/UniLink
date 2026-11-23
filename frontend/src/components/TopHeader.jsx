import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sun,
  Moon,
  LogIn,
  User,
  LogOut,
  GraduationCap,
  HardDrive,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useTheme } from '../context/ThemeContext';
import StorageManagerModal from './StorageManagerModal';
import NotificationsBell from './NotificationsBell';

export default function TopHeader({ onOpenAudit }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isOnline, pendingCount } = useOfflineSync();
  const { isDark, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const isResourcesView =
    location.pathname === '/' &&
    (searchParams.get('view') === 'search' || searchParams.has('format'));

  const pageTitles = {
    '/': 'Inicio',
    '/create-post': 'Compartir',
    '/groups': 'Grupos',
    '/meetings': 'Encuentros',
    '/map': 'Mapa',
    '/profile': 'Mi Perfil',
    '/offline-queue': 'Cola Offline',
    '/login': 'Ingresar',
  };

  const pageTitle = isResourcesView
    ? 'Recursos'
    : (pageTitles[location.pathname] || 'UniLink');

  return (
    <header className="flex sticky top-0 z-30 bg-white/95 dark:bg-[#090d1f]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 transition-colors shadow-2xs">
      
      {/* Left: Página actual */}
      <div className="flex items-center gap-3">
        {/* Pill con el nombre de la página actual */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white leading-tight block">
              {pageTitle}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Campus Abierto</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls: Online status, Theme toggle & Auth */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Guest Mode Indicator */}
        {user?.role === 'GUEST' && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <Eye className="w-3.5 h-3.5" />
              <span>Modo Invitado (Solo Lectura)</span>
            </span>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition shadow-xs"
            >
              Registrarse
            </button>
          </div>
        )}
        
        {/* Status: En línea con punto verde pulsante (Matches Reference Image) */}
        <div
          className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs font-bold border shadow-2xs ${
            isOnline
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 animate-pulse'
          }`}
          title={isOnline ? 'Conexión a internet activa' : 'Modo offline'}
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-xs font-bold">{isOnline ? 'En línea' : `Offline (${pendingCount})`}</span>
        </div>

        {/* Notificaciones in-app */}
        {user && (
          <NotificationsBell
            buttonClassName="relative p-2 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition shadow-2xs"
            iconClassName="w-4 h-4"
          />
        )}

        {/* Theme Toggle Button (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-amber-400 transition shadow-2xs"
          title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />}
        </button>

        {/* Auth CTA: Ingresar or Profile Menu (Matches Reference Image) */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition"
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
                    setShowStorageModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Almacenamiento Offline</span>
                </button>

                {user?.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenAudit();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition text-left"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Consola Servidor</span>
                  </button>
                )}

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
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 transition hover:scale-[1.02]"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Ingresar</span>
          </Link>
        )}

      </div>

      <StorageManagerModal
        isOpen={showStorageModal}
        onClose={() => setShowStorageModal(false)}
      />
    </header>
  );
}
