import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { resolveFileUrl } from '../api/client';

export default function AudioPlayer({ src, title = 'Nota de audio académica' }) {
  const audioSrc = resolveFileUrl(src);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  useEffect(() => {
    setHasPlaybackError(false);
  }, [audioSrc]);

  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/60 shadow-inner">
      <div className="flex items-center gap-1.5 text-xs mb-2 min-w-0">
        <Volume2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{title}</span>
      </div>
      <audio
        src={audioSrc}
        controls
        preload="metadata"
        onError={() => setHasPlaybackError(true)}
        className="w-full h-9"
        aria-label={`Reproducir ${title}`}
      >
        Tu navegador no puede reproducir este archivo de audio.
      </audio>
      {hasPlaybackError && (
        <p role="status" className="text-xs text-rose-600 dark:text-rose-400 mt-2">
          No se pudo cargar el audio. Comprueba tu conexión e inténtalo de nuevo.
        </p>
      )}
    </div>
  );
}
