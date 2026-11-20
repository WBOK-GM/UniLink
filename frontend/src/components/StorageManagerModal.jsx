import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Trash2,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  Database
} from 'lucide-react';
import {
  getOfflineStorageMetrics,
  deleteResourceOffline,
  clearAllOfflineResources
} from '../db/db';

export default function StorageManagerModal({ isOpen, onClose }) {
  const [metrics, setMetrics] = useState({
    fileCount: 0,
    totalBytes: 0,
    totalMb: 0,
    items: [],
    systemEstimate: null
  });
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await getOfflineStorageMetrics();
      setMetrics(data);
    } catch (e) {
      console.warn('Error cargando métricas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMetrics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeleteItem = async (resourceId) => {
    if (!confirm('¿Deseas eliminar este archivo del almacenamiento de tu dispositivo?')) return;
    await deleteResourceOffline(resourceId);
    await loadMetrics();
  };

  const handleClearAll = async () => {
    if (!confirm('¿Estás seguro de liberar todo el almacenamiento offline? Se borrarán todos los archivos descargados para liberar espacio. Tus publicaciones y sesión no se verán afectadas.')) {
      return;
    }
    setClearing(true);
    try {
      await clearAllOfflineResources();
      await loadMetrics();
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Gestión de Almacenamiento Offline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Control de memoria y archivos guardados en tu dispositivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Storage Meter Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-slate-800/60 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Espacio Ocupado en IndexedDB:
              </span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                {metrics.totalMb} MB
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, metrics.fileCount * 12))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
              <span>{metrics.fileCount} {metrics.fileCount === 1 ? 'archivo guardado' : 'archivos guardados'}</span>
              {metrics.systemEstimate && (
                <span>Cuota total navegador: {metrics.systemEstimate.quota_mb} MB</span>
              )}
            </div>
          </div>

          {/* List of Saved Files */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Archivos Disponibles sin Conexión
              </h4>
              <button
                type="button"
                onClick={loadMetrics}
                disabled={loading}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            {metrics.items.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
                <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  No tienes archivos guardados para modo offline.
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  En cualquier publicación, marca la casilla "Ver sin conexión" para tener los apuntes y PDFs listos sin internet.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {metrics.items.map((item) => (
                  <div
                    key={item.resource_id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
                        {item.file_name?.endsWith('.pdf') ? (
                          <FileText className="w-4 h-4 text-rose-500" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-[300px]">
                          {item.file_name || 'Archivo sin nombre'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.size_mb > 0.05 ? `${item.size_mb} MB` : `${item.size_kb} KB`} • Guardado {new Date(item.saved_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.resource_id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                      title="Eliminar del almacenamiento local"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          {metrics.fileCount > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing}
              className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{clearing ? 'Liberando...' : 'Liberar Todo el Almacenamiento Offline'}</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">Memoria del dispositivo optimizada.</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition"
          >
            Listo
          </button>
        </div>

      </div>
    </div>
  );
}
