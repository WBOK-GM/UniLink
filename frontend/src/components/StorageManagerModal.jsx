import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AudioLines,
  Eye,
  File,
  FileText,
  HardDrive,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  canOpenOfflineResource,
  clearAllOfflineResources,
  db,
  deleteResourceOffline,
  getOfflineStorageMetrics
} from '../db/db';
import FileViewerModal from './FileViewerModal';

const sizeFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${sizeFormat.format(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${sizeFormat.format(bytes / 1024)} KB`;
  return `${sizeFormat.format(bytes)} B`;
}

function SavedFileIcon({ name }) {
  const extension = name?.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(extension);
  const isAudio = ['mp3', 'wav', 'ogg', 'webm', 'm4a'].includes(extension);
  const isDocument = ['pdf', 'doc', 'docx', 'txt'].includes(extension);

  const Icon = isImage ? ImageIcon : isAudio ? AudioLines : isDocument ? FileText : File;
  const color = extension === 'pdf'
    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300';

  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

export default function StorageManagerModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const dialogRef = useRef(null);
  const titleId = useId();
  const [viewingResource, setViewingResource] = useState(null);
  const [metrics, setMetrics] = useState({ items: [], fileCount: 0, totalBytes: 0 });
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');

  const loadMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOfflineStorageMetrics();
      setMetrics({ ...data, items: [...data.items].sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at)) });
    } catch {
      setError('No se pudieron cargar los archivos guardados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMetrics();
    } else {
      setViewingResource(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || viewingResource || !dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [isOpen, viewingResource]);

  if (!isOpen) return null;

  const handleOpenItem = async (resourceId) => {
    setError('');
    try {
      const resource = await db.offline_resources.get(resourceId);
      if (canOpenOfflineResource(resource, user)) {
        setViewingResource(resource);
      } else {
        await loadMetrics();
        setError('Esta copia ya no está disponible.');
      }
    } catch {
      setError('No se pudo abrir el archivo guardado.');
    }
  };

  const handleDeleteItem = async (resourceId) => {
    if (!window.confirm('¿Eliminar esta copia del dispositivo?')) return;
    const deleted = await deleteResourceOffline(resourceId);
    await loadMetrics();
    if (!deleted) setError('No se pudo eliminar la copia.');
  };

  const handleClearAll = async () => {
    if (!window.confirm('¿Eliminar todas las copias guardadas en este dispositivo?')) return;
    setClearing(true);
    try {
      const cleared = await clearAllOfflineResources();
      await loadMetrics();
      if (!cleared) setError('No se pudieron eliminar todas las copias.');
    } finally {
      setClearing(false);
    }
  };

  return createPortal(
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm sm:max-h-[min(44rem,calc(100dvh-3rem))] sm:rounded-3xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section className="flex max-h-[inherit] min-h-0 flex-col">
          <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 dark:border-slate-800">
            <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 sm:grid dark:bg-indigo-950/60 dark:text-indigo-300">
              <HardDrive className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-extrabold tracking-tight sm:text-xl">Documentos guardados</h2>
              <p className="mt-0.5 text-xs text-slate-600 sm:text-sm dark:text-slate-400" aria-live="polite">
                {loading && !metrics.fileCount
                  ? 'Cargando copias…'
                  : `${metrics.fileCount} ${metrics.fileCount === 1 ? 'archivo' : 'archivos'} · ${formatSize(metrics.totalBytes)} en este dispositivo`}
              </p>
            </div>
            <button
              type="button"
              onClick={loadMetrics}
              disabled={loading || clearing}
              aria-label="Actualizar archivos"
              title="Actualizar archivos"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar documentos guardados"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6" aria-busy={loading}>
            {error && <p role="alert" className="py-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
            {metrics.items.length ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {metrics.items.map((item) => {
                  const name = item.file_name || 'Archivo sin nombre';
                  const savedAt = new Date(item.saved_at);
                  return (
                    <li key={item.resource_id} className="flex items-center gap-2 py-3 sm:gap-3">
                      <SavedFileIcon name={item.file_name} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug [overflow-wrap:anywhere]" title={name}>{name}</p>
                        <p className="mt-1 text-xs tabular-nums text-slate-600 dark:text-slate-400">
                          {formatSize(item.size_bytes)}
                          {!Number.isNaN(savedAt.getTime()) && (
                            <> · <time dateTime={savedAt.toISOString()}>{dateFormat.format(savedAt)}</time></>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
                        {canOpenOfflineResource(item, user) && (
                          <button
                            type="button"
                            onClick={() => handleOpenItem(item.resource_id)}
                            aria-label={`Abrir ${name}`}
                            title="Abrir copia guardada"
                            className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-2 text-indigo-700 hover:bg-indigo-100 sm:px-3 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900/70"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden text-xs font-semibold sm:inline">Abrir</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.resource_id)}
                          disabled={clearing}
                          aria-label={`Eliminar ${name} del dispositivo`}
                          title="Eliminar copia"
                          className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : !loading && !error && (
              <div className="py-10 text-center">
                <FileText className="mx-auto mb-3 h-7 w-7 text-indigo-500" aria-hidden="true" />
                <p className="text-sm font-semibold">Todavía no tienes documentos guardados</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Usa «Ver sin conexión» en una publicación para guardar su archivo.
                </p>
              </div>
            )}
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950/40">
            {metrics.fileCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing}
                className="mr-auto inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-100/70 disabled:opacity-50 sm:px-3 sm:text-sm dark:text-rose-300 dark:hover:bg-rose-950/60"
              >
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {clearing ? 'Eliminando copias…' : 'Eliminar todas las copias'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Listo
            </button>
          </footer>
        </section>
      </dialog>
      {viewingResource && (
        <FileViewerModal isOpen offlineResource={viewingResource} onClose={() => setViewingResource(null)} />
      )}
    </>,
    document.body
  );
}
