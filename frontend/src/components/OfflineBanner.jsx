import React from 'react';
import { WifiOff, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncOfflinePosts } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`w-full py-2 px-4 text-xs sm:text-sm font-medium transition-colors ${
      !isOnline
        ? 'bg-amber-950/80 border-b border-amber-600/40 text-amber-200'
        : 'bg-indigo-950/80 border-b border-indigo-600/40 text-indigo-200'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <RefreshCw className={`w-4 h-4 text-indigo-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          )}
          <span>
            {!isOnline
              ? 'Modo sin conexión activo: Puedes consultar apuntes guardados y crear publicaciones locales.'
              : `${pendingCount} publicación(es) pendiente(s) de sincronizar.`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isOnline && pendingCount > 0 && (
            <button
              onClick={syncOfflinePosts}
              disabled={isSyncing}
              className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
            </button>
          )}

          <Link
            to="/offline-queue"
            className="flex items-center gap-1 text-xs font-semibold hover:underline opacity-90 hover:opacity-100"
          >
            <span>Ver cola</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
