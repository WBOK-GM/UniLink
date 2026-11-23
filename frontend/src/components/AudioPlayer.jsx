import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, Music, AlertCircle } from 'lucide-react';
import { resolveFileUrl } from '../api/client';

export default function AudioPlayer({ src, title = 'Nota de audio académica' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const resolvedSrc = resolveFileUrl(src);

  const togglePlay = () => {
    if (!audioRef.current) return;
    setError(null);
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        setError('No se pudo reproducir este audio. Verifica tu conexión o el formato del archivo.');
        setIsPlaying(false);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration || 1;
    setProgress((current / total) * 100);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/60 shadow-inner">
      <audio
        ref={audioRef}
        src={resolvedSrc}
        preload="metadata"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => setError('No se pudo cargar el audio. Puede que ya no esté disponible.')}
      />
      
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-600/30 transition-transform active:scale-95"
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            {title}
          </span>
          <span className="text-[11px] text-slate-500">Audio adjunto</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-brand-500 h-full rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}
