import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  RotateCcw,
  Check,
  X,
  FlipHorizontal,
  AlertCircle,
  UploadCloud,
  Sparkles
} from 'lucide-react';

export default function CameraCaptureModal({ isOpen, onClose, onPhotoCaptured }) {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (trasera) o 'user' (frontal)
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const videoRef = useRef(null);
  const fileFallbackRef = useRef(null);

  // Iniciar la cámara cuando se abre el modal
  const startCamera = async (mode = facingMode) => {
    setIsInitializing(true);
    setCameraError(null);

    // Detener tracks previos si existían
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta captura directa de cámara mediante WebRTC.');
      }

      // Detectar si hay más de una cámara disponible
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (e) {}

      // Intentar abrir con el facingMode deseado
      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch (errConstraint) {
        // Fallback simple si la restricción de orientación falla
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Error al acceder a la cámara:', err.message);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Permiso de cámara denegado. Permite el acceso a la cámara en la barra de direcciones de tu navegador.'
          : err.name === 'NotFoundError'
          ? 'No se detectó ninguna cámara web o sensor de video en tu dispositivo.'
          : `No se pudo iniciar la cámara: ${err.message}`
      );
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedBlob(null);
      setCapturedPreviewUrl(null);
      startCamera(facingMode);
    } else {
      // Detener stream al cerrar
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (capturedPreviewUrl) {
        URL.revokeObjectURL(capturedPreviewUrl);
      }
    };
  }, [isOpen]);

  // Si cambia el modo de cámara (frontal vs trasera)
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capturar fotograma de video a canvas
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');

    // Si es cámara frontal, aplicar efecto espejo para visualización natural
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Retroalimentación háptica en móvil
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch (e) {}
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const previewUrl = URL.createObjectURL(blob);
          setCapturedPreviewUrl(previewUrl);

          // Pausar stream mientras se revisa
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
          }
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Repetir fotografía
  const handleRetake = () => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    startCamera(facingMode);
  };

  // Confirmar y entregar archivo al componente padre
  const handleConfirm = () => {
    if (!capturedBlob) return;

    const filename = `apunte_camara_${Date.now()}.jpg`;
    const imageFile = new File([capturedBlob], filename, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });

    if (onPhotoCaptured) {
      onPhotoCaptured(imageFile);
    }
    onClose();
  };

  // Manejador del input alternativo de captura nativa móvil
  const handleNativeFallbackChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onPhotoCaptured) {
        onPhotoCaptured(file);
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Tomar Foto con Cámara</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300">
                  PWA Sensor
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Captura apuntes, tableros o esquemas de clase en alta resolución
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Cerrar cámara"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport de Cámara o Vista Previa de Captura */}
        <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {capturedPreviewUrl ? (
            // Vista previa de la foto tomada
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedPreviewUrl}
                alt="Foto capturada"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Foto Capturada</span>
              </div>
            </div>
          ) : cameraError ? (
            // Mensaje de error de cámara amigable
            <div className="p-6 text-center max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Cámara no disponible</h4>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                {cameraError}
              </p>

              {/* Botón de captura nativa móvil fallback */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileFallbackRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Usar selector nativo de cámara</span>
                </button>
                <input
                  ref={fileFallbackRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNativeFallbackChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition"
                >
                  Reintentar acceso
                </button>
              </div>
            </div>
          ) : (
            // Transmisión de video en vivo
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Guía visual de encuadre */}
              <div className="absolute inset-4 sm:inset-8 border border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-white rounded-tl"></div>
                  <div className="w-4 h-4 border-t-2 border-r-2 border-white rounded-tr"></div>
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-white rounded-bl"></div>
                  <div className="w-4 h-4 border-b-2 border-r-2 border-white rounded-br"></div>
                </div>
              </div>

              {/* Botón para alternar cámara frontal / trasera */}
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 transition shadow-lg"
                  title="Cambiar entre cámara frontal y trasera"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              )}

              {/* Badge indicando cámara activa */}
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-white/90 border border-white/20 text-[11px] font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{facingMode === 'environment' ? 'Cámara Principal' : 'Cámara Frontal'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Acciones Inferior */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {capturedPreviewUrl ? (
            // Acciones post-captura
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Repetir foto</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-brand-500/25"
              >
                <Check className="w-4 h-4" />
                <span>Usar en mi publicación</span>
              </button>
            </>
          ) : (
            // Acciones en vivo
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={!stream || isInitializing}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                  stream && !isInitializing
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-brand-500/30 active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Capturar Foto</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
