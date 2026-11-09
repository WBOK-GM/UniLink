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
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { saveResourceOffline } from '../db/db';
import AudioPlayer from './AudioPlayer';

export default function PostCard({ post, onPostUpdated }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [dislikes, setDislikes] = useState(post.dislikes_count || 0);
  const [myReaction, setMyReaction] = useState(post.my_reaction || null);
  const [isReacting, setIsReacting] = useState(false);
  const [downloadSaved, setDownloadSaved] = useState({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Derechos de autor');

  const isAuthor = user && user.id === post.author?.id;

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
      const response = await fetch(file.url);
      const blob = await response.blob();
      await saveResourceOffline(post.id, file.id, file.original_name, blob, user?.id || 'guest');
      setDownloadSaved(prev => ({ ...prev, [file.id]: true }));
      alert(`✅ "${file.original_name}" guardado en el almacenamiento local para consulta offline.`);
    } catch (e) {
      console.warn('Error guardando offline:', e);
      // Descarga directa tradicional si fetch falla
      window.open(file.url, '_blank');
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
      alert('Reporte enviado al equipo de moderación.');
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
    <article className="rounded-2xl glass-panel p-5 sm:p-6 transition-all duration-200 hover:border-slate-700 hover:shadow-xl hover:shadow-brand-950/20">
      {/* Header: Author + Meta */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-brand-500/20">
            {post.author?.full_name ? post.author.full_name.charAt(0) : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm sm:text-base">
                {post.author?.full_name || 'Estudiante'}
              </span>
              {post.author?.university && (
                <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
                  {post.author.university}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{post.author?.academic_program || 'Comunidad UniLink'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(post.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Category Pill */}
        {post.category && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 shrink-0">
            {post.category.name}
          </span>
        )}
      </div>

      {/* Post Title & Content */}
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
          {post.title}
        </h3>
        <p className="text-slate-300 text-sm whitespace-pre-line leading-relaxed">
          {post.content}
        </p>

        {post.location && (
          <div className="flex items-center gap-1.5 text-xs text-brand-300 font-medium mt-3 bg-brand-950/40 px-2.5 py-1 rounded-md border border-brand-800/40 w-fit">
            <MapPin className="w-3.5 h-3.5 text-brand-400" />
            <span>{post.location}</span>
          </div>
        )}
      </div>

      {/* Attachments Section */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="space-y-3 mb-4 pt-2">
          {post.attachments.map((file) => {
            if (file.file_type === 'AUDIO' || file.mime_type?.startsWith('audio/')) {
              return <AudioPlayer key={file.id} src={file.url} title={file.original_name} />;
            }

            if (file.file_type === 'IMAGE' || file.mime_type?.startsWith('image/')) {
              return (
                <div key={file.id} className="rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900/60 max-h-80">
                  <img
                    src={file.url}
                    alt={file.original_name}
                    className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-200"
                    loading="lazy"
                  />
                </div>
              );
            }

            // Documents (PDF, Word, etc.)
            return (
              <div
                key={file.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-slate-600 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-slate-200 truncate">{file.original_name}</p>
                    <p className="text-[11px] text-slate-500">Documento académico verificado</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSaveOffline(file)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition"
                    title="Guardar copia en el dispositivo para leer sin conexión"
                  >
                    {downloadSaved[file.id] ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 hidden sm:inline">Guardado</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-brand-400" />
                        <span className="hidden sm:inline">Guardar Offline</span>
                      </>
                    )}
                  </button>

                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Abrir / Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer: Reactions, Copyright badge & Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex-wrap gap-2">
        {/* Like & Dislike */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleReaction('LIKE')}
            disabled={isAuthor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              myReaction === 'LIKE'
                ? 'bg-brand-600/25 text-brand-300 border border-brand-500/40 shadow-sm'
                : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
            } ${isAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isAuthor ? 'No puedes votar tu publicación' : 'Me gusta'}
          >
            <ThumbsUp className={`w-4 h-4 ${myReaction === 'LIKE' ? 'text-brand-400 fill-brand-400' : ''}`} />
            <span>{likes}</span>
          </button>

          <button
            type="button"
            onClick={() => handleReaction('DISLIKE')}
            disabled={isAuthor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              myReaction === 'DISLIKE'
                ? 'bg-rose-600/25 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
            } ${isAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isAuthor ? 'No puedes votar tu publicación' : 'No me gusta'}
          >
            <ThumbsDown className={`w-4 h-4 ${myReaction === 'DISLIKE' ? 'text-rose-400 fill-rose-400' : ''}`} />
            <span>{dislikes}</span>
          </button>
        </div>

        {/* Right side: Copyright & Deactivate */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-emerald-400/80 font-medium hidden sm:flex">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Autoría declarada</span>
          </span>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="p-1.5 text-slate-500 hover:text-amber-400 rounded-md transition"
            title="Reportar publicación"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>

          {isAuthor && (
            <button
              type="button"
              onClick={handleDeactivate}
              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-md transition"
              title="Desactivar mi publicación"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl glass-panel p-5 border border-slate-700">
            <h4 className="text-base font-bold text-white mb-2">Reportar contenido</h4>
            <p className="text-xs text-slate-400 mb-4">Indica la razón por la que consideras que esta publicación incumple las normas:</p>

            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 mb-4"
            >
              <option value="Derechos de autor">Infracción de derechos de autor</option>
              <option value="Contenido ofensivo">Contenido ofensivo o discriminatorio</option>
              <option value="Spam">Spam o publicidad</option>
              <option value="Información engañosa">Información académica engañosa</option>
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendReport}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
              >
                Enviar reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
