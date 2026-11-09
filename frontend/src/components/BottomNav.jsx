import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, Compass, PlusCircle, Users, Calendar, User } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function BottomNav() {
  const location = useLocation();
  const { pendingCount } = useOfflineSync();

  const navItems = [
    { to: '/', label: 'Feed', icon: Layers },
    { to: '/map', label: 'Mapa', icon: Compass },
    { to: '/create-post', label: 'Publicar', icon: PlusCircle, isMain: true },
    { to: '/groups', label: 'Grupos', icon: Users },
    { to: '/profile', label: 'Perfil', icon: User }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800/80 px-2 py-1.5 pb-safe shadow-lg transition-colors duration-200">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);

          if (item.isMain) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/40 border-2 border-white dark:border-slate-900 active:scale-95 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-300 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                active
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.to === '/profile' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-medium ${active ? 'font-bold text-brand-600 dark:text-brand-300' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
