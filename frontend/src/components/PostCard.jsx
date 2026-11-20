import React, { useState } from 'react';
import {
  FileText,
  Download,
  MapPin,
  Clock,
  MoreVertical,
  Flag,
  Trash2,
  BookmarkCheck,
  ExternalLink,
  Mic,
  Image as ImageIcon,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { saveResourceOffline } from '../db/db';
import AudioPlayer from './AudioPlayer';
import LocationViewModal from './LocationViewModal';
import FileViewerModal from './FileViewerModal';

export default function PostCard({ post, onPostUpdated }) {
  const { user } = useAuth();
  const [downloadSaved, setDownloadSaved] = useState({});
  const [savingFileId, setSavingFileId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [reportReason, setReportReason] = useState('Derechos de autor');
  const [expandedContent, setExpandedContent] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);

  const isAuthor = user && user.id === post.author?.id;
  const isLongContent = (post.content || '').length > 220;

  // Primer archivo adjunto para el preview visual izquierdo
  const mainAttachment = post.attachments && post.attachments.length > 0 ? post.attachments[0] : null;

  const handleSaveOffline = async (file) => {
    try {
      setSavingFileId(file.id);
      let blob;
      if (file.url) {
        const response = await fetch(file.url);
        if (response.ok) {
          blob = await response.blob();
        }
      }

      if (blob) {
        // 1. Guardar en almacenamiento de la PWA (IndexedDB / Disco navegador)
        await saveResourceOffline(post.id, file.id || file.storage_key || file.original_name, file.original_name, blob, user?.id || 'guest');

        // 2. Disparar descarga física al equipo del usuario
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.original_name || 'documento_unilink.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      }

      setDownloadSaved(prev => ({ ...prev, [file.id]: true }));
    } catch (e) {
      console.warn('Error guardando/descargando:', e);
      if (file.url) window.open(file.url, '_blank');
    } finally {
      setSavingFileId(null);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('¿Deseas desactivar esta publicación? Dejará de ser visible en el feed.')) return;
    try {
      await api.deactivatePost(post.id);
      if (onPostUpdated) onPostUpdated();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSendReport = async () => {
    try {
      await api.createReport({ post_id: post.id, reason: reportReason });
      setShowReportModal(false);
      alert('Reporte enviado al equipo de moderación académica.');
    } catch (e) {
      alert(e.message);
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Hace 4 horas';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Hace unos momentos';
    if (diffHours === 1) return 'Hace 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <article className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 hover:shadow-md transition-all duration-200 shadow-2xs relative">
      
      {/* Contenedor Horizontal Principal (Matches Reference Image) */}
      <div className="flex flex-col sm:flex-row items-start gap-5">
        
        {/* Left Side: Thumbnail Preview Box (Click to View in PWA) */}
        <div
          onClick={() => mainAttachment && setViewingFile(mainAttachment)}
          className={`w-full sm:w-44 h-40 sm:h-36 rounded-2xl overflow-hidden shrink-0 shadow-md relative group flex items-center justify-center bg-indigo-900 ${
            mainAttachment ? 'cursor-pointer' : ''
          }`}
          title={mainAttachment ? 'Clic para ver en la app' : ''}
        >
          {mainAttachment && (mainAttachment.file_type === 'IMAGE' || mainAttachment.mime_type?.startsWith('image/')) ? (
            <img
              src={mainAttachment.url}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : mainAttachment && (mainAttachment.file_type === 'AUDIO' || mainAttachment.mime_type?.startsWith('audio/')) ? (
            <div className="w-full h-full bg-gradient-to-br from-[#2a1b70] via-[#4f37b8] to-[#6d44d4] flex flex-col items-center justify-center p-3 text-center text-white">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-2">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                Audio
              </span>
            </div>
          ) : (
            /* Wavy purple texture extracted from target reference */
            <div className="w-full h-full relative">
              <img
                src="/images/pdf_thumb_waves.png"
                alt="Miniatura PDF"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Hover Overlay: Ver en la App */}
          {mainAttachment && (
            <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-xs p-2 text-center">
              <Eye className="w-5 h-5 text-white" />
              <span>Ver en la App</span>
            </div>
          )}
        </div>

        {/* Right Side: Post Details & Controls */}
        <div className="flex-1 min-w-0 space-y-2 w-full">
          
          {/* Header Row: Subject Badge */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
              {post.category?.name || 'Facultad de Ingeniería'}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            {post.title}
          </h3>

          {/* Excerpt Description */}
          <div className="relative">
            <p className={`text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed ${
              isLongContent && !expandedContent ? 'line-clamp-2' : ''
            }`}>
              {post.content}
            </p>
            {isLongContent && (
              <button
                type="button"
                onClick={() => setExpandedContent(!expandedContent)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5 inline-block"
              >
                {expandedContent ? 'Mostrar menos' : 'Leer más'}
              </button>
            )}
          </div>

          {/* Multi-Attachments Chip Tray (Permite ver y guardar cualquier archivo adjunto en la PWA) */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {post.attachments.map((att, idx) => {
                const isPdfAtt = att.mime_type?.includes('pdf') || att.original_name?.endsWith('.pdf');
                const isImgAtt = att.file_type === 'IMAGE' || att.mime_type?.startsWith('image/');
                return (
                  <button
                    key={att.id || idx}
                    type="button"
                    onClick={() => setViewingFile(att)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/70 dark:border-slate-700 text-[11px] font-semibold transition"
                    title={`Clic para ver ${att.original_name} en la app`}
                  >
                    {isPdfAtt ? (
                      <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    ) : isImgAtt ? (
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    )}
                    <span className="truncate max-w-[130px] sm:max-w-[180px]">{att.original_name}</span>
                    <Eye className="w-3 h-3 text-slate-400 hover:text-indigo-600 ml-0.5 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Audio Player Integrado si el recurso es audio */}
          {mainAttachment && (mainAttachment.file_type === 'AUDIO' || mainAttachment.mime_type?.startsWith('audio/')) && (
            <div className="pt-1">
              <AudioPlayer src={mainAttachment.url} title={mainAttachment.original_name} />
            </div>
          )}

          {/* Footer Row: Author + Time + PDF Size + Download Button + Menu */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            
            {/* Author + Time + File Size Badge */}
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {post.author?.full_name ? post.author.full_name.charAt(0) : 'W'}
              </div>
              <span className="text-slate-900 dark:text-white font-extrabold truncate">
                {post.author?.full_name || 'Walter Alfonso'}
              </span>

              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{formatRelativeTime(post.created_at)}</span>
              </div>

              {/* Pill: Dinámico según archivo adjunto */}
              {mainAttachment && (
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] border border-slate-200/60 dark:border-slate-700">
                  {mainAttachment.file_type === 'IMAGE' || mainAttachment.mime_type?.startsWith('image/')
                    ? 'PNG • 75 KB'
                    : mainAttachment.mime_type?.includes('pdf') || mainAttachment.original_name?.endsWith('.pdf')
                    ? `PDF • ${mainAttachment.file_size ? (mainAttachment.file_size > 1024 * 1024 ? (mainAttachment.file_size / (1024 * 1024)).toFixed(1) + ' MB' : (mainAttachment.file_size / 1024).toFixed(1) + ' KB') : '1.2 MB'}`
                    : 'Documento'}
                </span>
              )}

              {post.location && (
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[110px]">{post.location}</span>
                </button>
              )}
            </div>

            {/* Actions: View in App + Download / Save Pill Button + Menu Button */}
            <div className="flex items-center gap-2 shrink-0">
              
              {/* Botón Ver en la App */}
              {mainAttachment && (
                <button
                  type="button"
                  onClick={() => setViewingFile(mainAttachment)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                  title="Abrir y leer directamente en la aplicación"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Ver</span>
                </button>
              )}

              {/* Botón Descargar y Guardar en PWA */}
              <button
                type="button"
                onClick={() => {
                  if (mainAttachment) handleSaveOffline(mainAttachment);
                  else alert(`Descargando copia del recurso "${post.title}"`);
                }}
                disabled={mainAttachment && savingFileId === mainAttachment.id}
                className="px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                title="Guardar en el almacenamiento del navegador (PWA) y descargar copia física"
              >
                {mainAttachment && downloadSaved[mainAttachment.id] ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Guardado</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{mainAttachment && savingFileId === mainAttachment.id ? 'Guardando...' : 'Descargar'}</span>
                  </>
                )}
              </button>

              {/* Menú de Opciones Tres Puntos ⋮ */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Más opciones"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showOptionsMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-30 animate-fadeIn text-xs">
                    {mainAttachment && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          setViewingFile(mainAttachment);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Ver en la app</span>
                      </button>
                    )}

                    {mainAttachment && (
                      <a
                        href={mainAttachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowOptionsMenu(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>Abrir en pestaña</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setShowReportModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Reportar recurso</span>
                    </button>

                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          handleDeactivate();
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Desactivar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h4 className="text-base font-black text-slate-900 dark:text-white mb-2">Reportar Contenido</h4>
            <p className="text-xs text-slate-500 mb-4">Indica la razón por la que consideras que esta publicación incumple las normas:</p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm mb-4"
            >
              <option value="Derechos de autor">Infracción de derechos de autor</option>
              <option value="Contenido ofensivo">Contenido ofensivo</option>
              <option value="Spam">Spam o publicidad</option>
              <option value="Información engañosa">Información académica engañosa</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReportModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">
                Cancelar
              </button>
              <button onClick={handleSendReport} className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white">
                Enviar reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campus Map Modal */}
      <LocationViewModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        locationStr={post.location}
      />

      {/* In-App File Viewer Modal (PDFs e Imágenes dentro de la PWA) */}
      {viewingFile && (
        <FileViewerModal
          file={viewingFile}
          post={post}
          isOpen={!!viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}
    </article>
  );
}
