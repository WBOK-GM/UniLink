import React, { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  FileText,
  Download,
  MapPin,
  Clock,
  ShieldCheck,
  Flag,
  Trash2,
  BookmarkCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { saveResourceOffline } from '../db/db';
import AudioPlayer from './AudioPlayer';
import LocationViewModal from './LocationViewModal';

export default function PostCard({ post, onPostUpdated }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [dislikes, setDislikes] = useState(post.dislikes_count || 0);
  const [myReaction, setMyReaction] = useState(post.my_reaction || null);
  const [isReacting, setIsReacting] = useState(false);
  const [downloadSaved, setDownloadSaved] = useState({});
  const [savingFileId, setSavingFileId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [reportReason, setReportReason] = useState('Derechos de autor');
  const [expandedContent, setExpandedContent] = useState(false);

  const isAuthor = user && user.id === post.author?.id;
  const isLongContent = (post.content || '').length > 280;

  const handleReaction = async (type) => {
    if (!user) {
      alert('Debes iniciar sesión para valorar publicaciones.');
      return;
    }
    if (isAuthor) {
      alert('El autor no puede valorar su propia publicación (RN-04).');
      return;
    }
    if (isReacting) return;

    try {
      setIsReacting(true);
      const newType = myReaction === type ? 'NONE' : type;

      // Optimistic update
      if (myReaction === 'LIKE') setLikes(prev => Math.max(0, prev - 1));
      if (myReaction === 'DISLIKE') setDislikes(prev => Math.max(0, prev - 1));

      if (newType === 'LIKE') setLikes(prev => prev + 1);
      if (newType === 'DISLIKE') setDislikes(prev => prev + 1);

      setMyReaction(newType === 'NONE' ? null : newType);

      await api.reactToPost(post.id, newType);
    } catch (err) {
      console.error('Error al reaccionar:', err);
    } finally {
      setIsReacting(false);
    }
  };

  const handleSaveOffline = async (file) => {
    try {
      setSavingFileId(file.id);
      const response = await fetch(file.url);
      const blob = await response.blob();
      await saveResourceOffline(post.id, file.id, file.original_name, blob, user?.id || 'guest');
      setDownloadSaved(prev => ({ ...prev, [file.id]: true }));
    } catch (e) {
      console.warn('Error guardando offline:', e);
      window.open(file.url, '_blank');
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
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Hace unos momentos';
    if (diffHours === 1) return 'Hace 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <article className="rounded-3xl glass-panel p-5 sm:p-7 card-hover-lift border border-slate-200/90 dark:border-slate-800/90 transition-all duration-200 shadow-xs relative">
      
      {/* Header: Author + Subject Tag */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-brand-500/25 shrink-0">
            {post.author?.full_name ? post.author.full_name.charAt(0) : 'U'}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                {post.author?.full_name || 'Estudiante'}
              </span>
              {post.author?.university && (
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  {post.author.university}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              <span>{post.author?.academic_program || 'Comunidad UniLink'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {formatRelativeTime(post.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Category Badge */}
        {post.category && (
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-950/40 dark:to-indigo-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 shrink-0 shadow-2xs">
            {post.category.name}
          </span>
        )}
      </div>

      {/* Post Title & Content */}
      <div className="space-y-2 mb-4">
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
          {post.title}
        </h3>

        <div className="relative">
          <p className={`text-slate-700 dark:text-slate-300 text-sm whitespace-pre-line leading-relaxed ${
            isLongContent && !expandedContent ? 'line-clamp-3' : ''
          }`}>
            {post.content}
          </p>

          {isLongContent && (
            <button
              type="button"
              onClick={() => setExpandedContent(!expandedContent)}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 mt-1 flex items-center gap-1 transition"
            >
              <span>{expandedContent ? 'Mostrar menos' : 'Leer más...'}</span>
              {expandedContent ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Location Badge with In-App Campus Map Trigger */}
        {post.location && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              title="Ver ubicación UPTC interactiva dentro de la aplicación"
              className="inline-flex items-center gap-1.5 text-xs text-brand-700 dark:text-brand-300 font-bold bg-brand-50/80 hover:bg-brand-100/90 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 px-3 py-1.5 rounded-xl border border-brand-200 dark:border-brand-800/40 transition hover:scale-[1.01] shadow-2xs group cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition" />
              <span>{post.location}</span>
              <span className="text-[10px] uppercase font-black text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-brand-200 dark:border-brand-700/60 ml-1">
                Ver en mapa
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Attachments Section */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="space-y-3 mb-5 pt-1">
          {post.attachments.map((file) => {
            // Audio Recording / Player
            if (file.file_type === 'AUDIO' || file.mime_type?.startsWith('audio/')) {
              return (
                <div key={file.id} className="rounded-2xl p-1 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <AudioPlayer src={file.url} title={file.original_name} />
                </div>
              );
            }

            // Image Preview
            if (file.file_type === 'IMAGE' || file.mime_type?.startsWith('image/')) {
              return (
                <div key={file.id} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 max-h-80 shadow-inner group relative">
                  <img
                    src={file.url}
                    alt={file.original_name}
                    className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5">
                    <span>{file.original_name}</span>
                  </div>
                </div>
              );
            }

            // Documents (PDF, Word, TXT)
            const isSavedLocally = downloadSaved[file.id];
            const isSavingThis = savingFileId === file.id;

            return (
              <div
                key={file.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 transition shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-brand-100 dark:from-indigo-500/20 dark:to-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-200/60 dark:border-brand-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {file.original_name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold uppercase text-brand-600 dark:text-brand-400">PDF / Documento</span>
                      <span>•</span>
                      <span>Disponible para consulta sin internet</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Botón Guardar Offline (Dexie IndexedDB) */}
                  <button
                    type="button"
                    onClick={() => handleSaveOffline(file)}
                    disabled={isSavingThis}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs ${
                      isSavedLocally
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                    }`}
                    title="Almacenar una copia local en IndexedDB para abrir sin conexión"
                  >
                    {isSavedLocally ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="hidden sm:inline">Guardado Offline</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        <span className="hidden sm:inline">{isSavingThis ? 'Guardando...' : 'Guardar Offline'}</span>
                      </>
                    )}
                  </button>

                  {/* Botón Abrir / Descargar */}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    title="Abrir documento en pestaña nueva"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer: Reactions Bar, Copyright Declaration & Controls */}
      <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
        {/* Like & Dislike */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleReaction('LIKE')}
            disabled={isAuthor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition shadow-2xs ${
              myReaction === 'LIKE'
                ? 'bg-brand-50 dark:bg-brand-600/25 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/40 shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            } ${isAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isAuthor ? 'El autor no puede votar su propio aporte (RN-04)' : 'Me gusta'}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${myReaction === 'LIKE' ? 'text-brand-600 dark:text-brand-400 fill-brand-600 dark:fill-brand-400' : ''}`} />
            <span>{likes}</span>
          </button>

          <button
            type="button"
            onClick={() => handleReaction('DISLIKE')}
            disabled={isAuthor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition shadow-2xs ${
              myReaction === 'DISLIKE'
                ? 'bg-rose-50 dark:bg-rose-600/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            } ${isAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isAuthor ? 'El autor no puede votar su propio aporte (RN-04)' : 'No me gusta'}
          >
            <ThumbsDown className={`w-3.5 h-3.5 ${myReaction === 'DISLIKE' ? 'text-rose-600 dark:text-rose-400 fill-rose-600 dark:fill-rose-400' : ''}`} />
            <span>{dislikes}</span>
          </button>
        </div>

        {/* Right side: Copyright & Deactivate */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hidden sm:flex">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Autoría declarada (RN-30)</span>
          </span>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
            title="Reportar publicación por infracción"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>

          {isAuthor && (
            <button
              type="button"
              onClick={handleDeactivate}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              title="Desactivar mi publicación"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Report Content Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Reportar Contenido Académico
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Indica la razón por la que consideras que esta publicación incumple las normas de convivencia o derechos de autor:
            </p>

            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 mb-4 focus:outline-none focus:border-brand-500"
            >
              <option value="Derechos de autor">Infracción de derechos de autor</option>
              <option value="Contenido ofensivo">Contenido ofensivo o discriminatorio</option>
              <option value="Spam">Spam o publicidad no académica</option>
              <option value="Información engañosa">Información académica errónea o engañosa</option>
            </select>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendReport}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30"
              >
                Enviar reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Interactive UPTC Location Viewer */}
      <LocationViewModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        locationStr={post.location}
      />
    </article>
  );
}
