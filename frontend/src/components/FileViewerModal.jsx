import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  HardDrive,
  AlertTriangle,
  ZoomIn,
  RefreshCw,
  Eye
} from 'lucide-react';
import { db, saveResourceOffline } from '../db/db';

export default function FileViewerModal({ file, post, isOpen, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [isSavedInPwa, setIsSavedInPwa] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) {
      setBlobUrl(null);
      setLoading(true);
      setError(null);
      return;
    }

    let isMounted = true;
    let createdUrl = null;

    const resolveFileSource = async () => {
      try {
        setLoading(true);
        setError(null);

        const isPdfDoc = file.mime_type === 'application/pdf' || file.original_name?.toLowerCase().endsWith('.pdf');
        const defaultMimeType = isPdfDoc ? 'application/pdf' : 'image/png';

        // 1. Verificar si el archivo ya reside en IndexedDB (offline-first)
        const cachedResource = await db.offline_resources
          .where('file_id')
          .equals(file.id || file.storage_key || file.original_name)
          .first();

        if (cachedResource && cachedResource.local_blob) {
          const typedBlob = new Blob([cachedResource.local_blob], {
            type: file.mime_type || defaultMimeType
          });
          createdUrl = URL.createObjectURL(typedBlob);
          if (isMounted) {
            setBlobUrl(createdUrl);
            setIsSavedInPwa(true);
            setLoading(false);
          }
          return;
        }

        // 2. Si hay conexión, descargar el Blob y guardarlo en IndexedDB
        if (file.url) {
          try {
            const res = await fetch(file.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}: Archivo no disponible.`);
            const arrayBuf = await res.arrayBuffer();
            const blob = new Blob([arrayBuf], { type: file.mime_type || defaultMimeType });

            // Guardar automáticamente en el navegador (PWA offline)
            await saveResourceOffline(
              post?.id || `res-${Date.now()}`,
              file.id || file.storage_key || file.original_name,
              file.original_name,
              blob,
              'pwa-user'
            );

            createdUrl = URL.createObjectURL(blob);
            if (isMounted) {
              setBlobUrl(createdUrl);
              setIsSavedInPwa(true);
              setLoading(false);
            }
          } catch (fetchErr) {
            console.warn('No se pudo descargar el archivo para almacenamiento PWA:', fetchErr);
            // Fallback a URL directa si fetch falló pero la URL existe
            if (isMounted) {
              setBlobUrl(file.url);
              setLoading(false);
            }
          }
        } else {
          throw new Error('El archivo no cuenta con una URL válida ni copia local.');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error al cargar el archivo en el visor.');
          setLoading(false);
        }
      }
    };

    resolveFileSource();

    // Listener para cerrar con tecla Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
      if (createdUrl && createdUrl.startsWith('blob:')) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, file, post]);

  if (!isOpen || !file) return null;

  const isPdf = file.mime_type === 'application/pdf' || file.original_name?.toLowerCase().endsWith('.pdf');
  const isImage = file.file_type === 'IMAGE' || file.mime_type?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.original_name || '');

  // Disparar descarga nativa al sistema de archivos del equipo
  const handleDownloadToDevice = async () => {
    try {
      setIsDownloading(true);
      let downloadSource = blobUrl;

      // Si no tenemos blobUrl aún, obtenerlo
      if (!downloadSource || !downloadSource.startsWith('blob:')) {
        const res = await fetch(file.url);
        const blob = await res.blob();
        downloadSource = URL.createObjectURL(blob);
      }

      const a = document.createElement('a');
      a.href = downloadSource;
      a.download = file.original_name || 'documento_unilink.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.warn('Error al descargar archivo al equipo:', e);
      window.open(file.url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '1.2 MB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-5xl h-[92vh] max-h-[880px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur">
          
          {/* File Name & Badges */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isPdf ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
            }`}>
              {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {file.original_name || post?.title || 'Documento Académico UniLink'}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {formatFileSize(file.file_size)}
                </span>
                <span>•</span>
                {isSavedInPwa ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Guardado en PWA (Disponible Offline)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                    <HardDrive className="w-3 h-3" />
                    Sincronizando con PWA...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Download to Device */}
            <button
              type="button"
              onClick={handleDownloadToDevice}
              disabled={isDownloading}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              title="Descargar archivo a tu equipo"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar al equipo</span>
            </button>

            {/* Open in New Tab */}
            {file.url && (
              <a
                href={blobUrl || file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer Surface */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Cargando recurso y asegurando copia en el almacenamiento de la PWA...
              </p>
            </div>
          ) : error ? (
            <div className="max-w-md p-6 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-lg mx-4">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
              <h4 className="text-base font-black text-slate-900 dark:text-white">No se pudo visualizar el archivo</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{error}</p>
              {file.url && (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir enlace directo
                </a>
              )}
            </div>
          ) : isPdf ? (
            /* PDF In-App Object Viewer with Fallback */
            <div className="w-full h-full flex flex-col bg-slate-900">
              <object
                data={blobUrl || file.url}
                type="application/pdf"
                className="w-full h-full border-0 rounded-b-3xl bg-slate-900"
              >
                {/* Fallback si el navegador restringe la ejecución de plugins incrustados */}
                <div className="flex flex-col items-center justify-center p-8 text-center h-full space-y-4 bg-slate-900 text-white">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">
                      {file.original_name}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Tu navegador requiere abrir los documentos PDF en una vista dedicada o descargarlos al dispositivo.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={blobUrl || file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-md"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir visor completo</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleDownloadToDevice}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition border border-slate-700"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar al equipo</span>
                    </button>
                  </div>
                </div>
              </object>
            </div>
          ) : isImage ? (
            /* High-Res Image Lightbox */
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto bg-slate-950/90">
              <img
                src={blobUrl || file.url}
                alt={file.original_name || post?.title}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              />
            </div>
          ) : (
            /* Generic Document Viewer Fallback */
            <div className="max-w-md p-8 text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mx-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">{file.original_name}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Documento académico almacenado localmente en tu navegador.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadToDevice}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Descargar archivo
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
