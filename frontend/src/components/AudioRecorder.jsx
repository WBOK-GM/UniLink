import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AudioRecorder({ onAudioRecorded }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [micError, setMicError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sin soporte de API de audio.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioMimeType = recorder.mimeType || audioChunksRef.current[0]?.type || 'audio/webm';
        const audioType = audioMimeType.split(';')[0];
        const extension = audioType === 'audio/mp4' || audioType === 'audio/x-m4a'
          ? 'm4a'
          : audioType === 'audio/ogg'
          ? 'ogg'
          : audioType === 'audio/wav'
          ? 'wav'
          : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: audioMimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convertir a archivo File para adjuntar al post
        const audioFile = new File([audioBlob], `nota_voz_${Date.now()}.${extension}`, { type: audioMimeType });
        if (onAudioRecorded) {
          onAudioRecorded(audioFile);
        }

        // Detener tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Retroalimentación háptica leve
      if ('vibrate' in navigator) {
        try { navigator.vibrate(40); } catch (e) {}
      }

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Micrófono no disponible o denegado:', err.message);
      setMicError(
        err.name === 'NotAllowedError'
          ? 'Permiso de micrófono bloqueado en tu navegador. Actívalo en la configuración del sitio.'
          : 'No se detectó ningún micrófono conectado en tu equipo.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const clearAudio = () => {
    setAudioUrl(null);
    setRecordingTime(0);
    if (onAudioRecorded) onAudioRecorded(null);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
          <Mic className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          Grabar nota de audio o explicación
        </span>
        {isRecording && (
          <span className="text-xs font-mono font-bold text-rose-500 animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {formatTime(recordingTime)}
          </span>
        )}
      </div>

      {!audioUrl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="px-3.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-600/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-600/30 border border-rose-200 dark:border-rose-500/30 text-xs font-semibold flex items-center gap-2 transition"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Iniciar Grabación</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 text-xs font-semibold flex items-center gap-2 transition animate-pulse"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Detener ({formatTime(recordingTime)})</span>
              </button>
            )}
            <span className="text-[11px] text-slate-500">Útil para dudas rápidas o explicaciones habladas.</span>
          </div>

          {micError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{micError}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Nota grabada ({formatTime(recordingTime)})</span>
          </div>
          <audio src={audioUrl} controls className="h-8 max-w-[180px]" />
          <button
            type="button"
            onClick={clearAudio}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition"
            title="Eliminar audio"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
