import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Folder,
  MoreVertical,
  Upload,
  Users,
  Calendar,
  ShieldCheck,
  Download,
  User,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function NavItem({ icon: Icon, label, active, to, onClick }) {
  const content = (
    <>
      {active ? (
        <span className="w-12 h-12 -mt-6 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 transition-transform duration-200 group-active:scale-90">
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </span>
      ) : (
        <span className="w-12 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-transform duration-200 group-active:scale-90">
          <Icon className="w-5 h-5" strokeWidth={2} />
        </span>
      )}
      <span
        className={`text-[10px] mt-1 leading-none tracking-tight ${
          active
            ? 'font-black text-indigo-600 dark:text-indigo-400'
            : 'font-bold text-slate-500 dark:text-slate-400'
        }`}
      >
        {label}
      </span>
    </>
  );

  const className = 'flex flex-col items-center justify-end px-1 min-w-[48px] group';

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={className}
        aria-current={active ? 'page' : undefined}
        title={label}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-current={active ? 'page' : undefined}
      title={label}
    >
      {content}
    </button>
  );
}

function MenuLink({ icon: Icon, label, to, active, badge, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
        active
          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
        <span>{label}</span>
      </span>
      {badge && (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function BottomNav({ onOpenAudit, onInstallApp, isInstallable }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isSearchActive =
    location.pathname === '/' &&
    new URLSearchParams(location.search).get('view') === 'search';
  const isHomeActive = location.pathname === '/' && !isSearchActive;
  const isGroupsActive =
    location.pathname === '/groups' || location.pathname === '/map';
  const isShareActive = location.pathname === '/create-post';
  const isMoreActive =
    moreOpen ||
    ['/meetings', '/profile', '/offline-queue'].includes(location.pathname);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moreOpen]);

  const openResources = () => {
    // Navega siempre a la pantalla de Recursos, sin importar en qué ruta estemos.
    if (isSearchActive) return;
    navigate('/?view=search');
  };

  const closeMenu = () => setMoreOpen(false);

  const handleAuditClick = () => {
    closeMenu();
    if (onOpenAudit) onOpenAudit();
  };

  const handleInstallClick = () => {
    closeMenu();
    if (onInstallApp) onInstallApp();
  };

  return (
    <>
      {/* Capa para cerrar el menú al tocar fuera de él */}
      {moreOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="lg:hidden fixed inset-0 z-30 cursor-default"
          onClick={closeMenu}
        />
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/80 pt-1 pb-safe shadow-[0_-10px_30px_-12px_rgba(15,23,42,0.25)] dark:shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.8)] transition-colors">
        <div className="relative max-w-md mx-auto flex items-end justify-between px-3">
          {/* 1. Inicio */}
          <NavItem
            icon={Home}
            label="Inicio"
            to="/"
            active={isHomeActive}
          />

          {/* 2. Recursos */}
          <NavItem
            icon={Folder}
            label="Recursos"
            onClick={openResources}
            active={isSearchActive}
          />

          {/* 3. Compartir (acción principal) */}
          <NavItem
            icon={Upload}
            label="Compartir"
            to="/create-post"
            active={isShareActive}
          />

          {/* 4. Grupos */}
          <NavItem
            icon={Users}
            label="Grupos"
            to="/groups"
            active={isGroupsActive}
          />

          {/* 5. Más: menú flotante */}
          <NavItem
            icon={MoreVertical}
            label="Más"
            onClick={() => setMoreOpen((open) => !open)}
            active={isMoreActive}
          />

          {/* Menú flotante anclado a la esquina inferior derecha */}
          {moreOpen && (
            <div className="absolute bottom-full right-1 mb-6 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-900/20 dark:shadow-black/60 p-1.5 animate-menu-in z-20">
              <div className="px-3 pt-1.5 pb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Más opciones
                </span>
              </div>

              <MenuLink
                icon={Calendar}
                label="Encuentros"
                to="/meetings"
                active={location.pathname === '/meetings'}
                onClick={closeMenu}
              />

              {user?.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={handleAuditClick}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>Consola Servidor</span>
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    A+
                  </span>
                </button>
              )}

              {isInstallable && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Download className="w-4 h-4 shrink-0 text-purple-500" />
                  <span>Instalar App</span>
                </button>
              )}

              <MenuLink
                icon={user ? User : LogIn}
                label={user ? 'Mi Perfil' : 'Ingresar'}
                to={user ? '/profile' : '/login'}
                active={location.pathname === (user ? '/profile' : '/login')}
                onClick={closeMenu}
              />

              <span className="absolute -bottom-1.5 right-6 w-3 h-3 rotate-45 bg-white dark:bg-slate-900 border-b border-r border-slate-200/90 dark:border-slate-800" />
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
