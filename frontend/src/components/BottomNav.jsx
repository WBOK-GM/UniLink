import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Home, Folder, Compass, Menu, Search } from 'lucide-react';

export default function BottomNav({ onOpenSidebar }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSearchActive = location.pathname === '/' && searchParams.get('view') === 'search';
  const isHomeActive = location.pathname === '/' && !isSearchActive;
  const isMapActive = location.pathname === '/map';

  const handleToggleSearch = () => {
    if (isSearchActive) {
      setSearchParams({});
    } else {
      setSearchParams({ view: 'search' });
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800/80 px-4 py-2 pb-safe shadow-lg transition-colors">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* 1. Inicio */}
        <Link
          to="/"
          onClick={() => { if (isSearchActive) setSearchParams({}); }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            isHomeActive
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-500'
          }`}
        >
          <Home className={`w-5 h-5 ${isHomeActive ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
          <span className="text-[10px] mt-0.5 font-bold">Inicio</span>
        </Link>

        {/* 2. Recursos / Buscar (Center button adapts between Screen 1 & Screen 2) */}
        {isSearchActive ? (
          /* Elevated circular purple search button matching Screen 2 */
          <button
            type="button"
            onClick={handleToggleSearch}
            className="flex flex-col items-center justify-center -mt-6 group"
            title="Buscar Recursos"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 border-4 border-white dark:border-slate-900 active:scale-95 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mt-1">
              Buscar
            </span>
          </button>
        ) : (
          /* Normal Recursos tab matching Screen 1 */
          <button
            type="button"
            onClick={handleToggleSearch}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-500 transition"
            title="Explorar Recursos"
          >
            <Folder className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-bold">Recursos</span>
          </button>
        )}

        {/* 3. Mapa */}
        <Link
          to="/map"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            isMapActive
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-500'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">Mapa</span>
        </Link>

        {/* 4. Más (Menu / Full drawer) */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-500 transition"
          title="Más opciones"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">Más</span>
        </button>
      </div>
    </nav>
  );
}
