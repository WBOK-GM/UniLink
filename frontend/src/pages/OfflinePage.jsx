import React, { useState, useEffect } from 'react';
import {
  CloudUpload,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  Trash2,
  Download
} from 'lucide-react';
import { db, getDownloadedResources } from '../db/db';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function OfflinePage() {
  const { isOnline, pendingCount, isSyncing, syncOfflinePosts } = useOfflineSync();
  const [offlinePosts, setOfflinePosts] = useState([]);
  const [downloadedFiles, setDownloadedFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOfflineData = async () => {
    try {
      setLoading(true);
      const [posts, resources] = await Promise.all([
        db.offline_posts.toArray(),
        getDownloadedResources()
      ]);
      setOfflinePosts(posts.reverse());
      setDownloadedFiles(resources.reverse());
    } catch (e) {
      console.warn('Error cargando Dexie offline data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfflineData();
  }, [isSyncing]);

  const handleDeleteOfflinePost = async (id) => {
    if (!confirm('¿Deseas descartar esta publicación pendiente?')) return;
    await db.offline_posts.delete(id);
    loadOfflineData();
  };

  const handleOpenOfflineBlob = (res) => {
    if (res.local_blob) {
      const url = URL.createObjectURL(res.local_blob);
      window.open(url, '_blank');
    }
  };

  const handleDeleteOfflineResource = async (resourceId) => {
    await db.offline_resources.delete(resourceId);
    loadOfflineData();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* Network Header Banner */}
      <div className={`rounded-2xl p-6 border shadow-sm dark:shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
        isOnline
          ? 'bg-emerald-50 dark:bg-slate-900/90 border-emerald-200 dark:border-emerald-500/30'
          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/40'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isOnline ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
          }`}>
            {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isOnline ? 'Conexión a Internet Estable' : 'Modo Sin Conexión (Offline Activo)'}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {isOnline
                ? 'El sistema enviará automáticamente las publicaciones acumuladas en IndexedDB.'
                : 'Tus publicaciones se resguardan de forma segura en tu navegador y se enviarán al reconectar.'}
            </p>
          </div>
        </div>

        {isOnline && pendingCount > 0 && (
          <button
            onClick={syncOfflinePosts}
            disabled={isSyncing}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-brand-600/30 transition disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
          </button>
        )}
      </div>

      {/* Section 1: Pending Posts Queue */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Cola de Publicaciones Pendientes ({offlinePosts.filter(p => p.sync_status !== 'PUBLISHED').length})
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">IndexedDB: OFFLINE_POSTS</span>
        </div>

        {offlinePosts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No tienes publicaciones pendientes en la cola local.
          </div>
        ) : (
          <div className="space-y-3">
            {offlinePosts.map((post) => {
              const isPublished = post.sync_status === 'PUBLISHED';
              const isFailed = post.sync_status === 'FAILED';
              const isSyncingItem = post.sync_status === 'SYNCING';

              return (
                <div
                  key={post.local_id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        isPublished
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : isFailed
                          ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : isSyncingItem
                          ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 animate-pulse'
                          : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}>
                        {post.sync_status}
                      </span>
                      <span className="text-[11px] text-slate-400">ID Operación: {post.client_operation_id?.slice(0, 8)}...</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{post.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">{post.content}</p>

                    {post.last_error && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        <span>Error: {post.last_error}</span>
                      </p>
                    )}
                  </div>

                  {!isPublished && (
                    <button
                      type="button"
                      onClick={() => handleDeleteOfflinePost(post.local_id)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                      title="Eliminar de la cola"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Downloaded Offline Resources */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recursos Guardados para Consulta Offline ({downloadedFiles.length})
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">IndexedDB: OFFLINE_RESOURCES</span>
        </div>

        {downloadedFiles.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            Aún no has guardado ningún documento para lectura offline. En el feed presiona "Guardar Offline" en cualquier apunte o archivo.
          </div>
        ) : (
          <div className="space-y-3">
            {downloadedFiles.map((item) => (
              <div
                key={item.resource_id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.file_name}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Guardado el {new Date(item.saved_at).toLocaleDateString('es-CO')} • Disponible sin internet
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenOfflineBlob(item)}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-sm"
                  >
                    Abrir Documento
                  </button>

                  <button
                    onClick={() => handleDeleteOfflineResource(item.resource_id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                    title="Eliminar del dispositivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
