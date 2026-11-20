import React, { useState, useEffect } from 'react';
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
  Sun,
  Moon,
  Layers,
  ShieldCheck,
  Download,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useTheme } from '../context/ThemeContext';
import AdminPortal from '../admin/AdminPortal';
import SensorDiagnosticsModal from './SensorDiagnosticsModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount } = useOfflineSync();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Escuchar evento PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Si ya está instalado en standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const navLinks = [
    { to: '/', label: 'Recursos', icon: Layers },
    { to: '/map', label: 'Mapa de Grupos', icon: Compass },
    { to: '/groups', label: 'Grupos', icon: Users },
    { to: '/meetings', label: 'Encuentros', icon: Calendar },
    { to: '/offline-queue', label: 'Cola Offline', icon: CloudUpload, badge: pendingCount }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 glass-nav border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black bg-gradient-to-r from-brand-700 via-indigo-600 to-purple-600 dark:from-white dark:via-indigo-200 dark:to-brand-400 bg-clip-text text-transparent tracking-tight">
                    UniLink
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded-md border border-brand-200 dark:border-brand-500/30">
                    PWA
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  Comunidad Académica UPTC
                </p>
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
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all ${
                      active
                        ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-200/80 dark:border-brand-500/30 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{link.label}</span>
                    {link.badge > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-500 text-slate-950 animate-pulse">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              
              {/* Botón PWA: Exclusivo ADMIN (Sesión 22 & 23) */}
              {user?.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setShowAuditModal(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-brand-500/10 to-indigo-500/10 hover:from-emerald-500/20 hover:to-indigo-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-500/30 text-xs font-bold transition hover:scale-[1.02] shadow-2xs"
                  title="Abrir consola de Auditoría del Servidor"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Consola Servidor</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </button>
              )}

              {/* Botón Instalar PWA (si está disponible para instalar) */}
              {isInstallable && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 text-xs font-bold transition"
                  title="Instalar UniLink en tu dispositivo como App nativa"
                >
                  <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Instalar App</span>
                </button>
              )}

              {/* Theme Toggle Button (Light / Dark) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-amber-400 transition shadow-2xs"
                title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-fadeIn" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600 animate-fadeIn" />
                )}
              </button>

              {/* Online / Offline Status Badge */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  isOnline
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 animate-pulse'
                }`}
                title={isOnline ? 'Conexión a internet activa' : 'Modo sin conexión'}
              >
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="hidden xl:inline">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Offline {pendingCount > 0 && `(${pendingCount})`}</span>
                  </>
                )}
              </div>

              {/* Quick Post Button */}
              <Link
                to="/create-post"
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Compartir</span>
              </Link>

              {/* User Profile / Menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 p-1 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                      {user.profile?.full_name ? user.profile.full_name.charAt(0) : 'U'}
                    </div>
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl py-2 z-50 border border-slate-200 dark:border-slate-800 animate-fadeIn">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                          {user.profile?.full_name || 'Estudiante'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        <span className="text-[10px] font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/20 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-500/30 inline-block mt-1">
                          {user.profile?.academic_program || 'Ingeniería UPTC'}
                        </span>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Mi Perfil Universitario</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowAuditModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-left"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Auditoría PWA & Seguridad</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowSensorModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-left"
                      >
                        <Activity className="w-4 h-4 text-indigo-500" />
                        <span>Diagnóstico de Sensores</span>
                      </button>

                      <Link
                        to="/offline-queue"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                      >
                        <CloudUpload className="w-4 h-4 text-slate-400" />
                        <span>Cola Offline ({pendingCount})</span>
                      </Link>

                      <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-left font-semibold"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Ingresar
                </Link>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Interactive Admin Portal (Zero-Footprint Lazy Loading) */}
      <AdminPortal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />

      {/* Sensor Diagnostics Modal */}
      <SensorDiagnosticsModal
        isOpen={showSensorModal}
        onClose={() => setShowSensorModal(false)}
      />
    </>
  );
}
