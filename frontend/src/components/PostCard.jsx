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
  FileCheck,
  Mic,
  Image as ImageIcon
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
  const isLongContent = (post.content || '').length > 220;

  // Primer archivo adjunto para el preview visual izquierdo
  const mainAttachment = post.attachments && post.attachments.length > 0 ? post.attachments[0] : null;

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
      alert(`✅ "${file.original_name}" guardado para lectura sin conexión.`);
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
    <article className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 hover:shadow-lg hover:border-brand-300 dark:hover:border-slate-700 transition-all duration-200 shadow-2xs relative">
      
      {/* Contenedor Horizontal Principal (Matches Reference Image) */}
      <div className="flex flex-col sm:flex-row items-start gap-5">
        
        {/* Left Side: Thumbnail Preview Box (PDF / Image / Audio) */}
        <div className="w-full sm:w-36 h-36 rounded-2xl bg-gradient-to-br from-[#2a1b70] via-[#4f37b8] to-[#6d44d4] flex flex-col items-center justify-center text-white shrink-0 shadow-md shadow-brand-900/15 relative overflow-hidden group">
          {mainAttachment && (mainAttachment.file_type === 'IMAGE' || mainAttachment.mime_type?.startsWith('image/')) ? (
            <img
              src={mainAttachment.url}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : mainAttachment && (mainAttachment.file_type === 'AUDIO' || mainAttachment.mime_type?.startsWith('audio/')) ? (
            <div className="flex flex-col items-center justify-center p-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-2">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                Audio
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center mb-2 shadow-inner">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/20">
                PDF
              </span>
            </div>
          )}

          {/* Decorative radial shine */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Right Side: Post Details & Controls */}
        <div className="flex-1 min-w-0 space-y-2.5 w-full">
          
          {/* Header Row: Subject Badge + Actions */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30">
              {post.category?.name || 'Facultad de Ingeniería'}
            </span>

            <div className="flex items-center gap-1.5 text-slate-400">
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="p-1 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Reportar publicación"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>

              {isAuthor && (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="p-1 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Desactivar publicación"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
                className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline mt-0.5 inline-block"
              >
                {expandedContent ? 'Mostrar menos' : 'Leer más'}
              </button>
            )}
          </div>

          {/* Audio Player Integrado si el recurso es audio */}
          {mainAttachment && (mainAttachment.file_type === 'AUDIO' || mainAttachment.mime_type?.startsWith('audio/')) && (
            <div className="pt-1">
              <AudioPlayer src={mainAttachment.url} title={mainAttachment.original_name} />
            </div>
          )}

          {/* Footer Row: Author + Download Button (Matches Reference Image) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            
            {/* Author + Time */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {post.author?.full_name ? post.author.full_name.charAt(0) : 'W'}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap text-slate-500 dark:text-slate-400 font-semibold text-xs truncate">
                <span className="text-slate-900 dark:text-white font-extrabold truncate">
                  {post.author?.full_name || 'Walter Alfonso'}
                </span>
                <span>•</span>
                <span>{formatRelativeTime(post.created_at)}</span>

                {post.location && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setShowLocationModal(true)}
                      className="text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{post.location}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Actions: Download Button + Reactions + External Link */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              
              {/* Reacciones Likes / Dislikes */}
              <div className="flex items-center gap-1 mr-1">
                <button
                  type="button"
                  onClick={() => handleReaction('LIKE')}
                  disabled={isAuthor}
                  className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition ${
                    myReaction === 'LIKE'
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Me gusta"
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${myReaction === 'LIKE' ? 'fill-current' : ''}`} />
                  <span>{likes}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReaction('DISLIKE')}
                  disabled={isAuthor}
                  className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition ${
                    myReaction === 'DISLIKE'
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/15'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="No me gusta"
                >
                  <ThumbsDown className={`w-3.5 h-3.5 ${myReaction === 'DISLIKE' ? 'fill-current' : ''}`} />
                  <span>{dislikes}</span>
                </button>
              </div>

              {/* Botón Descargar / Guardar Offline (Matches Image) */}
              {mainAttachment && (
                <button
                  type="button"
                  onClick={() => handleSaveOffline(mainAttachment)}
                  disabled={savingFileId === mainAttachment.id}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                  title="Descargar y guardar copia offline"
                >
                  {downloadSaved[mainAttachment.id] ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">Guardado</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                      <span>{savingFileId === mainAttachment.id ? 'Descargando...' : 'Descargar'}</span>
                    </>
                  )}
                </button>
              )}

              {/* External Link */}
              {mainAttachment && (
                <a
                  href={mainAttachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Abrir recurso en pestaña nueva"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
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
    </article>
  );
}
