import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, CheckCircle2 } from 'lucide-react';

export default function AudioRecorder({ onAudioRecorded }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convertir a archivo File para adjuntar al post
        const audioFile = new File([audioBlob], `nota_voz_${Date.now()}.webm`, { type: 'audio/webm' });
        if (onAudioRecorded) {
          onAudioRecorded(audioFile);
        }

        // Detener tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Micrófono no disponible o denegado:', err.message);
      alert('No se pudo acceder al micrófono. Verifica los permisos de tu navegador.');
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
    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-300 flex items-center gap-1.5 text-xs">
          <Mic className="w-4 h-4 text-brand-400" />
          Grabar nota de audio o explicación
        </span>
        {isRecording && (
          <span className="text-xs font-mono font-bold text-rose-400 animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {formatTime(recordingTime)}
          </span>
        )}
      </div>

      {!audioUrl ? (
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-semibold flex items-center gap-2 transition"
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
      ) : (
        <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-800/80 border border-slate-700/80">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Nota grabada ({formatTime(recordingTime)})</span>
          </div>
          <audio src={audioUrl} controls className="h-8 max-w-[180px]" />
          <button
            type="button"
            onClick={clearAudio}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md transition"
            title="Eliminar audio"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
