import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Star,
  Lock,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, resolveFileUrl } from '../api/client';
import { db, saveResourceOffline, deleteResourceOffline, isResourceSavedOffline } from '../db/db';
import AudioPlayer from './AudioPlayer';
import LocationViewModal from './LocationViewModal';
import FileViewerModal from './FileViewerModal';
import GatingUnlockModal from './GatingUnlockModal';

export default function PostCard({ post, onPostUpdated, compact = false }) {
  const { user } = useAuth();
  const [downloadSaved, setDownloadSaved] = useState({});
  const [savingFileId, setSavingFileId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [reportReason, setReportReason] = useState('Derechos de autor');
  const [expandedContent, setExpandedContent] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [localThumbUrl, setLocalThumbUrl] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);

  // Estados de Intercambio Condicionado (Gating) y Valoración Interactiva
  const [showGatingModal, setShowGatingModal] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [dislikesCount, setDislikesCount] = useState(post.dislikes_count || 0);
  const [myReaction, setMyReaction] = useState(post.my_reaction || null);
  const [isReacting, setIsReacting] = useState(false);
  const [authorVoteWarning, setAuthorVoteWarning] = useState(false);

  const isAuthor = user && user.id === post.author?.id;
  const isGated = !user || (user.role !== 'ADMIN' && !isAuthor && (user.contributions_count || 0) === 0);
  const isLongContent = (post.content || '').length > 220;

  // Primer archivo adjunto para el preview visual izquierdo
  const mainAttachment = post.attachments && post.attachments.length > 0 ? post.attachments[0] : null;
  const isTextOnly = !mainAttachment;

  useEffect(() => {
    let isMounted = true;
    isResourceSavedOffline(post.id).then((saved) => {
      if (isMounted) setIsOfflineSaved(saved);
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [post.id]);

  useEffect(() => {
    let isMounted = true;
    let url = null;
    if (mainAttachment) {
      db.offline_resources
        .where('file_id')
        .equals(mainAttachment.id || mainAttachment.storage_key || mainAttachment.original_name)
        .first()
        .then((res) => {
          if (isMounted && res && res.local_blob) {
            const mime = res.local_blob.type || mainAttachment.mime_type || 'image/png';
            const blob = new Blob([res.local_blob], { type: mime });
            url = URL.createObjectURL(blob);
            setLocalThumbUrl(url);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [mainAttachment]);

  const handleReaction = async (reactionType) => {
    if (!user) {
      setShowGatingModal(true);
      return;
    }

    // RN-04: El autor no puede votar su propio recurso
    if (isAuthor) {
      setAuthorVoteWarning(true);
      setTimeout(() => setAuthorVoteWarning(false), 3500);
      if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
      return;
    }

    if (isReacting) return;

    try {
      setIsReacting(true);
      if (navigator.vibrate) navigator.vibrate([30, 20]);

      const prevReaction = myReaction;
      const prevLikes = likesCount;
      const prevDislikes = dislikesCount;

      let nextReaction = reactionType;
      let nextLikes = prevLikes;
      let nextDislikes = prevDislikes;

      if (prevReaction === reactionType) {
        // Retirar voto
        nextReaction = null;
        if (reactionType === 'LIKE') nextLikes = Math.max(0, prevLikes - 1);
        if (reactionType === 'DISLIKE') nextDislikes = Math.max(0, prevDislikes - 1);
      } else {
        // Registrar o cambiar voto (RN-05)
        if (reactionType === 'LIKE') {
          nextLikes = prevLikes + 1;
          if (prevReaction === 'DISLIKE') nextDislikes = Math.max(0, prevDislikes - 1);
        } else {
          nextDislikes = prevDislikes + 1;
          if (prevReaction === 'LIKE') nextLikes = Math.max(0, prevLikes - 1);
        }
      }

      setMyReaction(nextReaction);
      setLikesCount(nextLikes);
      setDislikesCount(nextDislikes);

      const targetAction = nextReaction ? reactionType : 'NONE';
      await api.reactToPost(post.id, targetAction);
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      console.warn('Error registrando reacción:', err);
      setMyReaction(post.my_reaction || null);
      setLikesCount(post.likes_count || 0);
      setDislikesCount(post.dislikes_count || 0);
    } finally {
      setIsReacting(false);
    }
  };

  const handleToggleOfflineReady = async (e) => {
    e.stopPropagation();
    if (isGated) {
      setShowGatingModal(true);
      return;
    }
    if (!mainAttachment) return;
    try {
      setSavingFileId(mainAttachment.id);
      if (isOfflineSaved) {
        await deleteResourceOffline(post.id);
        setIsOfflineSaved(false);
      } else {
        let blob;
        const mainUrl = resolveFileUrl(mainAttachment.url);
        if (mainUrl) {
          const response = await fetch(mainUrl);
          if (response.ok) {
            blob = await response.blob();
          }
        }
        if (blob) {
          await saveResourceOffline(
            post.id,
            mainAttachment.id || mainAttachment.storage_key || mainAttachment.original_name,
            mainAttachment.original_name,
            blob,
            user?.id || 'guest'
          );
          setIsOfflineSaved(true);
        }
      }
    } catch (err) {
      console.warn('Error alternando disponibilidad offline:', err);
    } finally {
      setSavingFileId(null);
    }
  };

  const handleSaveOffline = async (file) => {
    if (isGated) {
      setShowGatingModal(true);
      return;
    }
    try {
      setSavingFileId(file.id);
      let blob;
      const downloadTargetUrl = resolveFileUrl(file.url);
      if (downloadTargetUrl) {
        const response = await fetch(downloadTargetUrl);
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
    <article className={`rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 ${compact ? 'p-3' : 'p-5 sm:p-6'} hover:shadow-md transition-all duration-200 shadow-2xs relative`}>
      
      {/* Contenedor Horizontal Principal (Matches Reference Image) */}
      <div className={`flex items-start ${compact ? 'flex-row gap-3' : 'flex-col sm:flex-row gap-5'}`}>
        
        {/* Left Side: Thumbnail Preview Box (Click to View in PWA) */}
        <button
          type="button"
          onClick={() => mainAttachment ? setViewingFile(mainAttachment) : setShowTextModal(true)}
          className={`${compact ? 'w-[72px] h-[72px]' : 'w-full sm:w-44 h-40 sm:h-36'} rounded-2xl overflow-hidden shrink-0 shadow-md relative group flex items-center justify-center bg-indigo-900`}
          title={mainAttachment ? 'Clic para ver en la app' : 'Clic para leer el texto completo'}
          aria-label={mainAttachment ? `Ver archivo de ${post.title}` : `Leer publicación ${post.title}`}
        >
          {!mainAttachment ? (
            <div className="w-full h-full bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] flex flex-col items-center justify-center p-2 text-center text-white">
              <FileText className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-indigo-200 mb-1`} />
              <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                Texto
              </span>
            </div>
          ) : mainAttachment.file_type === 'IMAGE' || mainAttachment.mime_type?.startsWith('image/') ? (
            !imgError ? (
              <img
                src={localThumbUrl || mainAttachment.url}
                alt={post.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] flex flex-col items-center justify-center p-3 text-center text-white">
                <ImageIcon className="w-8 h-8 text-indigo-300 mb-1" />
                <span className="text-[11px] font-bold text-white line-clamp-2 px-1">
                  {post.title}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full mt-1">
                  Diagrama / Imagen
                </span>
              </div>
            )
          ) : mainAttachment.file_type === 'AUDIO' || mainAttachment.mime_type?.startsWith('audio/') ? (
            <div className="w-full h-full bg-gradient-to-br from-[#2a1b70] via-[#4f37b8] to-[#6d44d4] flex flex-col items-center justify-center p-3 text-center text-white">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-2">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                Audio
              </span>
            </div>
          ) : (
            /* Miniatura vectorial PDF de alta estética con ondas SVG y centrado geométrico perfecto */
            <div className="w-full h-full bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] flex flex-col items-center justify-center p-3 text-center text-white relative overflow-hidden select-none">
              {/* Ondas vectoriales fluidas en fondo */}
              <svg
                className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path d="M0,60 C30,40 60,80 100,55 L100,100 L0,100 Z" fill="#6366f1" />
                <path d="M0,75 C40,65 70,85 100,70 L100,100 L0,100 Z" fill="#4338ca" />
              </svg>

              {/* Icono de documento PDF centrado con badge */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="w-13 h-13 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-lg shadow-black/20 mb-1.5 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full border border-white/20 shadow-xs">
                  PDF
                </span>
              </div>
            </div>
          )}

          {/* Hover Overlay: Ver en la App */}
          {(mainAttachment || isTextOnly) && (
            <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-xs p-2 text-center">
              <Eye className="w-5 h-5 text-white" />
              <span>{mainAttachment ? 'Ver en la App' : 'Leer texto completo'}</span>
            </div>
          )}
        </button>

        {/* Right Side: Post Details & Controls */}
        <div className={`flex-1 min-w-0 space-y-2 ${compact ? '' : 'w-full'}`}>
          
          {/* Header Row: Subject Badge */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
              {post.category?.name || 'Facultad de Ingeniería'}
            </span>
          </div>

          {/* Title */}
          <h3 className={`${compact ? 'text-sm' : 'text-base sm:text-lg'} font-black text-slate-900 dark:text-white tracking-tight leading-snug`}>
            {post.title}
          </h3>

          {/* Excerpt Description */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTextModal(true)}
              className="w-full text-left"
              aria-label={`Leer contenido completo de ${post.title}`}
            >
              <p className={`${compact ? 'text-[11px]' : 'text-xs sm:text-sm'} text-slate-600 dark:text-slate-300 leading-relaxed ${
                isLongContent && !expandedContent ? 'line-clamp-2' : ''
              }`}>
                {post.content}
              </p>
            </button>
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

          {/* Fila de Calificación Académica Interactiva (Estrellas 1-5 y Votos Útil/No Útil) */}
          <div className={`pt-2 flex flex-wrap items-center justify-between ${compact ? 'gap-1.5' : 'gap-2.5'} text-xs`}>
            <div className={`flex items-center flex-wrap ${compact ? 'gap-1' : 'gap-2'}`}>
              {/* Estrellas 1 a 5 */}
              <div className={`flex items-center ${compact ? 'gap-0.5 px-1.5' : 'gap-1 px-2.5'} py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60`}>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starNum) => {
                    const avg = post.average_rating || 5.0;
                    const isFilled = starNum <= Math.round(avg);
                    return (
                      <button
                        key={starNum}
                        type="button"
                        onClick={() => handleReaction(starNum >= 3 ? 'LIKE' : 'DISLIKE')}
                        className={`${compact ? 'p-0' : 'p-0.5'} text-amber-400 hover:scale-125 transition-transform cursor-pointer`}
                        title={`Calificar con ${starNum} estrellas (RN-04/05)`}
                      >
                        <Star className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${isFilled ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                      </button>
                    );
                  })}
                </div>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[10px] ml-0.5">
                  {(post.average_rating || 5.0).toFixed(1)}
                </span>
                <span className="text-[9px] text-slate-400">
                  ({post.ratings_count || (likesCount + dislikesCount)})
                </span>
              </div>

              {/* Botón Útil (Like) */}
              <button
                type="button"
                onClick={() => handleReaction('LIKE')}
                disabled={isReacting}
                className={`${compact ? 'px-2 py-1 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5'} rounded-xl border font-bold flex items-center transition active:scale-95 cursor-pointer ${
                  myReaction === 'LIKE'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
                }`}
                title="Marcar como apunte útil o relevante"
              >
                <ThumbsUp className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${myReaction === 'LIKE' ? 'fill-emerald-500 text-emerald-500' : ''}`} />
                <span>{likesCount}</span>
              </button>

              {/* Botón No Relevante (Dislike) */}
              <button
                type="button"
                onClick={() => handleReaction('DISLIKE')}
                disabled={isReacting}
                className={`${compact ? 'px-2 py-1 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5'} rounded-xl border font-bold flex items-center transition active:scale-95 cursor-pointer ${
                  myReaction === 'DISLIKE'
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-300'
                }`}
                title="Marcar como no relevante o mejorable"
              >
                <ThumbsDown className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${myReaction === 'DISLIKE' ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{dislikesCount}</span>
              </button>
            </div>

            {/* Aviso RN-04 si el autor intenta votar su propio post */}
            {authorVoteWarning && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-fadeIn">
                ⚠️ RN-04: No puedes calificar tu propia publicación
              </span>
            )}
          </div>

          {/* Footer Row: Author + Time + PDF Size + Download Button + Menu */}
          <div className={`border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between ${compact ? 'pt-2 gap-2' : 'pt-3 gap-3'} text-xs`}>
            
            {/* Author + Time + File Size Badge */}
            <div className={`flex items-center flex-wrap min-w-0 ${compact ? 'gap-x-1.5 gap-y-1' : 'gap-2.5'}`}>
              <div className={`${compact ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs'} rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 shadow-2xs`}>
                {post.author?.full_name ? post.author.full_name.charAt(0) : 'W'}
              </div>
              <span className={`text-slate-900 dark:text-white font-extrabold truncate ${compact ? 'max-w-[100px] text-[10px]' : ''}`}>
                {post.author?.full_name || 'Walter Alfonso'}
              </span>

              <div className={`flex items-center ${compact ? 'gap-1 text-[10px]' : 'gap-1.5 text-xs'} text-slate-400`}>
                <Clock className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-400 shrink-0`} />
                <span>{formatRelativeTime(post.created_at)}</span>
              </div>

              {/* Pill: Dinámico según archivo adjunto */}
              {mainAttachment && (
                <span className={`${compact ? 'hidden' : ''} px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] border border-slate-200/60 dark:border-slate-700`}>
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
            <div className={`flex items-center shrink-0 ${compact ? 'gap-0.5' : 'gap-2'}`}>
              
              {/* Botón Ver en la App */}
              {mainAttachment && (
                <button
                  type="button"
                  onClick={() => setViewingFile(mainAttachment)}
                  className={`${compact ? 'p-1.5' : 'px-3 py-1.5'} rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center ${compact ? '' : 'gap-1.5'} transition shadow-2xs`}
                  title="Abrir y leer directamente en la aplicación"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className={compact ? 'sr-only' : ''}>Ver</span>
                </button>
              )}

              {/* Casilla interactiva: Guardar para ver sin conexión (Ahorro de almacenamiento) */}
              {mainAttachment && (
                <button
                  type="button"
                  onClick={handleToggleOfflineReady}
                  disabled={savingFileId === mainAttachment.id}
                  className={`${compact ? 'p-1.5' : 'px-2.5 py-1.5'} rounded-xl border font-bold text-xs flex items-center ${compact ? 'gap-1' : 'gap-1.5'} transition shadow-2xs select-none ${
                    isOfflineSaved
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                  title={
                    isOfflineSaved
                      ? 'Archivo disponible sin conexión en tu dispositivo. Clic para desmarcar y liberar espacio.'
                      : 'Guardar este archivo en tu equipo para consultarlo sin internet.'
                  }
                >
                  <span className={`w-2 h-2 rounded-full ${isOfflineSaved ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span className={compact ? 'sr-only' : ''}>{isOfflineSaved ? '✓ Offline' : 'Ver sin conexión'}</span>
                </button>
              )}

              {/* Botón Descargar y Guardar en PWA */}
              <button
                type="button"
                onClick={() => {
                  if (isGated) {
                    setShowGatingModal(true);
                    return;
                  }
                  if (mainAttachment) handleSaveOffline(mainAttachment);
                  else alert(`Descargando copia del recurso "${post.title}"`);
                }}
                disabled={mainAttachment && savingFileId === mainAttachment.id}
                className={`${compact ? 'p-1.5' : 'px-3.5 py-1.5'} rounded-xl border font-bold text-xs flex items-center ${compact ? '' : 'gap-1.5'} transition shadow-2xs ${
                  isGated
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100/70'
                    : 'border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                }`}
                title={isGated ? 'Comparte al menos 1 apunte para desbloquear descargas' : 'Guardar en el almacenamiento del navegador (PWA) y descargar copia física'}
              >
                {isGated ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className={compact ? 'sr-only' : ''}>Bloqueado</span>
                  </>
                ) : mainAttachment && downloadSaved[mainAttachment.id] ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className={`${compact ? 'sr-only' : ''} text-emerald-600 font-bold`}>Guardado</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className={compact ? 'sr-only' : ''}>{mainAttachment && savingFileId === mainAttachment.id ? 'Guardando...' : 'Descargar'}</span>
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

      {showTextModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
          onClick={() => setShowTextModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`post-text-title-${post.id}`}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 id={`post-text-title-${post.id}`} className="text-base font-black text-slate-900 dark:text-white">
                  {post.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {post.author?.full_name || 'Walter Alfonso'} · {formatRelativeTime(post.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTextModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Cerrar texto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <p className="text-sm leading-7 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {post.content}
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de Desbloqueo Condicionado (Gating) */}
      <GatingUnlockModal
        isOpen={showGatingModal}
        onClose={() => setShowGatingModal(false)}
        resourceTitle={post.title}
      />
    </article>
  );
}
